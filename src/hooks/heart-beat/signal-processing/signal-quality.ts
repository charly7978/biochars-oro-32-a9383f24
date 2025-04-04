
/**
 * Signal quality assessment and finger detection module
 * Provides robust detection of finger presence with low false positive rate
 */

// Signal quality assessment state
let consecutiveWeakSignalsCount = 0;
let consecutiveStrongSignalsCount = 0;
let fingerDetectionBuffer: number[] = [];
let lastSignalQualityAssessment = 0;
let fingerDetectionState = false;
let signalVariabilityHistory: number[] = [];
let lastFingerDetectionChange = Date.now();
let signalQualityHistory: number[] = [];

/**
 * Check if the signal is too weak to process
 * Enhanced with more robust detection criteria
 */
export function checkWeakSignal(
  value: number, 
  currentWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number,
    maxWeakSignalCount: number
  }
): { isWeakSignal: boolean, updatedWeakSignalsCount: number } {
  // Enhanced threshold check with multiple criteria
  const absValue = Math.abs(value);
  const isCurrentValueWeak = absValue < config.lowSignalThreshold;
  
  // Update signal statistics for more robust detection
  fingerDetectionBuffer.push(absValue);
  if (fingerDetectionBuffer.length > 20) {
    fingerDetectionBuffer.shift();
  }
  
  // Calculate signal variability (a key indicator of finger presence)
  let variability = 0;
  if (fingerDetectionBuffer.length > 5) {
    const recentValues = fingerDetectionBuffer.slice(-5);
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Sum squared differences
    const sqDiffs = recentValues.map(val => Math.pow(val - avg, 2));
    const variance = sqDiffs.reduce((sum, val) => sum + val, 0) / recentValues.length;
    variability = Math.sqrt(variance) / Math.max(0.001, avg); // Coefficient of variation
    
    // Track variability history
    signalVariabilityHistory.push(variability);
    if (signalVariabilityHistory.length > 10) {
      signalVariabilityHistory.shift();
    }
  }
  
  // Counter-based approach with reduced false positives
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isCurrentValueWeak) {
    // Increment weak signals counter, but require more consistent weak signals
    updatedWeakSignalsCount = currentWeakSignalsCount + 1;
    consecutiveStrongSignalsCount = 0;
  } else {
    // If the signal is strong, decrease weak counter more aggressively
    // This helps quickly recognize when finger is placed back
    updatedWeakSignalsCount = Math.max(0, currentWeakSignalsCount - 2);
    consecutiveStrongSignalsCount++;
  }
  
  // Additional criteria: require sustained signal to confirm finger presence
  // This helps prevent false detections from momentary spikes
  const isWeakSignal = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  // Update finger detection state with hysteresis to prevent flickering
  // Require more evidence to change state, especially from detected to not detected
  if (!fingerDetectionState && consecutiveStrongSignalsCount > 15 && !isWeakSignal) {
    // Finger newly detected - require substantial evidence
    fingerDetectionState = true;
    lastFingerDetectionChange = Date.now();
    console.log("Signal Quality: Finger detected", {
      strongSignals: consecutiveStrongSignalsCount,
      avgStrength: getAverageSignalStrength(),
      variability
    });
  } else if (fingerDetectionState && isWeakSignal) {
    // Finger lost - be conservative to avoid false negatives
    // Only change detection state if weakness persists and variability is low
    const avgVariability = getAverageVariability();
    if (updatedWeakSignalsCount > config.maxWeakSignalCount * 1.5 && avgVariability < 0.15) {
      fingerDetectionState = false;
      lastFingerDetectionChange = Date.now();
      console.log("Signal Quality: Finger removed", {
        weakSignals: updatedWeakSignalsCount,
        avgStrength: getAverageSignalStrength(),
        avgVariability
      });
    }
  }
  
  return { 
    isWeakSignal, 
    updatedWeakSignalsCount 
  };
}

/**
 * Get average signal strength from recent measurements
 */
function getAverageSignalStrength(): number {
  if (fingerDetectionBuffer.length === 0) return 0;
  return fingerDetectionBuffer.reduce((sum, val) => sum + val, 0) / fingerDetectionBuffer.length;
}

/**
 * Get average variability from recent measurements
 */
function getAverageVariability(): number {
  if (signalVariabilityHistory.length === 0) return 0;
  return signalVariabilityHistory.reduce((sum, val) => sum + val, 0) / signalVariabilityHistory.length;
}

/**
 * Determines if signal is suitable for measurement
 * Enhanced with multi-factor analysis
 */
export function shouldProcessMeasurement(
  value: number, 
  threshold = 0.03
): boolean {
  // Multiple criteria evaluation for more robust decision
  
  // 1. Amplitude check
  const amplitudeOK = Math.abs(value) >= threshold;
  
  // 2. Signal stability check
  let stabilityOK = true;
  if (fingerDetectionBuffer.length >= 10) {
    const recentValues = fingerDetectionBuffer.slice(-10);
    const variation = calculateCoeffOfVariation(recentValues);
    stabilityOK = variation > 0.01 && variation < 0.5; // Must have some variation but not too much
  }
  
  // 3. Finger presence verification
  const fingerPresent = isFingerDetected();
  
  // Combined decision - all criteria must pass
  return amplitudeOK && stabilityOK && fingerPresent;
}

/**
 * Calculate coefficient of variation
 */
function calculateCoeffOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  
  const sumSquaredDiff = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const stdDev = Math.sqrt(sumSquaredDiff / values.length);
  
  return stdDev / mean;
}

/**
 * Creates a result object for weak signal scenarios
 * Enhanced with more diagnostic information
 */
export function createWeakSignalResult(arrhythmiaCount = 0): any {
  // Update signal quality history with zero (weak signal)
  signalQualityHistory.push(0);
  if (signalQualityHistory.length > 20) {
    signalQualityHistory.shift();
  }
  
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount,
    isArrhythmia: false,
    rrData: {
      intervals: [],
      lastPeakTime: null
    },
    // Enhanced diagnostic information for weak signal
    diagnosticData: {
      signalStrength: getAverageSignalStrength(),
      signalQuality: 'weak',
      detectionStatus: 'insufficient_signal',
      lastProcessedTime: Date.now(),
      fingerDetected: fingerDetectionState,
      averageVariability: getAverageVariability(),
      consecutiveWeakFrames: consecutiveWeakSignalsCount
    }
  };
}

/**
 * Check if finger is currently detected
 */
export function isFingerDetected(): boolean {
  return fingerDetectionState;
}

/**
 * Reset signal quality assessment state
 */
export function resetSignalQualityState(): void {
  consecutiveWeakSignalsCount = 0;
  consecutiveStrongSignalsCount = 0;
  fingerDetectionBuffer = [];
  lastSignalQualityAssessment = 0;
  fingerDetectionState = false;
  signalVariabilityHistory = [];
  lastFingerDetectionChange = Date.now();
  signalQualityHistory = [];
}
