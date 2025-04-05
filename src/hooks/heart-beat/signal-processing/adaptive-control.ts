
/**
 * Functions for adaptive signal control and enhancement
 */

// Initialize state for adaptive signal processing
let adaptiveData: {
  history: { time: number, value: number, quality: number }[];
  calibration: { gain: number, offset: number };
  lastPrediction: { value: number, confidence: number, time: number };
} = {
  history: [],
  calibration: { gain: 1.0, offset: 0.0 },
  lastPrediction: { value: 0, confidence: 0, time: 0 }
};

const MAX_HISTORY = 30;
const DEFAULT_ALPHA = 0.2;

/**
 * Apply adaptive filtering to a signal value
 */
export function applyAdaptiveFilter(
  value: number, 
  timestamp: number, 
  quality: number = 1.0,
  alpha: number = DEFAULT_ALPHA
): number {
  // Apply EMA filter with quality-adjusted alpha
  const adjustedAlpha = alpha * Math.max(0.5, quality);
  
  // Get previous value
  const previousValue = adaptiveData.history.length > 0
    ? adaptiveData.history[adaptiveData.history.length - 1].value
    : value;
  
  // Apply filter
  const filteredValue = adjustedAlpha * value + (1 - adjustedAlpha) * previousValue;
  
  // Store in history
  adaptiveData.history.push({ time: timestamp, value: filteredValue, quality });
  if (adaptiveData.history.length > MAX_HISTORY) {
    adaptiveData.history.shift();
  }
  
  return filteredValue;
}

/**
 * Predict the next signal value
 */
export function predictNextValue(
  futureTimestamp: number
): { prediction: number; confidence: number } {
  if (adaptiveData.history.length < 5) {
    return { prediction: 0, confidence: 0 };
  }
  
  // Simple linear prediction
  const latest = adaptiveData.history.slice(-5);
  const timeDeltas = latest.map(p => p.time).map((t, i, arr) => i > 0 ? t - arr[i - 1] : 0).slice(1);
  const valueDeltas = latest.map(p => p.value).map((v, i, arr) => i > 0 ? v - arr[i - 1] : 0).slice(1);
  
  // Average rate of change
  const avgTimeDelta = timeDeltas.reduce((a, b) => a + b, 0) / timeDeltas.length;
  const avgValueDelta = valueDeltas.reduce((a, b) => a + b, 0) / valueDeltas.length;
  
  if (avgTimeDelta === 0) {
    return { prediction: latest[latest.length - 1].value, confidence: 0.5 };
  }
  
  // Rate of change per millisecond
  const rateOfChange = avgValueDelta / avgTimeDelta;
  
  // Predict future value
  const latestPoint = latest[latest.length - 1];
  const timeToFuture = futureTimestamp - latestPoint.time;
  const prediction = latestPoint.value + rateOfChange * timeToFuture;
  
  // Calculate confidence based on quality and consistency
  const avgQuality = latest.reduce((sum, p) => sum + p.quality, 0) / latest.length;
  const valueVariance = calculateVariance(latest.map(p => p.value));
  
  // Low variance means more consistent readings = higher confidence
  const consistencyFactor = Math.exp(-valueVariance * 5);
  const confidence = avgQuality * 0.7 + consistencyFactor * 0.3;
  
  // Store prediction
  adaptiveData.lastPrediction = {
    value: prediction,
    confidence,
    time: futureTimestamp
  };
  
  return { prediction, confidence };
}

/**
 * Calculate variance of a set of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

/**
 * Correct anomalies in the signal
 */
export function correctSignalAnomalies(
  value: number,
  timestamp: number,
  quality: number = 1.0
): { correctedValue: number, anomalyDetected: boolean } {
  if (adaptiveData.history.length < 3) {
    return { correctedValue: value, anomalyDetected: false };
  }
  
  // Get recent values
  const recent = adaptiveData.history.slice(-3);
  const mean = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
  const stdDev = Math.sqrt(calculateVariance(recent.map(p => p.value)));
  
  // Check if current value is an outlier
  const zScore = Math.abs(value - mean) / (stdDev > 0 ? stdDev : 1);
  const isOutlier = zScore > 2.5; // Z-score of 2.5 = 99% confidence
  
  // Calculate corrected value
  let correctedValue = value;
  if (isOutlier) {
    // Use a weighted average of the value and mean based on quality
    correctedValue = value * (1 - quality) + mean * quality;
  }
  
  return { correctedValue, anomalyDetected: isOutlier };
}

/**
 * Update signal quality using prediction
 */
export function updateQualityWithPrediction(
  value: number,
  timestamp: number,
  currentQuality: number
): number {
  // If we don't have a recent prediction, return current quality
  if (adaptiveData.lastPrediction.time === 0 || 
      timestamp - adaptiveData.lastPrediction.time > 200) {
    return currentQuality;
  }
  
  // Compare actual value to prediction
  const prediction = adaptiveData.lastPrediction.value;
  const predictionQuality = adaptiveData.lastPrediction.confidence;
  
  // Calculate difference as percentage of prediction
  const diff = Math.abs(value - prediction);
  const diffPercent = prediction !== 0 ? diff / Math.abs(prediction) : 1;
  
  // If prediction was good, boost quality; otherwise, reduce it
  let newQuality = currentQuality;
  if (diffPercent < 0.2) {
    // Good prediction, boost quality
    newQuality = currentQuality * 0.8 + 0.2 * Math.min(1.0, 1.0 - diffPercent);
  } else if (diffPercent > 0.5) {
    // Bad prediction, reduce quality
    newQuality = currentQuality * 0.8;
  }
  
  // Scale by prediction confidence
  newQuality = newQuality * 0.7 + currentQuality * 0.3 * predictionQuality;
  
  return Math.min(1.0, Math.max(0.0, newQuality));
}

/**
 * Reset adaptive control state
 */
export function resetAdaptiveControl(): void {
  adaptiveData = {
    history: [],
    calibration: { gain: 1.0, offset: 0.0 },
    lastPrediction: { value: 0, confidence: 0, time: 0 }
  };
}

/**
 * Get the current state of the adaptive model
 */
export function getAdaptiveModelState(): any {
  return { ...adaptiveData };
}

/**
 * Apply Bayesian optimization (stub function for compatibility)
 */
export function applyBayesianOptimization(value: number): number {
  return value; // Placeholder implementation
}

/**
 * Apply Gaussian process modeling (stub function for compatibility)
 */
export function applyGaussianProcessModeling(value: number): number {
  return value; // Placeholder implementation
}

/**
 * Apply mixed model prediction (stub function for compatibility)
 */
export function applyMixedModelPrediction(value: number): number {
  return value; // Placeholder implementation
}
