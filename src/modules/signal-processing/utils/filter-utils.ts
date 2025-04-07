
/**
 * Common filter utilities for signal processing
 */

/**
 * Apply a Simple Moving Average (SMA) filter to an array of values
 * @param values Array of values to filter
 * @param windowSize Size of the moving average window
 * @returns Filtered values
 */
export function applySMAFilter(values: number[], windowSize: number = 5): number[] {
  if (values.length <= 1) return values;
  if (windowSize <= 1) return values;
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    
    // Calculate window bounds
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length - 1, i + Math.floor(windowSize / 2));
    
    // Sum values in window
    for (let j = start; j <= end; j++) {
      sum += values[j];
      count++;
    }
    
    // Calculate average
    result.push(sum / count);
  }
  
  return result;
}

/**
 * Amplify signal by a given factor
 * @param values Values to amplify
 * @param factor Amplification factor
 * @returns Amplified values
 */
export function amplifySignal(values: number[], factor: number = 1.5): number[] {
  return values.map(value => value * factor);
}

/**
 * Apply band-pass filter to signal
 * Simple implementation for direct measurement only
 * @param values Signal values
 * @param minFreq Minimum frequency (normalized 0-1)
 * @param maxFreq Maximum frequency (normalized 0-1)
 * @returns Filtered values
 */
export function applyBandPassFilter(
  values: number[], 
  minFreq: number = 0.1, 
  maxFreq: number = 0.4
): number[] {
  // For direct measurement, we use a simplified approach
  // In a real implementation, this would use FFT or IIR filters
  
  // Apply a combination of low and high pass filters
  const highPassFiltered = applyHighPassFilter(values, minFreq);
  return applyLowPassFilter(highPassFiltered, maxFreq);
}

/**
 * Apply a simple high-pass filter (removes low frequencies)
 */
function applyHighPassFilter(values: number[], cutoff: number): number[] {
  if (values.length <= 1) return values;
  
  // Simple RC high-pass filter approximation
  const alpha = cutoff / (cutoff + 1);
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const filtered = alpha * (result[i - 1] + values[i] - values[i - 1]);
    result.push(filtered);
  }
  
  return result;
}

/**
 * Apply a simple low-pass filter (removes high frequencies)
 */
function applyLowPassFilter(values: number[], cutoff: number): number[] {
  if (values.length <= 1) return values;
  
  // Simple RC low-pass filter approximation
  const alpha = 1 / (1 + cutoff);
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const filtered = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(filtered);
  }
  
  return result;
}

/**
 * Apply a Savitzky-Golay filter for smoothing
 * This is a more sophisticated filter that preserves peaks better
 */
export function applySavitzkyGolayFilter(values: number[], windowSize: number = 5): number[] {
  if (values.length <= windowSize) return values;
  if (windowSize % 2 === 0) windowSize++; // Ensure odd window size
  
  const halfWindow = Math.floor(windowSize / 2);
  const result = [...values];
  
  // Simple implementation for direct measurement
  for (let i = halfWindow; i < values.length - halfWindow; i++) {
    let sum = 0;
    
    // Apply quadratic weighting (simplified Savitzky-Golay)
    for (let j = -halfWindow; j <= halfWindow; j++) {
      // Weight is higher in the middle, lower at edges
      const weight = 1 - Math.abs(j) / (halfWindow + 1);
      sum += values[i + j] * weight;
    }
    
    result[i] = sum / halfWindow;
  }
  
  return result;
}
