
/**
 * Shared utility functions for signal processing
 */

/**
 * Calculate AC component of a signal
 */
export const calculateAC = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max - min;
};

/**
 * Calculate DC component of a signal
 */
export const calculateDC = (values: number[]): number => {
  if (values.length < 1) return 0;
  
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculate standard deviation
 */
export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
};

/**
 * Calculate exponential moving average
 */
export const calculateEMA = (currentValue: number, previousEMA: number | null, alpha: number = 0.2): number => {
  if (previousEMA === null) return currentValue;
  
  return alpha * currentValue + (1 - alpha) * previousEMA;
};

/**
 * Normalize a value to a 0-1 range
 */
export const normalizeValue = (
  value: number, 
  min: number = 0, 
  max: number = 1
): number => {
  if (max <= min) return 0.5;
  
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Detect peaks in a signal
 */
export const findPeaksAndValleys = (
  values: number[], 
  windowSize: number = 3
): { peaks: number[], valleys: number[] } => {
  const peaks: number[] = [];
  const valleys: number[] = [];
  
  if (values.length < windowSize * 2 + 1) {
    return { peaks, valleys };
  }
  
  for (let i = windowSize; i < values.length - windowSize; i++) {
    const current = values[i];
    const window = values.slice(i - windowSize, i + windowSize + 1);
    
    if (current === Math.max(...window)) {
      peaks.push(i);
    } else if (current === Math.min(...window)) {
      valleys.push(i);
    }
  }
  
  return { peaks, valleys };
};

/**
 * Calculate amplitude of a signal
 */
export const calculateAmplitude = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  return Math.max(...values) - Math.min(...values);
};

/**
 * Apply simple moving average filter
 */
export const applySMAFilter = (values: number[], windowSize: number = 5): number[] => {
  if (values.length < windowSize) return [...values];
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(values[i]);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += values[i - j];
    }
    
    result.push(sum / windowSize);
  }
  
  return result;
};

/**
 * Amplify a signal value
 */
export const amplifySignal = (value: number, factor: number = 1.5): number => {
  return value * factor;
};

/**
 * Calculate perfusion index
 */
export const calculatePerfusionIndex = (ac: number, dc: number): number => {
  if (dc === 0) return 0;
  return (ac / dc) * 100;
};
