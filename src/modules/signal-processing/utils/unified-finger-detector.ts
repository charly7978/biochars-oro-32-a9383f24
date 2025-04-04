
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Servicio centralizado de detección de dedos que combina múltiples métodos
 * para proporcionar una detección más fiable y adaptativa.
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';

interface FingerDetectionSource {
  id: string;
  isFingerDetected: boolean;
  confidence: number;
  timestamp: number;
}

interface DetectionResult {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<string, FingerDetectionSource>;
  consensus: number;
}

// Configuración para histéresis y consenso
interface FingerDetectorConfig {
  // Cantidad mínima de fuentes que deben detectar dedo para confirmar
  requiredConsensusCount: number;
  // Mínimo nivel de confianza para considerar una detección válida
  minConfidenceThreshold: number;
  // Periodo de gracia (ms) para mantener detección tras pérdida de señal
  gracePeriodMs: number;
  // Cantidad de detecciones consecutivas para confirmar
  confirmationThreshold: number;
  // Cantidad de no-detecciones consecutivas para desconfirmar
  lossThreshold: number;
}

/**
 * Detector unificado que implementa consenso entre múltiples fuentes
 * y aplica histéresis para estabilizar la detección
 */
class UnifiedFingerDetector {
  // Fuentes de detección registradas
  private sources: Record<string, FingerDetectionSource> = {};
  
  // Estado de detección actual
  private isFingerDetectedState: boolean = false;
  private confirmedDetection: boolean = false;
  
  // Contadores para histéresis
  private consecutiveDetections: number = 0;
  private consecutiveLosses: number = 0;
  private lastConfirmedTime: number = 0;
  
  // Buffer para suavizar cambios rápidos
  private detectionBuffer: boolean[] = [];
  private BUFFER_SIZE = 5;
  
  // Configuración predeterminada
  private config: FingerDetectorConfig = {
    requiredConsensusCount: 1,      // Inicialmente solo requerimos una fuente
    minConfidenceThreshold: 0.6,    // Umbral de confianza mínimo
    gracePeriodMs: 2000,            // 2 segundos de gracia
    confirmationThreshold: 5,       // 5 detecciones consecutivas para confirmar
    lossThreshold: 8                // 8 pérdidas consecutivas para desconfirmar
  };
  
  constructor(config?: Partial<FingerDetectorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    logError(
      "UnifiedFingerDetector: Inicializado con configuración: " + JSON.stringify(this.config),
      ErrorLevel.INFO,
      "FingerDetector"
    );
  }
  
  /**
   * Registra una nueva fuente de detección o actualiza una existente
   */
  public updateSource(
    sourceId: string, 
    isFingerDetected: boolean, 
    confidence: number = 1.0
  ): DetectionResult {
    const now = Date.now();
    
    // Actualizar o crear fuente
    this.sources[sourceId] = {
      id: sourceId,
      isFingerDetected,
      confidence,
      timestamp: now
    };
    
    // Limpiar fuentes antiguas (más de 5 segundos)
    this.cleanupSources(now);
    
    // Aplicar algoritmo de consenso
    const result = this.applyConsensusDetection();
    
    // Aplicar histéresis para evitar cambios rápidos de estado
    this.applyHysteresis(result.isFingerDetected);
    
    // Añadir al buffer para suavizado
    this.addToDetectionBuffer(this.isFingerDetectedState);
    
    // El estado final puede incluir el periodo de gracia
    const finalState = this.applyGracePeriod(now);
    
    // Logging detallado si hay cambio de estado
    if (finalState !== this.confirmedDetection) {
      this.confirmedDetection = finalState;
      
      const sourcesInfo = Object.values(this.sources).map(s => 
        `${s.id}:${s.isFingerDetected ? 'Y' : 'N'}:${s.confidence.toFixed(2)}`
      ).join(', ');
      
      logError(
        `UnifiedFingerDetector: Cambio de estado a ${finalState ? 'DETECTADO' : 'NO DETECTADO'} - ` + 
        `Fuentes [${sourcesInfo}], Consenso: ${result.consensus.toFixed(2)}, ` +
        `Detecciones consecutivas: ${this.consecutiveDetections}, Pérdidas: ${this.consecutiveLosses}`,
        finalState ? ErrorLevel.INFO : ErrorLevel.WARNING,
        "FingerDetector"
      );
    }
    
    return {
      isFingerDetected: finalState,
      confidence: result.consensus,
      sources: { ...this.sources },
      consensus: result.consensus
    };
  }
  
  /**
   * Limpia fuentes antiguas para evitar usar información obsoleta
   */
  private cleanupSources(now: number): void {
    const MAX_SOURCE_AGE_MS = 5000; // 5 segundos
    
    // Eliminar fuentes que no se han actualizado en los últimos 5 segundos
    Object.entries(this.sources).forEach(([id, source]) => {
      if (now - source.timestamp > MAX_SOURCE_AGE_MS) {
        delete this.sources[id];
      }
    });
  }
  
  /**
   * Aplica algoritmo de consenso entre todas las fuentes
   */
  private applyConsensusDetection(): { isFingerDetected: boolean, consensus: number } {
    const sources = Object.values(this.sources);
    
    if (sources.length === 0) {
      return { isFingerDetected: false, consensus: 0 };
    }
    
    // Calcular media ponderada por confianza
    let totalWeight = 0;
    let weightedSum = 0;
    
    sources.forEach(source => {
      // Solo considerar fuentes con confianza mínima
      if (source.confidence >= this.config.minConfidenceThreshold) {
        totalWeight += source.confidence;
        weightedSum += source.isFingerDetected ? source.confidence : 0;
      }
    });
    
    // Si no hay fuentes válidas, no hay detección
    if (totalWeight === 0) {
      return { isFingerDetected: false, consensus: 0 };
    }
    
    // Calcular consenso como porcentaje ponderado
    const consensus = weightedSum / totalWeight;
    
    // Contar fuentes que detectan dedo con confianza suficiente
    const detectingSources = sources.filter(
      s => s.isFingerDetected && s.confidence >= this.config.minConfidenceThreshold
    ).length;
    
    // Determinar estado basado en umbral de consenso y cantidad mínima de fuentes
    const isFingerDetected = 
      consensus >= 0.5 && detectingSources >= this.config.requiredConsensusCount;
    
    return { isFingerDetected, consensus };
  }
  
  /**
   * Aplica histéresis para evitar cambios de estado frecuentes
   */
  private applyHysteresis(currentDetection: boolean): void {
    if (currentDetection) {
      // Incrementar contador de detecciones consecutivas
      this.consecutiveDetections++;
      this.consecutiveLosses = 0;
      
      // Si alcanzamos el umbral de confirmación, activar detección
      if (this.consecutiveDetections >= this.config.confirmationThreshold && !this.isFingerDetectedState) {
        this.isFingerDetectedState = true;
        this.lastConfirmedTime = Date.now();
      }
    } else {
      // Incrementar contador de pérdidas consecutivas
      this.consecutiveLosses++;
      this.consecutiveDetections = 0;
      
      // Solo desactivar después de suficientes pérdidas consecutivas
      if (this.consecutiveLosses >= this.config.lossThreshold && this.isFingerDetectedState) {
        this.isFingerDetectedState = false;
      }
    }
  }
  
  /**
   * Añade detección actual al buffer de suavizado
   */
  private addToDetectionBuffer(detection: boolean): void {
    this.detectionBuffer.push(detection);
    
    if (this.detectionBuffer.length > this.BUFFER_SIZE) {
      this.detectionBuffer.shift();
    }
  }
  
  /**
   * Aplica periodo de gracia para mantener la detección temporalmente
   */
  private applyGracePeriod(now: number): boolean {
    // Si ya estamos detectando, mantener ese estado
    if (this.isFingerDetectedState) {
      this.lastConfirmedTime = now;
      return true;
    }
    
    // Si estamos dentro del periodo de gracia desde la última detección, mantener estado anterior
    const withinGracePeriod = (now - this.lastConfirmedTime) < this.config.gracePeriodMs;
    
    // Contar positivos en el buffer para decisión final
    const bufferPositives = this.detectionBuffer.filter(d => d).length;
    const bufferRatio = bufferPositives / Math.max(1, this.detectionBuffer.length);
    
    // Si más de la mitad del buffer es positivo, o estamos en periodo de gracia, mantener detección
    return withinGracePeriod || bufferRatio > 0.5;
  }
  
  /**
   * Configura los parámetros del detector
   */
  public configure(config: Partial<FingerDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    logError(
      "UnifiedFingerDetector: Configuración actualizada: " + JSON.stringify(this.config),
      ErrorLevel.INFO,
      "FingerDetector"
    );
  }
  
  /**
   * Restablece el estado del detector
   */
  public reset(): void {
    this.sources = {};
    this.isFingerDetectedState = false;
    this.confirmedDetection = false;
    this.consecutiveDetections = 0;
    this.consecutiveLosses = 0;
    this.lastConfirmedTime = 0;
    this.detectionBuffer = [];
    
    logError("UnifiedFingerDetector: Estado restablecido", ErrorLevel.INFO, "FingerDetector");
  }
  
  /**
   * Obtiene el estado actual de detección
   */
  public getDetectionState(): DetectionResult {
    const consensus = this.applyConsensusDetection();
    return {
      isFingerDetected: this.confirmedDetection,
      confidence: consensus.consensus,
      sources: { ...this.sources },
      consensus: consensus.consensus
    };
  }
  
  /**
   * Adapta los umbrales basándose en condiciones ambientales
   */
  public adaptThresholds(signalQuality: number, ambientBrightness?: number): void {
    // Ajustar umbral de confirmación basado en calidad de señal
    if (signalQuality < 30) {
      // Con señal débil, requerir más confirmaciones para evitar falsos positivos
      this.config.confirmationThreshold = 8;
      this.config.lossThreshold = 5; // Pero ser más rápido en pérdida
    } else if (signalQuality > 70) {
      // Con buena señal, ser más rápido en confirmación
      this.config.confirmationThreshold = 3;
      this.config.lossThreshold = 10; // Y más tolerante a pérdidas temporales
    } else {
      // Valores intermedios para calidad media
      this.config.confirmationThreshold = 5;
      this.config.lossThreshold = 8;
    }
    
    // Si tenemos información de brillo ambiental, ajustar umbral de confianza
    if (ambientBrightness !== undefined) {
      if (ambientBrightness < 50) { // Ambiente oscuro
        this.config.minConfidenceThreshold = 0.5; // Más permisivo
      } else if (ambientBrightness > 200) { // Ambiente muy brillante
        this.config.minConfidenceThreshold = 0.7; // Más estricto
      } else {
        this.config.minConfidenceThreshold = 0.6; // Valor predeterminado
      }
    }
  }
}

// Singleton para uso global
const unifiedFingerDetector = new UnifiedFingerDetector();

export { unifiedFingerDetector, UnifiedFingerDetector, type FingerDetectorConfig, type DetectionResult };
