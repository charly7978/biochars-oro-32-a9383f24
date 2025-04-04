
/**
 * Signal normalization utilities
 */

/**
 * Normalizes signal values to range [0, 1]
 * @param values Array of signal values
 * @param minValue Optional minimum value (defaults to min in array)
 * @param maxValue Optional maximum value (defaults to max in array)
 * @returns Normalized values
 */
export function normalizeSignal(values: number[], minValue?: number, maxValue?: number): number[] {
  if (values.length === 0) return [];
  
  const min = minValue !== undefined ? minValue : Math.min(...values);
  const max = maxValue !== undefined ? maxValue : Math.max(...values);
  
  if (max === min) return values.map(() => 0.5);
  
  return values.map(value => (value - min) / (max - min));
}

/**
 * Apply a moving average filter to smooth signal
 * @param values Signal values to smooth
 * @param windowSize Window size for moving average
 * @returns Smoothed values
 */
export function smoothSignal(values: number[], windowSize: number = 5): number[] {
  if (values.length === 0) return [];
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    
    // Calculate window bounds
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length - 1, i + Math.floor(windowSize / 2));
    
    // Calculate average within window
    for (let j = start; j <= end; j++) {
      sum += values[j];
      count++;
    }
    
    result.push(sum / count);
  }
  
  return result;
}

/**
 * Zero-centers a signal by subtracting the mean
 * @param values Signal values
 * @returns Zero-centered values
 */
export function centerSignal(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  return values.map(v => v - mean);
}

/**
 * Amplify signal values
 * @param values Signal values
 * @param factor Amplification factor
 * @returns Amplified values
 */
export function amplifySignal(values: number[], factor: number = 1.5): number[] {
  return values.map(v => v * factor);
}
