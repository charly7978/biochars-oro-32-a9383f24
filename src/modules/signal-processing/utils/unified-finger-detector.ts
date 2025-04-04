
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector unificado de presencia de dedo
 * Implementa detección por consenso usando múltiples fuentes de información
 */

// Fuentes posibles de detección
type DetectionSource = 
  | 'rhythm-pattern'      // Detección por patrones rítmicos
  | 'signal-quality-pattern' // Detección por calidad de señal basada en patrones
  | 'signal-quality-amplitude' // Detección por amplitud de señal
  | 'signal-quality-state' // Estado de la detección de calidad
  | 'ppg-extractor'      // Detección del extractor PPG
  | 'camera-analysis'    // Análisis de la cámara
  | 'weak-signal-result' // Resultado de la detección de señal débil
  | 'manual-override';   // Anulación manual (para pruebas)

// Estado de una fuente de detección
interface SourceState {
  isFingerDetected: boolean;
  confidence: number;        // 0-1, qué tan confiable es la detección
  lastUpdated: number;       // timestamp de la última actualización
  consecutiveDetections: number; // detecciones consecutivas (para histéresis)
  consecutiveNonDetections: number; // no-detecciones consecutivas (para histéresis)
}

// Estado global del detector
interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<DetectionSource, SourceState>;
  historyBuffer: Array<{
    timestamp: number;
    isFingerDetected: boolean;
    confidence: number;
  }>;
  overallConsensus: number; // -1 a 1, donde 1 es consenso total positivo, -1 consenso total negativo
}

// Constantes para la lógica de detección
const CONFIDENCE_THRESHOLD = 0.7;       // Umbral mínimo de confianza
const CONSENSUS_THRESHOLD = 0.5;        // Umbral para consenso positivo
const HISTORY_SIZE = 20;                // Tamaño del historial para estabilidad
const SOURCE_EXPIRATION_MS = 5000;      // Tiempo tras el cual una fuente se considera expirada
const HYSTERESIS_POSITIVE_COUNT = 3;    // Cuenta requerida para cambiar a detección positiva
const HYSTERESIS_NEGATIVE_COUNT = 5;    // Cuenta requerida para cambiar a detección negativa

/**
 * Sistema de detección unificado que combina múltiples fuentes
 * para una detección más robusta y confiable
 */
class UnifiedFingerDetector {
  private state: DetectionState;
  private debug: boolean = true;
  
  constructor() {
    // Inicializar estado
    this.state = {
      isFingerDetected: false,
      confidence: 0,
      sources: {
        'rhythm-pattern': this.createInitialSourceState(),
        'signal-quality-pattern': this.createInitialSourceState(),
        'signal-quality-amplitude': this.createInitialSourceState(),
        'signal-quality-state': this.createInitialSourceState(),
        'ppg-extractor': this.createInitialSourceState(),
        'camera-analysis': this.createInitialSourceState(),
        'weak-signal-result': this.createInitialSourceState(),
        'manual-override': this.createInitialSourceState()
      },
      historyBuffer: [],
      overallConsensus: 0
    };
    
    console.log("UnifiedFingerDetector: Sistema de detección unificado inicializado");
  }
  
  /**
   * Crea un estado inicial para una fuente de detección
   */
  private createInitialSourceState(): SourceState {
    return {
      isFingerDetected: false,
      confidence: 0,
      lastUpdated: 0,
      consecutiveDetections: 0,
      consecutiveNonDetections: 0
    };
  }
  
  /**
   * Actualiza la información de una fuente de detección
   * @param source Nombre de la fuente
   * @param isFingerDetected Si detectó un dedo
   * @param confidence Nivel de confianza (0-1)
   */
  public updateSource(
    source: DetectionSource,
    isFingerDetected: boolean,
    confidence: number = 0.5
  ): void {
    if (!this.state.sources[source]) {
      console.error(`UnifiedFingerDetector: Fuente desconocida: ${source}`);
      return;
    }
    
    const sourceState = this.state.sources[source];
    const now = Date.now();
    
    // Actualizar contador de detecciones consecutivas para histéresis
    if (isFingerDetected) {
      sourceState.consecutiveDetections++;
      sourceState.consecutiveNonDetections = 0;
    } else {
      sourceState.consecutiveNonDetections++;
      sourceState.consecutiveDetections = 0;
    }
    
    // Actualizar estado de la fuente
    sourceState.isFingerDetected = isFingerDetected;
    sourceState.confidence = confidence;
    sourceState.lastUpdated = now;
    
    // Recalcular el estado global
    this.recalculateDetectionState();
    
    // Debug log
    if (this.debug) {
      console.log(`UnifiedFingerDetector [${source}]: ${isFingerDetected ? 'DEDO DETECTADO' : 'NO DETECTADO'} (confianza: ${confidence.toFixed(2)})`);
    }
  }
  
  /**
   * Elimina fuentes de detección expiradas del cálculo
   */
  private removeExpiredSources(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    Object.entries(this.state.sources).forEach(([sourceName, sourceState]) => {
      // La fuente de anulación manual nunca expira
      if (sourceName === 'manual-override') return;
      
      if (sourceState.lastUpdated > 0 && now - sourceState.lastUpdated > SOURCE_EXPIRATION_MS) {
        // Marcar como expirada reduciendo su confianza
        sourceState.confidence = Math.max(0, sourceState.confidence - 0.5);
        expiredCount++;
        
        if (this.debug) {
          console.log(`UnifiedFingerDetector: Fuente expirada: ${sourceName} (${now - sourceState.lastUpdated}ms)`);
        }
      }
    });
    
    if (expiredCount > 0 && this.debug) {
      console.log(`UnifiedFingerDetector: ${expiredCount} fuentes expiradas`);
    }
  }
  
  /**
   * Recalcula el estado global de detección basado en todas las fuentes
   * Implementa lógica de consenso y histéresis para estabilidad
   */
  private recalculateDetectionState(): void {
    // Eliminar fuentes expiradas
    this.removeExpiredSources();
    
    // Verificar anulación manual
    const manualOverride = this.state.sources['manual-override'];
    if (manualOverride.lastUpdated > 0 && manualOverride.confidence > 0.9) {
      this.state.isFingerDetected = manualOverride.isFingerDetected;
      this.state.confidence = manualOverride.confidence;
      return;
    }
    
    // Calcular peso total y consenso ponderado
    let totalWeight = 0;
    let weightedConsensus = 0;
    
    Object.entries(this.state.sources).forEach(([sourceName, sourceState]) => {
      // Saltarse fuentes sin actualizar
      if (sourceState.lastUpdated === 0) return;
      
      // Obtener peso basado en confianza y actualidad
      const timeFactor = Math.max(0, 1 - (Date.now() - sourceState.lastUpdated) / SOURCE_EXPIRATION_MS);
      const weight = sourceState.confidence * timeFactor;
      
      // Acumular
      totalWeight += weight;
      weightedConsensus += weight * (sourceState.isFingerDetected ? 1 : -1);
    });
    
    // Calcular consenso normalizado (-1 a 1)
    const normalizedConsensus = totalWeight > 0 
      ? weightedConsensus / totalWeight 
      : 0;
    
    // Estabilidad por historial
    this.state.historyBuffer.push({
      timestamp: Date.now(),
      isFingerDetected: normalizedConsensus > CONSENSUS_THRESHOLD,
      confidence: Math.abs(normalizedConsensus)
    });
    
    // Mantener historial limitado
    if (this.state.historyBuffer.length > HISTORY_SIZE) {
      this.state.historyBuffer.shift();
    }
    
    // Consenso promedio del historial
    const recentConsensus = this.calculateHistoricalConsensus();
    
    // Aplicar histéresis para evitar cambios rápidos
    let newDetectionState: boolean;
    
    if (this.state.isFingerDetected) {
      // Ya tenemos detección, requerir consenso negativo fuerte para cambiar
      newDetectionState = recentConsensus > -CONSENSUS_THRESHOLD;
    } else {
      // No tenemos detección, requerir consenso positivo fuerte para cambiar
      newDetectionState = recentConsensus > CONSENSUS_THRESHOLD;
    }
    
    // Actualizar estado global
    this.state.isFingerDetected = newDetectionState;
    this.state.confidence = Math.abs(recentConsensus);
    this.state.overallConsensus = recentConsensus;
    
    // Debug logs detallados
    if (this.debug) {
      console.log(`UnifiedFingerDetector: Consenso=${recentConsensus.toFixed(2)}, Detección=${newDetectionState}, Confianza=${this.state.confidence.toFixed(2)}`);
    }
  }
  
  /**
   * Calcula el consenso basado en el historial reciente
   * para mayor estabilidad
   */
  private calculateHistoricalConsensus(): number {
    if (this.state.historyBuffer.length === 0) return 0;
    
    // Dar más peso a entradas recientes
    let weightedSum = 0;
    let totalWeight = 0;
    
    this.state.historyBuffer.forEach((entry, index) => {
      // Peso exponencial - entradas más recientes tienen más influencia
      const weight = Math.exp(index / 5);
      weightedSum += weight * (entry.isFingerDetected ? entry.confidence : -entry.confidence);
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  /**
   * Obtiene el estado actual de detección
   */
  public getDetectionState(): {
    isFingerDetected: boolean;
    confidence: number;
    consensusLevel: number;
  } {
    return {
      isFingerDetected: this.state.isFingerDetected,
      confidence: this.state.confidence,
      consensusLevel: this.state.overallConsensus
    };
  }
  
  /**
   * Obtiene estadísticas detalladas del detector
   * Para diagnósticos avanzados
   */
  public getDetailedStats(): {
    sources: Record<string, SourceState>;
    history: typeof this.state.historyBuffer;
    consensusLevel: number;
    detectionResult: boolean;
    confidence: number;
  } {
    return {
      sources: {...this.state.sources},
      history: [...this.state.historyBuffer],
      consensusLevel: this.state.overallConsensus,
      detectionResult: this.state.isFingerDetected,
      confidence: this.state.confidence
    };
  }
  
  /**
   * Establece una anulación manual (para pruebas)
   */
  public setManualOverride(isFingerDetected: boolean, enabled: boolean = true): void {
    this.updateSource(
      'manual-override',
      isFingerDetected,
      enabled ? 1.0 : 0.0
    );
    
    console.log(`UnifiedFingerDetector: Anulación manual ${enabled ? 'activada' : 'desactivada'}, valor=${isFingerDetected}`);
  }
  
  /**
   * Habilita o deshabilita los logs de depuración
   */
  public setDebug(enabled: boolean): void {
    this.debug = enabled;
    console.log(`UnifiedFingerDetector: Modo debug ${enabled ? 'activado' : 'desactivado'}`);
  }

  /**
   * Reinicia el detector a su estado inicial
   */
  public reset(): void {
    Object.keys(this.state.sources).forEach(sourceName => {
      this.state.sources[sourceName as DetectionSource] = this.createInitialSourceState();
    });
    
    this.state.historyBuffer = [];
    this.state.isFingerDetected = false;
    this.state.confidence = 0;
    this.state.overallConsensus = 0;
    
    console.log("UnifiedFingerDetector: Sistema reiniciado");
  }
  
  /**
   * Agrega un evento de diagnóstico al historial
   * @param type Tipo de evento
   * @param details Detalles adicionales
   */
  public logDiagnosticEvent(type: string, details: any): void {
    if (!this.debug) return;
    
    console.log(`UnifiedFingerDetector [Diagnóstico]: ${type}`, details);
  }
}

// Instancia singleton para compartir en toda la aplicación
export const unifiedFingerDetector = new UnifiedFingerDetector();
