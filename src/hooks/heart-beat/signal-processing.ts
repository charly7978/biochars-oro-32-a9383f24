
import { HeartBeatResult } from './types';

/**
 * Checks if the signal is too weak to process
 */
export function checkWeakSignal(
  value: number, 
  currentWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number,
    maxWeakSignalCount: number
  }
): { isWeakSignal: boolean, updatedWeakSignalsCount: number } {
  // Umbral de señal débil reducido para mayor sensibilidad
  const isCurrentValueWeak = Math.abs(value) < config.lowSignalThreshold;
  
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isCurrentValueWeak) {
    updatedWeakSignalsCount++;
  } else {
    // Si la señal es fuerte, disminuimos el contador para recuperarse más rápidamente
    updatedWeakSignalsCount = Math.max(0, updatedWeakSignalsCount - 2);
  }
  
  const isWeakSignal = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  return { 
    isWeakSignal, 
    updatedWeakSignalsCount 
  };
}

/**
 * Determines if signal is suitable for measurement
 * Updated with threshold parameter for customization
 */
export function shouldProcessMeasurement(
  value: number, 
  threshold = 0.03 // Threshold now customizable and reduced for better sensitivity
): boolean {
  return Math.abs(value) >= threshold;
}

/**
 * Creates a result object for weak signal scenarios
 */
export function createWeakSignalResult(arrhythmiaCount = 0): HeartBeatResult {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount,
    isArrhythmia: false,
    rrData: {
      intervals: [],
      lastPeakTime: null
    }
  };
}

/**
 * Handles peak detection and beep requests
 * Enhanced for improved visualization and response
 */
export function handlePeakDetection(
  result: HeartBeatResult,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>,
  signalValue: number
): void {
  if (result.isPeak) {
    const now = Date.now();
    
    // Update peak time
    lastPeakTimeRef.current = now;
    
    // Request beep with amplified value for better audio response
    if (isMonitoringRef.current) {
      // Amplificar la señal para mejor respuesta de audio
      requestImmediateBeep(signalValue * 1.5);
    }
  }
}

/**
 * Updates the last valid BPM reference
 */
export function updateLastValidBpm(
  result: HeartBeatResult,
  lastValidBpmRef: React.MutableRefObject<number>
): void {
  if (result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.4) {
    lastValidBpmRef.current = result.bpm;
  }
}

/**
 * Processes low confidence results and ensures valid output
 * Enhanced with historical BPM support
 */
export function processLowConfidenceResult(
  result: HeartBeatResult,
  currentBPM: number,
  arrhythmiaCount: number
): HeartBeatResult {
  // Handle low confidence results by maintaining current BPM
  if (result.confidence < 0.3 && currentBPM > 0) {
    return {
      ...result,
      bpm: currentBPM,
      confidence: Math.max(0.3, result.confidence), // Minimum confidence to show something
      arrhythmiaCount
    };
  }
  
  // If no current BPM and low confidence, ensure arrhythmia count is preserved
  if (result.bpm === 0) {
    return {
      ...result,
      arrhythmiaCount
    };
  }
  
  return {
    ...result,
    arrhythmiaCount
  };
}
