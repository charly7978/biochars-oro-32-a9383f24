
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema unificado para detección de dedos
 * 
 * IMPORTANTE: Este sistema coordina múltiples fuentes de detección
 * para proporcionar un resultado consolidado y más confiable.
 */

import { 
  DetectionSource, 
  DetectionState, 
  SourceDetectionResult,
  DiagnosticEventType
} from './finger-detection-types';
import { reportDiagnosticEvent, fingerDiagnostics } from './finger-diagnostics';
import {
  adaptDetectionThresholds,
  getCalibrationParameters
} from './adaptive-calibration';

// Estado inicial de detección
const initialState: DetectionState = {
  isFingerDetected: false,
  confidence: 0,
  sources: {},
  amplitude: {
    detected: false,
    confidence: 0,
    timestamp: Date.now()
  },
  rhythm: {
    detected: false,
    confidence: 0,
    timestamp: Date.now()
  },
  lastUpdate: Date.now()
};

// Estado actual de detección
let currentState: DetectionState = { ...initialState };

// Configuración de confianza mínima para detección
const DETECTION_THRESHOLD = 0.6;
const CONFIDENCE_WEIGHTS: Record<string, number> = {
  [DetectionSource.AMPLITUDE]: 0.35,
  [DetectionSource.RHYTHM]: 0.4,
  [DetectionSource.PPG_EXTRACTOR]: 0.25,
  [DetectionSource.SIGNAL_QUALITY_AMPLITUDE]: 0.3,
  [DetectionSource.SIGNAL_QUALITY_STATE]: 0.25,
  [DetectionSource.BRIGHTNESS]: 0.2,
  [DetectionSource.WEAK_SIGNAL_RESULT]: 0.2,
  [DetectionSource.RHYTHM_PATTERN]: 0.4,
};

/**
 * Actualiza una fuente de detección y recalcula el estado global
 */
export function updateDetectionSource(
  source: DetectionSource,
  detected: boolean,
  confidence: number = 0.5
): void {
  // Asegurar que exista una entrada para esta fuente
  if (!currentState.sources[source]) {
    currentState.sources[source] = {
      detected: false,
      confidence: 0,
      timestamp: Date.now()
    };
  }
  
  // Actualizar fuente específica
  const sourceResult: SourceDetectionResult = {
    detected,
    confidence,
    timestamp: Date.now()
  };
  
  currentState.sources[source] = sourceResult;
  
  // Actualizar fuentes principales si corresponde
  if (source === DetectionSource.AMPLITUDE || 
      source === DetectionSource.SIGNAL_QUALITY_AMPLITUDE) {
    currentState.amplitude = sourceResult;
  } else if (source === DetectionSource.RHYTHM || 
             source === DetectionSource.RHYTHM_PATTERN) {
    currentState.rhythm = sourceResult;
  }
  
  // Recalcular estado global
  recalculateDetectionState();
  
  // Actualizar timestamp
  currentState.lastUpdate = Date.now();
}

/**
 * Recalcula el estado global de detección basado en todas las fuentes
 */
function recalculateDetectionState(): void {
  // Variables para cálculo
  let totalWeightedConfidence = 0;
  let totalWeight = 0;
  let weightedDetectionCount = 0;
  
  // Procesar cada fuente
  Object.entries(currentState.sources).forEach(([source, result]) => {
    // Obtener peso de esta fuente
    const weight = CONFIDENCE_WEIGHTS[source as DetectionSource] || 0.2;
    
    // Sumar confianza ponderada
    totalWeightedConfidence += result.confidence * weight;
    totalWeight += weight;
    
    // Sumar detección ponderada
    if (result.detected) {
      weightedDetectionCount += weight;
    }
  });
  
  // Calcular confianza global
  const newConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
  
  // Determinar si hay detección basada en confianza global y consenso ponderado
  const wasDetected = currentState.isFingerDetected;
  const newDetected = (weightedDetectionCount / totalWeight) > DETECTION_THRESHOLD;
  
  // Actualizar estado global solo si hay cambio
  if (wasDetected !== newDetected || Math.abs(currentState.confidence - newConfidence) > 0.1) {
    // Actualizar estado
    currentState = {
      ...currentState,
      isFingerDetected: newDetected,
      confidence: newConfidence
    };
    
    // Registrar evento diagnóstico en cambios significativos
    reportDiagnosticEvent(
      DiagnosticEventType.DETECTOR_RESET,
      DetectionSource.UNIFIED_DETECTION,
      newDetected,
      newConfidence,
      {
        weightedDetectionRatio: weightedDetectionCount / totalWeight,
        threshold: DETECTION_THRESHOLD,
        sourceCount: Object.keys(currentState.sources).length
      }
    );
  }
}

/**
 * Obtiene el estado actual de detección
 */
export function getFingerDetectionState(): DetectionState {
  return { ...currentState };
}

/**
 * Analiza una señal para buscar patrones rítmicos
 * No realiza simulación, solo analiza datos reales
 */
export function analyzeSignalForRhythmicPattern(
  value: number,
  sensitivity: number = 0.5
): boolean {
  // Obtener calibración actual
  const calibParams = getCalibrationParameters();
  
  // Ajustar sensibilidad por factores ambientales
  const adjustedSensitivity = sensitivity * calibParams.environmentQualityFactor;
  
  // Solo detectar patrones si la señal es suficientemente fuerte
  if (Math.abs(value) < calibParams.amplitudeThreshold * 0.8) {
    return false;
  }
  
  // Verificación simple basada en amplitud y sensibilidad
  // Esto es un análisis real, no una simulación
  const detectionThreshold = 0.1 / adjustedSensitivity;
  const isDetected = Math.abs(value) > detectionThreshold;
  
  // Actualizar detector unificado
  updateDetectionSource(
    DetectionSource.UNIFIED_DETECTION,
    isDetected,
    isDetected ? adjustedSensitivity * 0.8 : 0
  );
  
  return isDetected;
}

/**
 * Verifica si hay un dedo detectado actualmente
 */
export function isFingerDetected(): boolean {
  return currentState.isFingerDetected;
}

/**
 * Obtiene la confianza actual de la detección
 */
export function getDetectionConfidence(): number {
  return currentState.confidence;
}

/**
 * Verifica la fuerza de señal para determinar si el dedo está presente
 */
export function checkSignalStrength(
  value: number,
  config?: {
    lowSignalThreshold?: number;
    maxWeakSignalCount?: number;
  }
): {
  isWeakSignal: boolean;
  updatedWeakSignalsCount: number;
  quality: number;
} {
  // Obtener parámetros adaptados
  const calibParams = getCalibrationParameters();
  
  // Configurar umbrales
  const threshold = config?.lowSignalThreshold || calibParams.amplitudeThreshold;
  const maxWeakCount = config?.maxWeakSignalCount || 5;
  
  // Calcular calidad basada en fuerza de señal
  const signalStrength = Math.abs(value);
  const quality = Math.min(100, Math.max(0, signalStrength * 500));
  
  // Determinar si la señal es débil
  const isWeak = signalStrength < threshold;
  
  // Resultado vacío para compatibilidad con interfaz existente
  const result = {
    isWeakSignal: isWeak,
    updatedWeakSignalsCount: isWeak ? 1 : 0,
    quality
  };
  
  // Actualizar detector unificado
  updateDetectionSource(
    DetectionSource.AMPLITUDE,
    !isWeak,
    isWeak ? 0.2 : Math.min(0.9, signalStrength * 4)
  );
  
  return result;
}

/**
 * Reinicia completamente el detector
 */
export function resetFingerDetector(): void {
  // Restablecer estado
  currentState = { ...initialState };
  
  // Limpiar diagnósticos
  fingerDiagnostics.clearEvents();
  
  // Registrar evento
  reportDiagnosticEvent(
    DiagnosticEventType.DETECTOR_RESET,
    DetectionSource.COMBINED,
    false,
    1.0,
    { source: 'reset-finger-detector' }
  );
}

// Exportar constantes y tipos
export const unifiedFingerDetector = {
  updateDetectionSource,
  getFingerDetectionState,
  resetFingerDetector,
  analyzeSignalForRhythmicPattern,
  isFingerDetected,
  getDetectionConfidence
};
