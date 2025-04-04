
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

/**
 * Apply Gaussian smoothing to signal
 * @param values Signal values
 * @param sigma Standard deviation of Gaussian kernel
 * @returns Smoothed values
 */
export function gaussianSmooth(values: number[], sigma: number = 1.0): number[] {
  if (values.length === 0) return [];
  
  // Create Gaussian kernel
  const kernelSize = Math.max(3, Math.ceil(sigma * 3) * 2 + 1);
  const kernel: number[] = [];
  const center = Math.floor(kernelSize / 2);
  
  let sum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - center;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }
  
  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }
  
  // Apply convolution
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let weightedSum = 0;
    let kernelSum = 0;
    
    for (let j = 0; j < kernelSize; j++) {
      const idx = i - center + j;
      if (idx >= 0 && idx < values.length) {
        weightedSum += values[idx] * kernel[j];
        kernelSum += kernel[j];
      }
    }
    
    result.push(kernelSum > 0 ? weightedSum / kernelSum : values[i]);
  }
  
  return result;
}

/**
 * Apply median filter to remove outliers
 * @param values Signal values
 * @param windowSize Window size for median filter (odd number)
 * @returns Filtered values
 */
export function medianFilter(values: number[], windowSize: number = 5): number[] {
  if (values.length === 0) return [];
  
  // Ensure window size is odd
  const actualWindowSize = windowSize % 2 === 0 ? windowSize + 1 : windowSize;
  const radius = Math.floor(actualWindowSize / 2);
  
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const windowValues: number[] = [];
    
    // Collect values within window
    for (let j = i - radius; j <= i + radius; j++) {
      if (j >= 0 && j < values.length) {
        windowValues.push(values[j]);
      }
    }
    
    // Sort values and get median
    windowValues.sort((a, b) => a - b);
    const median = windowValues[Math.floor(windowValues.length / 2)];
    result.push(median);
  }
  
  return result;
}
