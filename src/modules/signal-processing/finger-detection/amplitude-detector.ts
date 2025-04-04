
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE
 * 
 * Detector de amplitud para identificar presencia de dedos
 * Basado en análisis de amplitud de señal real
 */

import { DetectionSource } from './finger-detection-types';
import { reportDiagnosticEvent, DiagnosticEventType } from './finger-diagnostics';
import { getCalibrationParameters, updateEnvironmentalState } from './adaptive-calibration';
import { updateDetectionSource } from './unified-finger-detector';

// Estado del detector
interface AmplitudeDetectorState {
  consecutiveWeakSignals: number;
  lastSignalStrength: number;
  lastDetectionTime: number;
  averageSignalStrength: number;
  recentSignals: number[];
  fingerDetected: boolean;
  detectionConfidence: number;
}

// Estado inicial
const initialState: AmplitudeDetectorState = {
  consecutiveWeakSignals: 0,
  lastSignalStrength: 0,
  lastDetectionTime: 0,
  averageSignalStrength: 0,
  recentSignals: [],
  fingerDetected: false,
  detectionConfidence: 0
};

// Estado actual
let state: AmplitudeDetectorState = { ...initialState };

/**
 * Verifica si la señal tiene suficiente fuerza para indicar presencia de un dedo
 * Basado únicamente en mediciones reales, sin simulación
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
  // Obtener configuración adaptativa
  const calibParams = getCalibrationParameters();
  
  // Configurar umbrales
  const threshold = config?.lowSignalThreshold || calibParams.amplitudeThreshold;
  const maxWeakCount = config?.maxWeakSignalCount || 5;
  
  // Calcular fuerza de señal y calidad
  const signalStrength = Math.abs(value);
  const quality = Math.min(100, Math.max(0, signalStrength * 500));
  
  // Determinar si la señal es débil
  const isWeak = signalStrength < threshold;
  
  // Actualizar contador de señales débiles
  if (isWeak) {
    state.consecutiveWeakSignals++;
  } else {
    state.consecutiveWeakSignals = 0;
  }
  
  // Actualizar historial reciente
  state.recentSignals.push(signalStrength);
  if (state.recentSignals.length > 30) {
    state.recentSignals.shift();
  }
  
  // Actualizar promedio de fuerza de señal
  if (state.recentSignals.length > 0) {
    state.averageSignalStrength = 
      state.recentSignals.reduce((sum, val) => sum + val, 0) / state.recentSignals.length;
  }
  
  // Actualizar estado de detección
  const wasDetected = state.fingerDetected;
  state.fingerDetected = state.consecutiveWeakSignals < maxWeakCount;
  state.lastSignalStrength = signalStrength;
  state.detectionConfidence = Math.max(0, 1 - (state.consecutiveWeakSignals / maxWeakCount));
  
  // Si cambió el estado de detección, actualizar tiempo y emitir diagnóstico
  if (wasDetected !== state.fingerDetected) {
    state.lastDetectionTime = Date.now();
    
    reportDiagnosticEvent(
      state.fingerDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST,
      DetectionSource.AMPLITUDE,
      state.fingerDetected,
      state.detectionConfidence,
      { 
        signalStrength,
        threshold,
        weakCount: state.consecutiveWeakSignals,
        maxWeakCount
      }
    );
    
    // Actualizar detector unificado
    updateDetectionSource(
      DetectionSource.AMPLITUDE,
      state.fingerDetected,
      state.detectionConfidence
    );
    
    // Si se perdió la detección, actualizar entorno con más ruido
    if (!state.fingerDetected) {
      updateEnvironmentalState({ noise: 0.7 });
    }
  }
  
  return {
    isWeakSignal: state.consecutiveWeakSignals >= maxWeakCount,
    updatedWeakSignalsCount: state.consecutiveWeakSignals,
    quality
  };
}

/**
 * Determina si una medición debe ser procesada basada en la calidad de señal
 */
export function shouldProcessMeasurement(
  value: number, 
  minQuality: number = 20
): boolean {
  const signalCheck = checkSignalStrength(value);
  return !signalCheck.isWeakSignal && signalCheck.quality >= minQuality;
}

/**
 * Obtiene la calidad de la última señal
 */
export function getLastSignalQuality(): number {
  if (state.recentSignals.length === 0) return 0;
  
  const signalStrength = state.lastSignalStrength;
  return Math.min(100, Math.max(0, signalStrength * 500));
}

/**
 * Verifica si un dedo está detectado según amplitud
 */
export function isFingerDetectedByAmplitude(): boolean {
  return state.fingerDetected;
}

/**
 * Reinicia el detector de amplitud
 */
export function resetAmplitudeDetector(): void {
  state = { ...initialState };
  
  // Reportar reset en diagnóstico
  reportDiagnosticEvent(
    DiagnosticEventType.DETECTOR_RESET,
    DetectionSource.AMPLITUDE,
    false,
    0,
    { source: 'reset-amplitude-detector' }
  );
}
