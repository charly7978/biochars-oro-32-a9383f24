/**
 * Signal quality and validation utilities
 */

/**
 * Check if signal is too weak to process
 */
export const checkWeakSignal = (
  value: number, 
  consecutiveWeakSignals: number, 
  config: {
    lowSignalThreshold: number;
    maxWeakSignalCount: number;
  }
) => {
  const isWeakSignal = Math.abs(value) < config.lowSignalThreshold;
  let updatedWeakSignalsCount = isWeakSignal ? 
    consecutiveWeakSignals + 1 : 
    Math.max(0, consecutiveWeakSignals - 1);
    
  const isTooLong = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  return {
    isWeakSignal: isWeakSignal && isTooLong,
    updatedWeakSignalsCount
  };
};

/**
 * Check if we should process this measurement
 */
export const shouldProcessMeasurement = (value: number) => {
  return Math.abs(value) >= 0.05;
};

/**
 * Create a weak signal result
 */
export const createWeakSignalResult = (arrhythmiaCount: number = 0) => {
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
};

/**
 * Reset the signal quality state
 */
export const resetSignalQualityState = () => {
  // Reset implementation
};

/**
 * Check if a finger is detected
 */
export const isFingerDetected = (
  value: number, 
  quality: number, 
  thresholds: { 
    minValue: number; 
    minQuality: number; 
  }
) => {
  return Math.abs(value) >= thresholds.minValue && quality >= thresholds.minQuality;
};
