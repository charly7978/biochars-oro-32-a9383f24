
/**
 * Functions for signal quality assessment
 */

import { ResetHandle } from '../../../types/reset';

// State for signal quality tracking
let consecutiveWeakSignals = 0;
let lastFingerDetected = false;
const MAX_WEAK_SIGNALS = 3;
const WEAK_SIGNAL_THRESHOLD = 0.15;

/**
 * Checks if a signal is too weak to process
 */
export function checkWeakSignal(
  value: number, 
  currentWeakSignalCount: number, 
  options: { 
    lowSignalThreshold?: number,
    maxWeakSignalCount?: number
  } = {}
): { isWeakSignal: boolean, updatedWeakSignalsCount: number } {
  // Use options or defaults
  const lowSignalThreshold = options.lowSignalThreshold || WEAK_SIGNAL_THRESHOLD;
  const maxWeakSignalCount = options.maxWeakSignalCount || MAX_WEAK_SIGNALS;
  
  let updatedCount = currentWeakSignalCount;
  
  // Check if signal is below threshold
  const isCurrentSignalWeak = Math.abs(value) < lowSignalThreshold;
  
  if (isCurrentSignalWeak) {
    updatedCount++;
  } else {
    updatedCount = Math.max(0, updatedCount - 1);
  }
  
  // Signal is considered weak if we have too many consecutive weak signals
  const isWeakSignal = updatedCount >= maxWeakSignalCount;
  
  return {
    isWeakSignal,
    updatedWeakSignalsCount: updatedCount
  };
}

/**
 * Determines if a measurement should be processed based on signal strength
 */
export function shouldProcessMeasurement(value: number): boolean {
  // Signal should be strong enough to process
  return Math.abs(value) >= 0.008;
}

/**
 * Creates default signal processing result when signal is too weak
 */
export function createWeakSignalResult(arrhythmiaCounter: number = 0): any {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount: arrhythmiaCounter || 0,
    rrData: {
      intervals: [],
      lastPeakTime: null
    },
    isArrhythmia: false
  };
}

/**
 * Detects if a finger is present based on signal quality
 */
export function isFingerDetected(value: number, threshold: number = WEAK_SIGNAL_THRESHOLD): boolean {
  if (Math.abs(value) < threshold) {
    consecutiveWeakSignals++;
  } else {
    consecutiveWeakSignals = Math.max(0, consecutiveWeakSignals - 1);
  }
  
  // Update finger detection state
  lastFingerDetected = consecutiveWeakSignals < MAX_WEAK_SIGNALS;
  
  return lastFingerDetected;
}

/**
 * Reset signal quality state
 */
export function resetSignalQualityState(): void {
  consecutiveWeakSignals = 0;
  lastFingerDetected = false;
}

// ResetHandle implementation
export const signalQualityReset: ResetHandle = {
  reset: resetSignalQualityState
};
