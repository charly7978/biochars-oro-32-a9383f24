
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector unificado de presencia de dedo
 * Combina múltiples fuentes de información para una detección más robusta
 * Implementa lógica de adaptación y anti-flicker
 */

// Tipos
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Fuentes de detección de dedo permitidas
export type DetectionSource = 
  'camera-illumination' | 
  'ppg-extractor' | 
  'signal-quality-amplitude' | 
  'signal-quality-pattern' | 
  'signal-quality-state' | 
  'weak-signal-result' | 
  'manual-override' | 
  'brightness' |
  'camera-analysis' |
  'extraction' |
  'signalProcessor' |
  'rhythm-pattern';

// Configuración estándar
const DEFAULT_CONFIG = {
  // Reducir umbral general para detección más sensible
  detectionThreshold: 0.55, // Reducido de 0.58 para mayor sensibilidad
  // Pesos de las diferentes fuentes de detección
  sourceWeights: {
    'camera-illumination': 0.8,
    'ppg-extractor': 0.9,
    'signal-quality-amplitude': 0.85,
    'signal-quality-pattern': 0.95,
    'signal-quality-state': 0.8,
    'weak-signal-result': 0.7,
    'manual-override': 1.0,
    'brightness': 0.7,
    'camera-analysis': 0.85,
    'extraction': 0.9,
    'signalProcessor': 0.85,
    'rhythm-pattern': 0.9
  } as Record<DetectionSource, number>,
  // Tiempo mínimo para mantener una detección (anti-flicker)
  stableDetectionTimeMs: 450,
  // Tiempo para mantener la detección después de perderla
  detectionPersistenceMs: 150,
  // Factores de adaptación de umbrales
  adaptiveFactors: {
    qualityInfluence: 0.04,
    brightnessInfluence: 0.05
  }
};

// Interface for diagnostic events
interface DiagnosticEvent {
  timestamp: number;
  type: string;
  details: any;
}

/**
 * Clase para detección unificada de dedo usando múltiples fuentes
 */
export class UnifiedFingerDetector {
  // Estado de fuentes de detección
  private sources: Map<DetectionSource, {value: boolean, confidence: number, timestamp: number}>;
  
  // Estado actual de detección
  private isFingerDetected: boolean = false;
  private detectionConfidence: number = 0;
  private lastDetectionTime: number | null = null;
  private lastLossTime: number | null = null;
  
  // Configuración
  private config = {...DEFAULT_CONFIG};
  
  // Debug mode
  private debugMode: boolean = false;
  
  // Manual override
  private manualOverrideActive: boolean = false;
  
  // Diagnostic events buffer
  private diagnosticEvents: DiagnosticEvent[] = [];
  private readonly MAX_DIAGNOSTIC_EVENTS = 100;
  
  constructor() {
    this.sources = new Map();
    console.log("UnifiedFingerDetector: Sistema de detección unificado inicializado");
  }
  
  /**
   * Actualiza el estado de una fuente de detección
   */
  public updateSource(source: DetectionSource, detected: boolean, confidence: number = 0.8): void {
    this.sources.set(source, {
      value: detected,
      confidence: Math.min(1, Math.max(0, confidence)),
      timestamp: Date.now()
    });
    
    // Log diagnostic event
    if (this.debugMode) {
      this.logDiagnosticEvent('source-update', {
        source,
        detected,
        confidence,
        timestamp: Date.now()
      });
    }
    
    // Recalcular estado inmediatamente para respuesta más rápida
    this.calculateDetectionState();
  }
  
  /**
   * Adapta los umbrales en función de la calidad de la señal y brillo
   */
  public adaptThresholds(signalQuality: number, brightness?: number): void {
    // Adaptación basada en calidad de señal
    if (signalQuality !== undefined) {
      // Ajuste de umbral de detección más sensible para señales de calidad media
      if (signalQuality < 60) {
        // Mayor sensibilidad a señales débiles pero de calidad media
        const qualityAdjustment = this.config.adaptiveFactors.qualityInfluence * 
                                 (signalQuality > 30 ? 0.6 : 0.3);
        this.config.detectionThreshold = Math.max(
          0.38, // Umbral mínimo más bajo para mejorar sensibilidad
          DEFAULT_CONFIG.detectionThreshold - qualityAdjustment
        );
      } else {
        // Restaurar umbral normal para señales de buena calidad
        this.config.detectionThreshold = DEFAULT_CONFIG.detectionThreshold;
      }
    }
    
    // Adaptación basada en brillo si está disponible
    if (brightness !== undefined) {
      // Normalizar brillo a 0-1 (asumiendo rango 0-255)
      const normalizedBrightness = brightness / 255;
      
      // Ajustar umbral para condiciones de bajo brillo
      if (normalizedBrightness < 0.3) {
        // Mayor sensibilidad en condiciones de baja luz
        const brightnessAdjustment = this.config.adaptiveFactors.brightnessInfluence * 
                                    (0.3 - normalizedBrightness);
        this.config.detectionThreshold = Math.max(
          0.35, // Umbral mínimo más bajo para mejorar sensibilidad
          this.config.detectionThreshold - brightnessAdjustment
        );
      }
    }
    
    // Log threshold adaptation if in debug mode
    if (this.debugMode) {
      this.logDiagnosticEvent('threshold-adaptation', {
        signalQuality,
        brightness,
        newThreshold: this.config.detectionThreshold,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Calcula el estado general de detección basado en todas las fuentes
   */
  private calculateDetectionState(): void {
    const now = Date.now();
    
    // If manual override is active, use that
    if (this.manualOverrideActive) {
      this.isFingerDetected = true;
      this.detectionConfidence = 1.0;
      this.lastDetectionTime = now;
      return;
    }
    
    // Ignorar fuentes sin actualización reciente (últimos 2 segundos)
    const recentSources = Array.from(this.sources.entries())
      .filter(([_, data]) => now - data.timestamp < 2000);
    
    if (recentSources.length === 0) {
      // Sin fuentes recientes, mantener estado actual
      return;
    }
    
    // Calcular ponderación de cada fuente
    let totalWeight = 0;
    let weightedDetectionSum = 0;
    
    for (const [source, data] of recentSources) {
      // Obtener peso para esta fuente
      const weight = (this.config.sourceWeights[source] || 0.5) * data.confidence;
      
      // Acumular valor ponderado
      weightedDetectionSum += data.value ? weight : 0;
      totalWeight += weight;
    }
    
    // Calcular valor ponderado final
    const weightedValue = totalWeight > 0 ? weightedDetectionSum / totalWeight : 0;
    
    // Aplicar umbral dinámico para determinar detección
    const wasDetected = this.isFingerDetected;
    let newDetectionState = false;
    
    // Detección sensible basada en umbral adaptativo
    if (weightedValue >= this.config.detectionThreshold) {
      newDetectionState = true;
      this.lastDetectionTime = now;
    } 
    // Anti-flicker: mantener detección por corto tiempo después de perderla
    else if (wasDetected && this.lastDetectionTime && 
             now - this.lastDetectionTime < this.config.detectionPersistenceMs) {
      newDetectionState = true;
    } 
    // Estado de pérdida
    else {
      newDetectionState = false;
      if (wasDetected) this.lastLossTime = now;
    }
    
    // Actualizar estado y confianza
    this.isFingerDetected = newDetectionState;
    this.detectionConfidence = weightedValue;
    
    // Log state calculation if in debug mode
    if (this.debugMode) {
      this.logDiagnosticEvent('state-calculation', {
        weightedValue,
        threshold: this.config.detectionThreshold,
        isDetected: this.isFingerDetected,
        confidence: this.detectionConfidence,
        timestamp: now
      });
    }
  }
  
  /**
   * Devuelve el estado actual de detección
   */
  public getDetectionState(): { isFingerDetected: boolean; confidence: number } {
    // Recalcular en cada consulta para asegurar estado fresco
    this.calculateDetectionState();
    
    return {
      isFingerDetected: this.isFingerDetected,
      confidence: this.detectionConfidence
    };
  }
  
  /**
   * Set debug mode
   */
  public setDebug(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`UnifiedFingerDetector: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set manual override
   */
  public setManualOverride(active: boolean): void {
    this.manualOverrideActive = active;
    console.log(`UnifiedFingerDetector: Manual override ${active ? 'activated' : 'deactivated'}`);
    
    // Log override action if in debug mode
    if (this.debugMode) {
      this.logDiagnosticEvent('manual-override', {
        active,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Log diagnostic event
   */
  public logDiagnosticEvent(type: string, details: any): void {
    this.diagnosticEvents.push({
      timestamp: Date.now(),
      type,
      details
    });
    
    // Limit buffer size
    if (this.diagnosticEvents.length > this.MAX_DIAGNOSTIC_EVENTS) {
      this.diagnosticEvents.shift();
    }
  }
  
  /**
   * Get detailed statistics about the detector
   */
  public getDetailedStats(): {
    sources: Record<string, any>;
    config: typeof DEFAULT_CONFIG;
    state: {
      isFingerDetected: boolean;
      confidence: number;
      lastDetectionTime: number | null;
      lastLossTime: number | null;
    };
    diagnostics: DiagnosticEvent[];
  } {
    return {
      sources: this.getSourcesState(),
      config: {...this.config},
      state: {
        isFingerDetected: this.isFingerDetected,
        confidence: this.detectionConfidence,
        lastDetectionTime: this.lastDetectionTime,
        lastLossTime: this.lastLossTime
      },
      diagnostics: [...this.diagnosticEvents]
    };
  }
  
  /**
   * Resetea el detector
   */
  public reset(): void {
    this.sources.clear();
    this.isFingerDetected = false;
    this.detectionConfidence = 0;
    this.lastDetectionTime = null;
    this.lastLossTime = null;
    this.config = {...DEFAULT_CONFIG};
    this.manualOverrideActive = false;
    this.diagnosticEvents = [];
  }
  
  /**
   * Obtiene el estado de todas las fuentes (para debug)
   */
  public getSourcesState(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [source, data] of this.sources.entries()) {
      result[source] = {
        value: data.value,
        confidence: data.confidence,
        age: Date.now() - data.timestamp
      };
    }
    
    return result;
  }
}

// Crear singleton
export const unifiedFingerDetector = new UnifiedFingerDetector();

// Exportar tipo e instancia
export default unifiedFingerDetector;
