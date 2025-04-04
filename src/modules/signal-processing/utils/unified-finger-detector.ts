/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector unificado de dedos que combina múltiples fuentes de detección
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Fuentes de detección de dedos soportadas
 */
export type DetectionSource = 
  | 'ppg-extractor'
  | 'signal-quality-amplitude'
  | 'image-analysis'
  | 'motion-detection'
  | 'adaptive-system'
  | 'signal-quality-pattern'
  | 'signal-quality-state'
  | 'weak-signal-result'
  | 'rhythm-pattern'
  | 'brightness'
  | 'camera-analysis';

/**
 * Estado de detección
 */
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<DetectionSource, {
    detected: boolean;
    confidence: number;
    lastUpdate: number;
  }>;
  thresholds: {
    sensitivityLevel: number;
    qualityFactor: number;
    environmentFactor: number;
    adaptationRate: number;
    amplitudeThreshold: number;
    falsePositiveReduction: number;
    falseNegativeReduction: number;
  };
}

/**
 * Configuración de detector
 */
export interface UnifiedDetectorConfig {
  baseThreshold?: number;
  sourceWeights?: Partial<Record<DetectionSource, number>>;
  adaptationRate?: number;
  expirationTime?: number;
}

/**
 * Detector unificado que combina múltiples fuentes
 */
class UnifiedFingerDetector {
  private state: DetectionState;
  private config: Required<UnifiedDetectorConfig>;
  private stateChanges: Array<{time: number, state: boolean}> = [];
  private diagnosticEvents: Array<{timestamp: number, type: string, data: any}> = [];

  constructor(config?: UnifiedDetectorConfig) {
    this.config = {
      baseThreshold: config?.baseThreshold ?? 0.6,
      sourceWeights: config?.sourceWeights ?? {
        'ppg-extractor': 0.35,
        'signal-quality-amplitude': 0.35,
        'image-analysis': 0.2,
        'motion-detection': 0.1,
        'adaptive-system': 0.1,
        'signal-quality-pattern': 0.1,
        'signal-quality-state': 0.1,
        'weak-signal-result': 0.1,
        'rhythm-pattern': 0.1,
        'brightness': 0.1,
        'camera-analysis': 0.1
      },
      adaptationRate: config?.adaptationRate ?? 0.2,
      expirationTime: config?.expirationTime ?? 3000
    };
    
    this.state = this.createInitialState();
  }
  
  /**
   * Crea el estado inicial
   */
  private createInitialState(): DetectionState {
    const sources: Record<DetectionSource, any> = {
      'ppg-extractor': { detected: false, confidence: 0, lastUpdate: 0 },
      'signal-quality-amplitude': { detected: false, confidence: 0, lastUpdate: 0 },
      'image-analysis': { detected: false, confidence: 0, lastUpdate: 0 },
      'motion-detection': { detected: false, confidence: 0, lastUpdate: 0 },
      'adaptive-system': { detected: false, confidence: 0, lastUpdate: 0 },
      'signal-quality-pattern': { detected: false, confidence: 0, lastUpdate: 0 },
      'signal-quality-state': { detected: false, confidence: 0, lastUpdate: 0 },
      'weak-signal-result': { detected: false, confidence: 0, lastUpdate: 0 },
      'rhythm-pattern': { detected: false, confidence: 0, lastUpdate: 0 },
      'brightness': { detected: false, confidence: 0, lastUpdate: 0 },
      'camera-analysis': { detected: false, confidence: 0, lastUpdate: 0 }
    };
    
    return {
      isFingerDetected: false,
      confidence: 0,
      sources,
      thresholds: {
        sensitivityLevel: 0.6,
        qualityFactor: 0.7,
        environmentFactor: 1.0,
        adaptationRate: this.config.adaptationRate,
        amplitudeThreshold: 0.4,
        falsePositiveReduction: 0.3,
        falseNegativeReduction: 0.3
      }
    };
  }
  
  /**
   * Actualiza el estado de una fuente
   */
  public updateSource(
    source: DetectionSource,
    detected: boolean,
    confidence: number
  ): void {
    try {
      if (!this.state.sources[source]) {
        throw new Error(`Fuente no válida: ${source}`);
      }
      
      this.state.sources[source] = {
        detected,
        confidence: Math.max(0, Math.min(1, confidence)),
        lastUpdate: Date.now()
      };
      
      this.evaluateDetection();
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.updateSource: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Evalúa el estado de detección
   */
  private evaluateDetection(): void {
    try {
      const now = Date.now();
      let weightedConfidence = 0;
      let totalWeight = 0;
      
      // Calcular confianza ponderada de todas las fuentes activas
      for (const [source, state] of Object.entries(this.state.sources)) {
        // Verificar si la fuente está actualizada
        const isActive = now - state.lastUpdate < this.config.expirationTime;
        
        if (isActive) {
          const weight = this.config.sourceWeights[source as DetectionSource] || 0;
          weightedConfidence += state.confidence * weight * (state.detected ? 1 : 0.3);
          totalWeight += weight;
        }
      }
      
      // Calcular confianza normalizada
      const normalizedConfidence = totalWeight > 0 
        ? weightedConfidence / totalWeight 
        : 0;
      
      // Aplicar umbral adaptativo
      const detectionThreshold = this.state.thresholds.sensitivityLevel *
                               this.state.thresholds.qualityFactor *
                               this.state.thresholds.environmentFactor;
      
      // Determinar si se detecta dedo
      const previousState = this.state.isFingerDetected;
      const detectedNow = normalizedConfidence >= detectionThreshold;
      
      // Aplicar histéresis para reducir falsos positivos y negativos
      let finalDetection = detectedNow;
      
      if (previousState && !detectedNow) {
        // Posible falso negativo - aplicar reducción
        finalDetection = normalizedConfidence >= 
          (detectionThreshold * (1 - this.state.thresholds.falseNegativeReduction));
      } else if (!previousState && detectedNow) {
        // Posible falso positivo - requerir confianza adicional
        finalDetection = normalizedConfidence >= 
          (detectionThreshold * (1 + this.state.thresholds.falsePositiveReduction));
      }
      
      // Actualizar estado
      this.state.isFingerDetected = finalDetection;
      this.state.confidence = normalizedConfidence;
      
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.evaluateDetection: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Obtiene el estado actual de detección
   */
  public getDetectionState(): DetectionState {
    // Antes de retornar, actualizar evaluación expirada
    const now = Date.now();
    let needsUpdate = false;
    
    // Verificar fuentes expiradas
    for (const [source, state] of Object.entries(this.state.sources)) {
      if (now - state.lastUpdate > this.config.expirationTime) {
        needsUpdate = true;
        break;
      }
    }
    
    if (needsUpdate) {
      this.evaluateDetection();
    }
    
    return { ...this.state };
  }
  
  /**
   * Adapta los umbrales basado en calidad y entorno
   */
  public adaptThresholds(
    signalQuality: number,
    environmentBrightness?: number
  ): void {
    try {
      // Ajustar factor de calidad (0-1)
      const qualityFactor = Math.max(0.3, Math.min(1, signalQuality / 100));
      
      // Ajustar factor ambiental si se proporciona brillo
      let environmentFactor = this.state.thresholds.environmentFactor;
      
      if (environmentBrightness !== undefined) {
        // Mayor brillo = menor sensibilidad necesaria
        environmentFactor = environmentBrightness > 100 
          ? Math.min(1.2, 1 + (environmentBrightness - 100) / 500)
          : Math.max(0.8, 1 - (100 - environmentBrightness) / 200);
      }
      
      // Aplicar adapatación suave
      const rate = this.state.thresholds.adaptationRate;
      this.state.thresholds.qualityFactor = 
        (1 - rate) * this.state.thresholds.qualityFactor + rate * qualityFactor;
      
      this.state.thresholds.environmentFactor = 
        (1 - rate) * this.state.thresholds.environmentFactor + rate * environmentFactor;
        
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.adaptThresholds: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Ajusta la sensibilidad del detector
   */
  public setSensitivity(level: number): void {
    try {
      this.state.thresholds.sensitivityLevel = Math.max(0.1, Math.min(0.9, level));
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.setSensitivity: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Establece la tasa de adaptación
   */
  public setAdaptationRate(rate: number): void {
    try {
      const validRate = Math.max(0.05, Math.min(0.5, rate));
      this.state.thresholds.adaptationRate = validRate;
      this.config.adaptationRate = validRate;
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.setAdaptationRate: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Establece el umbral de amplitud
   */
  public setAmplitudeThreshold(threshold: number): void {
    try {
      this.state.thresholds.amplitudeThreshold = Math.max(0.1, Math.min(0.8, threshold));
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.setAmplitudeThreshold: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Establece el factor de reducción de falsos positivos
   */
  public setFalsePositiveReduction(value: number): void {
    try {
      this.state.thresholds.falsePositiveReduction = Math.max(0.1, Math.min(0.5, value));
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.setFalsePositiveReduction: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Establece el factor de reducción de falsos negativos
   */
  public setFalseNegativeReduction(value: number): void {
    try {
      this.state.thresholds.falseNegativeReduction = Math.max(0.1, Math.min(0.5, value));
    } catch (error) {
      logError(
        `Error en UnifiedFingerDetector.setFalseNegativeReduction: ${error}`,
        ErrorLevel.ERROR,
        "FingerDetector"
      );
    }
  }
  
  /**
   * Resetea el detector a su estado inicial
   */
  public reset(): void {
    this.state = this.createInitialState();
  }
  
  /**
   * Get detailed diagnostic statistics for the detector
   */
  public getDetailedStats(): Record<string, any> {
    return {
      confidence: this.state.confidence,
      sourceStates: { ...this.state.sources },
      thresholds: { ...this.state.thresholds },
      detectionHistory: {
        lastDetection: this.state.isFingerDetected ? Date.now() : 0,
        stateChanges: this.stateChanges || []
      }
    };
  }
  
  /**
   * Log a diagnostic event
   */
  public logDiagnosticEvent(eventType: string, data: any): void {
    try {
      console.log(`[UnifiedFingerDetector] ${eventType}:`, data);
      
      // Could be expanded to track events in a more structured way
      if (!this.diagnosticEvents) {
        this.diagnosticEvents = [];
      }
      
      this.diagnosticEvents.push({
        timestamp: Date.now(),
        type: eventType,
        data
      });
      
      // Limit the number of stored events
      if (this.diagnosticEvents.length > 100) {
        this.diagnosticEvents.shift();
      }
    } catch (error) {
      // Silently handle errors in diagnostic logging
      console.error("Error logging diagnostic event:", error);
    }
  }
}

// Singleton
export const unifiedFingerDetector = new UnifiedFingerDetector();

/**
 * Resetea el detector unificado de dedos
 */
export function resetFingerDetector(): void {
  unifiedFingerDetector.reset();
}
