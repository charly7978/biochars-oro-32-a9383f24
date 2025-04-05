
/**
 * Utility functions for vital signs processing
 */

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Apply Simple Moving Average filter
 */
export function applySMAFilter(values: number[], windowSize: number = 5): number[] {
  if (values.length < windowSize) return [...values];
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      // For initial values, use partial window
      const partialWindow = values.slice(0, i + 1);
      const sum = partialWindow.reduce((a, b) => a + b, 0);
      result.push(sum / partialWindow.length);
    } else {
      // For remaining values, use full window
      const window = values.slice(i - windowSize + 1, i + 1);
      const sum = window.reduce((a, b) => a + b, 0);
      result.push(sum / windowSize);
    }
  }
  
  return result;
}
