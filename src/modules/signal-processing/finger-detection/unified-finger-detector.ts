
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector unificado de dedos
 * 
 * IMPORTANTE: Este es el módulo central del sistema de detección de dedos.
 * Todas las fuentes de detección deben reportar a este detector, y todos
 * los componentes deben consultar a este detector para conocer el estado
 * actual de detección de dedos.
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { 
  DetectionSource, 
  DetectionState,
  DiagnosticEventType,
  SourceDetectionResult
} from './finger-detection-types';
import { 
  reportFingerDetection, 
  reportDiagnosticEvent 
} from './finger-diagnostics';
import { 
  getCalibrationParameters, 
  updateEnvironmentalState 
} from './adaptive-calibration';

/**
 * Implementación del detector unificado de dedos
 */
export class UnifiedFingerDetector {
  private detectionSources: Map<DetectionSource, { detected: boolean, confidence: number, lastUpdate: number }> = new Map();
  private isFingerDetected: boolean = false;
  private detectionConfidence: number = 0;
  private lastStateChangeTime: number = 0;
  private detectionHysteresis: number = 1000; // ms de histéresis para evitar cambios rápidos de estado
  
  // Contador de cambios de estado para diagnóstico
  private stateChangeCounter: number = 0;
  
  // Factores de peso para fuentes específicas
  private sourceWeights: Record<string, number> = {
    'amplitude': 1.0,
    'rhythm': 1.0,
    'combined': 1.0,
    'ppg-extractor': 1.0,
    'signal-quality-amplitude': 0.9,
    'signal-quality-pattern': 1.2,
    'signal-quality-state': 0.8,
    'weak-signal-result': 0.7,
    'rhythm-pattern': 1.3,
    'brightness': 0.6,
    'camera-analysis': 0.5,
    'motion-detection': 0.4,
    'unified-detection': 1.0
  };
  
  /**
   * Constructor con inicialización de fuentes por defecto
   */
  constructor() {
    // Inicializar todas las fuentes como no detectadas
    Object.keys(this.sourceWeights).forEach(source => {
      this.detectionSources.set(source as DetectionSource, {
        detected: false,
        confidence: 0,
        lastUpdate: 0
      });
    });
    
    logError(
      "UnifiedFingerDetector: Detector unificado inicializado",
      ErrorLevel.INFO,
      "FingerDetection"
    );
  }
  
  /**
   * Actualiza el estado de detección desde una fuente
   */
  public updateSource(source: DetectionSource, detected: boolean, confidence: number = 1.0): void {
    // Asegurar rango de confianza válido
    confidence = Math.max(0, Math.min(1, confidence));
    
    // Actualizar fuente
    this.detectionSources.set(source, { 
      detected, 
      confidence,
      lastUpdate: Date.now()
    });
    
    // Recalcular estado general
    this.recalculateDetectionState();
  }
  
  /**
   * Establece el peso de una fuente específica
   */
  public setSourceWeight(source: DetectionSource, weight: number): void {
    weight = Math.max(0.1, Math.min(2.0, weight));
    this.sourceWeights[source] = weight;
    
    logError(
      `UnifiedFingerDetector: Peso de fuente ${source} actualizado a ${weight}`,
      ErrorLevel.DEBUG,
      "FingerDetection"
    );
  }
  
  /**
   * Obtiene el estado actual de detección
   */
  public getDetectionState(): DetectionState {
    const calibrationParams = getCalibrationParameters();
    const sourcesObject: Record<string, { detected: boolean, confidence: number }> = {} as Record<string, { detected: boolean, confidence: number }>;
    
    // Convertir Map a objeto para más fácil consumo
    this.detectionSources.forEach((value, key) => {
      sourcesObject[key] = {
        detected: value.detected,
        confidence: value.confidence
      };
    });
    
    return {
      detected: this.isFingerDetected,
      isFingerDetected: this.isFingerDetected,
      confidence: this.detectionConfidence,
      amplitude: {
        detected: this.detectionSources.get('amplitude')?.detected || false,
        confidence: this.detectionSources.get('amplitude')?.confidence || 0
      },
      rhythm: {
        detected: this.detectionSources.get('rhythm')?.detected || false,
        confidence: this.detectionSources.get('rhythm')?.confidence || 0
      },
      sources: sourcesObject,
      lastUpdate: Date.now(),
      thresholds: {
        sensitivityLevel: calibrationParams.sensitivityLevel,
        qualityFactor: calibrationParams.environmentQualityFactor,
        environmentFactor: 1.0, // Valor por defecto
        adaptationRate: 0.1, // Valor por defecto
        amplitudeThreshold: calibrationParams.amplitudeThreshold,
        falsePositiveReduction: calibrationParams.falsePositiveReduction,
        falseNegativeReduction: calibrationParams.falseNegativeReduction
      }
    };
  }
  
  /**
   * Reinicia el estado del detector
   */
  public reset(): void {
    // Limpiar estado de todas las fuentes
    this.detectionSources.forEach((_, key) => {
      this.detectionSources.set(key, { 
        detected: false,
        confidence: 0,
        lastUpdate: 0
      });
    });
    
    this.isFingerDetected = false;
    this.detectionConfidence = 0;
    this.lastStateChangeTime = 0;
    this.stateChangeCounter = 0;
    
    // Reportar evento de reseteo
    reportDiagnosticEvent(
      DiagnosticEventType.DETECTOR_RESET,
      'unified-detection',
      false,
      1.0,
      { reason: 'manual-reset' }
    );
    
    logError(
      "UnifiedFingerDetector: Sistema de detección reiniciado",
      ErrorLevel.INFO,
      "FingerDetection"
    );
  }
  
  /**
   * Adapta umbrales basados en calidad de señal y brillo ambiental
   */
  public adaptThresholds(signalQuality: number, brightness?: number): void {
    // Normalizar valores
    const qualityFactor = Math.max(0, Math.min(1, signalQuality / 100));
    let brightnessFactor = 1.0;
    
    if (brightness !== undefined) {
      brightnessFactor = Math.min(1, Math.max(0.1, brightness / 255));
    }
    
    // Actualizar estado ambiental para la calibración adaptativa
    updateEnvironmentalState({ 
      signalToNoiseRatio: qualityFactor,
      brightness: brightness
    });
  }
  
  /**
   * Recalcula el estado general de detección
   */
  private recalculateDetectionState(): void {
    if (this.detectionSources.size === 0) {
      this.isFingerDetected = false;
      this.detectionConfidence = 0;
      return;
    }
    
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    let activeSources = 0;
    let recentSources = 0;
    
    // Obtener parámetros de calibración actuales
    const calibrationParams = getCalibrationParameters();
    
    // Procesar cada fuente teniendo en cuenta edad y peso
    for (const [source, data] of this.detectionSources.entries()) {
      // Calcular edad de los datos en segundos
      const ageInSeconds = (now - data.lastUpdate) / 1000;
      
      // Solo considerar fuentes actualizadas en los últimos 10 segundos
      if (ageInSeconds <= 10) {
        // Aplicar descuento por edad (más peso a datos recientes)
        const ageFactor = Math.max(0.1, 1 - ageInSeconds / 10);
        
        // Obtener peso base de la fuente
        const baseWeight = this.sourceWeights[source] || 1.0;
        
        // Calcular peso final
        const finalWeight = baseWeight * ageFactor;
        
        // Acumular para promedio ponderado
        const sourceValue = data.detected ? data.confidence : 0;
        weightedSum += sourceValue * finalWeight;
        totalWeight += finalWeight;
        
        // Contadores para estadísticas
        if (data.detected) {
          activeSources++;
        }
        recentSources++;
      }
    }
    
    // Calcular confianza promedio ponderada
    let newConfidence = 0;
    if (totalWeight > 0) {
      newConfidence = weightedSum / totalWeight;
    }
    
    // Aplicar factor de sensibilidad
    const sensitivityLevel = calibrationParams.sensitivityLevel || 0.5;
    const sensitivityAdjustedThreshold = 0.5 * (2 - sensitivityLevel);
    
    // Determinar nuevo estado de detección
    let newDetected = newConfidence >= sensitivityAdjustedThreshold;
    
    // Agregar histéresis para estabilidad
    if (newDetected !== this.isFingerDetected) {
      // Si ha pasado suficiente tiempo desde el último cambio, permitir el cambio
      if (now - this.lastStateChangeTime >= this.detectionHysteresis) {
        // Registrar cambio de estado
        if (newDetected) {
          reportFingerDetection(true, newConfidence, 'unified-detection', {
            activeSources,
            recentSources,
            threshold: sensitivityAdjustedThreshold
          });
        } else {
          reportFingerDetection(false, 1 - newConfidence, 'unified-detection', {
            activeSources,
            recentSources,
            threshold: sensitivityAdjustedThreshold
          });
        }
        
        this.isFingerDetected = newDetected;
        this.lastStateChangeTime = now;
        this.stateChangeCounter++;
        
        logError(
          `UnifiedFingerDetector: Cambio de estado a ${newDetected ? 'DETECTADO' : 'NO DETECTADO'} ` +
          `con confianza ${newConfidence.toFixed(2)}, fuentes activas: ${activeSources}/${recentSources}`,
          ErrorLevel.INFO,
          "FingerDetection"
        );
      }
    }
    
    // Actualizar confianza siempre
    this.detectionConfidence = newConfidence;
  }

  /**
   * Obtiene estadísticas del detector
   */
  public getStatistics(): Record<string, any> {
    const now = Date.now();
    const sourceStats: Record<string, any> = {};
    
    // Recopilar estadísticas por fuente
    this.detectionSources.forEach((data, source) => {
      sourceStats[source] = {
        detected: data.detected,
        confidence: data.confidence,
        ageMs: now - data.lastUpdate,
        weight: this.sourceWeights[source] || 1.0
      };
    });
    
    return {
      currentState: {
        isFingerDetected: this.isFingerDetected,
        confidence: this.detectionConfidence,
        lastStateChangeTime: this.lastStateChangeTime,
        timeSinceChange: now - this.lastStateChangeTime,
        stateChangeCount: this.stateChangeCounter
      },
      sources: sourceStats,
      settings: {
        hysteresisMs: this.detectionHysteresis,
        calibration: getCalibrationParameters()
      }
    };
  }
  
  /**
   * Establece umbral de histéresis para cambios de estado
   */
  public setHysteresis(milliseconds: number): void {
    this.detectionHysteresis = Math.max(0, Math.min(5000, milliseconds));
  }
}

// Crear instancia singleton
export const unifiedFingerDetector = new UnifiedFingerDetector();

/**
 * Reinicia el detector de dedos
 */
export function resetFingerDetector(): void {
  unifiedFingerDetector.reset();
}

/**
 * Obtiene el estado actual de detección
 */
export function getFingerDetectionState(): DetectionState {
  return unifiedFingerDetector.getDetectionState();
}

/**
 * Actualiza una fuente de detección
 */
export function updateDetectionSource(source: DetectionSource, detected: boolean, confidence: number = 1.0): void {
  unifiedFingerDetector.updateSource(source, detected, confidence);
}

/**
 * Adapta los umbrales según calidad y brillo
 */
export function adaptDetectionThresholds(signalQuality: number, brightness?: number): void {
  unifiedFingerDetector.adaptThresholds(signalQuality, brightness);
}

/**
 * Comprueba si un dedo está actualmente detectado
 */
export function isFingerDetected(): boolean {
  return unifiedFingerDetector.getDetectionState().isFingerDetected;
}

/**
 * Obtiene la confianza actual de la detección
 */
export function getDetectionConfidence(): number {
  return unifiedFingerDetector.getDetectionState().confidence;
}
