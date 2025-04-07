
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { HeartBeatResult } from '../types';

// Signal quality state tracking
let consecutiveWeakSignalsCount = 0;
let fingerDetectionState = false;

/**
 * Check if signal is weak
 */
export function checkWeakSignal(
  value: number,
  currentWeakSignalsCount: number,
  options: {
    lowSignalThreshold: number;
    maxWeakSignalCount: number;
  }
): { isWeakSignal: boolean; updatedWeakSignalsCount: number } {
  const { lowSignalThreshold, maxWeakSignalCount } = options;
  
  // Calculate absolute value for amplitude check
  const signalAmplitude = Math.abs(value);
  
  // Check if amplitude is below threshold
  const isLowAmplitude = signalAmplitude < lowSignalThreshold;
  
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isLowAmplitude) {
    updatedWeakSignalsCount = Math.min(maxWeakSignalCount + 1, updatedWeakSignalsCount + 1);
  } else {
    updatedWeakSignalsCount = Math.max(0, updatedWeakSignalsCount - 1);
  }
  
  // Signal is weak if we've had too many consecutive weak signals
  const isWeakSignal = updatedWeakSignalsCount >= maxWeakSignalCount;
  
  return {
    isWeakSignal,
    updatedWeakSignalsCount
  };
}

/**
 * Reset signal quality state
 */
export function resetSignalQualityState(): void {
  consecutiveWeakSignalsCount = 0;
  fingerDetectionState = false;
}

/**
 * Check if a measurement should be processed
 */
export function shouldProcessMeasurement(value: number): boolean {
  // Check if amplitude is significant enough for processing
  const absValue = Math.abs(value);
  return absValue > 0.05;
}

/**
 * Create a result object for weak signal
 */
export function createWeakSignalResult(arrhythmiaCount: number = 0): HeartBeatResult {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount,
    rrData: {
      intervals: [],
      lastPeakTime: null
    }
  };
}

/**
 * Check if finger is currently detected
 */
export function isFingerDetected(value: number): boolean {
  // Update finger detection state based on signal amplitude
  const minThreshold = 0.08;
  const absValue = Math.abs(value);
  
  // Add some hysteresis to avoid flickering
  if (absValue > 0.1) {
    fingerDetectionState = true;
  } else if (absValue < minThreshold) {
    fingerDetectionState = false;
  }
  
  return fingerDetectionState;
}
