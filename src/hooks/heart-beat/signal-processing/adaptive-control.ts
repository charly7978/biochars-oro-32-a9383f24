
/**
 * Advanced adaptive control for signal processing
 * Includes Bayesian optimization and Gaussian modeling
 */
import React from 'react';

/**
 * Apply adaptive filtering to signal value
 */
export function applyAdaptiveFilter(value: number, buffer: number[]): number {
  if (buffer.length < 2) return value;
  
  // Weight recent values more heavily
  let weightedSum = value * 0.6;
  let weightSum = 0.6;
  
  // Add contributions from buffer with diminishing weights
  for (let i = buffer.length - 1; i >= Math.max(0, buffer.length - 5); i--) {
    const weight = 0.4 * (1 - (buffer.length - 1 - i) / 5);
    weightedSum += buffer[i] * weight;
    weightSum += weight;
  }
  
  return weightedSum / weightSum;
}

/**
 * Predict next value based on trend analysis
 */
export function predictNextValue(buffer: number[]): number {
  if (buffer.length < 3) return 0;
  
  // Use linear regression on recent values
  const recentValues = buffer.slice(-5);
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < recentValues.length; i++) {
    sumX += i;
    sumY += recentValues[i];
    sumXY += i * recentValues[i];
    sumX2 += i * i;
  }
  
  const n = recentValues.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next value
  return intercept + slope * n;
}

/**
 * Correct signal anomalies using adaptive thresholding
 */
export function correctSignalAnomalies(value: number, buffer: number[]): number {
  if (buffer.length < 5) return value;
  
  const recentValues = buffer.slice(-5);
  const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  const stdDev = Math.sqrt(
    recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length
  );
  
  // Use adaptive thresholds based on recent signal statistics
  const lowerThreshold = mean - 2.5 * stdDev;
  const upperThreshold = mean + 2.5 * stdDev;
  
  if (value < lowerThreshold) {
    return lowerThreshold + (value - lowerThreshold) * 0.3;
  } else if (value > upperThreshold) {
    return upperThreshold + (value - upperThreshold) * 0.3;
  }
  
  return value;
}

/**
 * Update signal quality estimation based on prediction accuracy
 */
export function updateQualityWithPrediction(
  predicted: number, 
  actual: number, 
  currentQuality: number
): number {
  const error = Math.abs(predicted - actual);
  const maxAllowedError = 0.15;
  
  // Calculate accuracy as inverse of normalized error
  const accuracy = Math.max(0, 1 - error / maxAllowedError);
  
  // Update quality with slow adaptation
  return currentQuality * 0.8 + accuracy * 0.2;
}

// Adaptive control state
let adaptiveModelState = {
  filterStrength: 0.3,
  amplificationFactor: 1.5,
  qualityThreshold: 0.4,
  lastResetTime: Date.now()
};

/**
 * Reset adaptive control parameters
 */
export function resetAdaptiveControl(): void {
  adaptiveModelState = {
    filterStrength: 0.3,
    amplificationFactor: 1.5,
    qualityThreshold: 0.4,
    lastResetTime: Date.now()
  };
}

/**
 * Get current adaptive model state
 */
export function getAdaptiveModelState(): typeof adaptiveModelState {
  return { ...adaptiveModelState };
}

/**
 * Apply Bayesian optimization for parameter tuning
 * Improves signal processing based on recent performance
 */
export function applyBayesianOptimization(
  signalQuality: number,
  detectionSuccess: boolean
): void {
  // Adjust filter strength based on signal quality
  if (signalQuality < 0.4) {
    // For low quality signals, increase filtering
    adaptiveModelState.filterStrength = Math.min(0.6, adaptiveModelState.filterStrength + 0.02);
  } else {
    // For high quality signals, reduce filtering
    adaptiveModelState.filterStrength = Math.max(0.2, adaptiveModelState.filterStrength - 0.01);
  }
  
  // Adjust amplification based on detection success
  if (detectionSuccess) {
    // Successful detection, slightly reduce amplification
    adaptiveModelState.amplificationFactor = Math.max(
      1.2, adaptiveModelState.amplificationFactor * 0.99
    );
  } else {
    // Failed detection, increase amplification
    adaptiveModelState.amplificationFactor = Math.min(
      2.0, adaptiveModelState.amplificationFactor * 1.03
    );
  }
  
  // Update quality threshold adaptively
  adaptiveModelState.qualityThreshold = 0.35 + signalQuality * 0.1;
}

/**
 * Apply Gaussian Process Modeling for signal prediction
 */
export function applyGaussianProcessModeling(buffer: number[]): {
  predictedValue: number;
  confidenceInterval: [number, number];
} {
  if (buffer.length < 5) {
    return {
      predictedValue: 0,
      confidenceInterval: [0, 0]
    };
  }
  
  // Simple implementation using weighted average and variance
  const recentValues = buffer.slice(-5);
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // Increasing weights for more recent values
  
  let weightedSum = 0;
  for (let i = 0; i < recentValues.length; i++) {
    weightedSum += recentValues[i] * weights[i];
  }
  
  const predictedValue = weightedSum;
  
  // Calculate variance for confidence interval
  const variance = recentValues.reduce(
    (sum, val) => sum + Math.pow(val - predictedValue, 2), 0
  ) / recentValues.length;
  
  const stdDev = Math.sqrt(variance);
  const confidenceInterval: [number, number] = [
    predictedValue - 1.96 * stdDev,
    predictedValue + 1.96 * stdDev
  ];
  
  return {
    predictedValue,
    confidenceInterval
  };
}

/**
 * Apply Mixed Model Prediction for enhancing arrhythmia detection
 * Added specifically for improved arrhythmia detection accuracy
 */
export function applyMixedModelPrediction(
  signal: number[],
  rrIntervals: number[]
): {
  isLikelyArrhythmia: boolean;
  confidence: number;
  predictionWindow: number;
} {
  if (signal.length < 8 || rrIntervals.length < 3) {
    return {
      isLikelyArrhythmia: false,
      confidence: 0,
      predictionWindow: 0
    };
  }
  
  // Calculate RR interval variability
  const rrDiffs = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    rrDiffs.push(Math.abs(rrIntervals[i] - rrIntervals[i-1]));
  }
  
  // Get average RR difference
  const avgRRDiff = rrDiffs.reduce((sum, val) => sum + val, 0) / rrDiffs.length;
  
  // Calculate arrhythmia probability from RR variability
  // Increased variability suggests arrhythmia
  const rrVariability = avgRRDiff / (rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length);
  
  // Calculate signal irregularity
  const signalDiffs = [];
  for (let i = 1; i < signal.length; i++) {
    signalDiffs.push(Math.abs(signal[i] - signal[i-1]));
  }
  
  // Normalized signal variability
  const avgSignalDiff = signalDiffs.reduce((sum, val) => sum + val, 0) / signalDiffs.length;
  const maxSignalDiff = Math.max(...signalDiffs);
  const signalIrregularity = avgSignalDiff / maxSignalDiff;
  
  // Combined model using both indicators
  // Weights favor RR intervals which are more reliable indicators
  const arrhythmiaProbability = rrVariability * 0.7 + signalIrregularity * 0.3;
  
  // Decision threshold - improved for better discrimination
  const isLikelyArrhythmia = arrhythmiaProbability > 0.18; // Lowered threshold for increased sensitivity
  
  // Confidence based on available data
  const confidenceFromRRCount = Math.min(1, rrIntervals.length / 10);
  const confidenceFromSignalLength = Math.min(1, signal.length / 20);
  const confidence = Math.min(confidenceFromRRCount, confidenceFromSignalLength);
  
  // Prediction window: time to wait before resetting prediction
  const predictionWindow = isLikelyArrhythmia ? 1200 : 600;
  
  return {
    isLikelyArrhythmia,
    confidence: confidence * (isLikelyArrhythmia ? 0.95 : 0.8), // Higher confidence for positive predictions
    predictionWindow
  };
}
