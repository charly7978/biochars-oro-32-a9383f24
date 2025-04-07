
/**
 * Signal quality assessment module
 * Ensures accurate detection of finger presence and signal quality
 */

// State for signal quality tracking
let lastSignalValues: number[] = [];
let qualityScores: number[] = [];
let fingerDetectionBuffer: boolean[] = [];
let lastQualityTime = 0;

/**
 * Check if the signal is too weak for accurate processing
 */
export function checkWeakSignal(value: number, threshold = 0.01): boolean {
  return Math.abs(value) < threshold;
}

/**
 * Determine if a measurement should be processed based on signal quality
 */
export function shouldProcessMeasurement(value: number, quality: number): boolean {
  // Add to signal buffer
  lastSignalValues.push(value);
  if (lastSignalValues.length > 30) {
    lastSignalValues.shift();
  }
  
  // Check for sufficient quality
  return quality > 20 && !checkWeakSignal(value);
}

/**
 * Create a result object for weak signal conditions
 */
export function createWeakSignalResult() {
  return {
    timestamp: Date.now(),
    isPeak: false,
    value: 0,
    confidence: 0,
    bpm: null,
    weakSignal: true
  };
}

/**
 * Reset the signal quality assessment state
 */
export function resetSignalQualityState() {
  lastSignalValues = [];
  qualityScores = [];
  fingerDetectionBuffer = [];
  lastQualityTime = 0;
}

/**
 * Determine if a finger is detected based on signal patterns
 */
export function isFingerDetected(values: number[] = lastSignalValues): boolean {
  if (values.length < 10) return false;
  
  // Calculate signal metrics
  const min = Math.min(...values);
  const max = Math.max(...values);
  const amplitude = max - min;
  const variance = calculateVariance(values);
  
  // Criteria for finger detection
  const hasAmplitude = amplitude > 0.05;
  const hasVariance = variance > 0.0001;
  const isStable = variance < 0.1;
  
  const isDetected = hasAmplitude && hasVariance && isStable;
  
  // Add to detection buffer for stability
  fingerDetectionBuffer.push(isDetected);
  if (fingerDetectionBuffer.length > 10) {
    fingerDetectionBuffer.shift();
  }
  
  // Require majority of recent readings to indicate finger presence
  const detectionCount = fingerDetectionBuffer.filter(Boolean).length;
  return detectionCount > fingerDetectionBuffer.length / 2;
}

/**
 * Calculate variance of a set of values
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}
