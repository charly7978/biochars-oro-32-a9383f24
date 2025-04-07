
/**
 * Signal quality assessment functions
 */

/**
 * Check if a signal is too weak to be processed
 */
export function checkWeakSignal(value: number, consecutiveWeakSignals: number) {
  const THRESHOLD = 0.005;
  const MAX_CONSECUTIVE = 10;

  const isWeakSignal = Math.abs(value) < THRESHOLD;
  
  const updatedCount = isWeakSignal 
    ? consecutiveWeakSignals + 1 
    : 0;
  
  return {
    isWeakSignal: updatedCount >= MAX_CONSECUTIVE,
    updatedCount
  };
}

/**
 * Create a weak signal result
 */
export function createWeakSignalResult(arrhythmiaCount: number = 0) {
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
 * Check if a measurement has enough amplitude for processing
 */
export function shouldProcessMeasurement(value: number) {
  return Math.abs(value) >= 0.01;
}

/**
 * Check if a finger is detected based on signal quality
 */
export function isFingerDetected(quality: number, threshold: number = 30) {
  return quality >= threshold;
}

/**
 * Reset signal quality state
 */
export function resetSignalQualityState() {
  // Reset any internal counters or quality metrics
  console.log("Signal quality state reset");
}
