
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utility functions for signal quality evaluation
 */

/**
 * Evaluates the quality of a PPG signal
 */
export function evaluateSignalQuality(
  rawValue: number,
  filteredValue: number,
  filteredBuffer: number[],
  qualityThreshold: number = 30
): number {
  if (filteredBuffer.length < 5) {
    return 0; // Not enough data to evaluate quality
  }
  
  try {
    // Calculate basic statistics
    const recent = filteredBuffer.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // Calculate variance
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    // Calculate periodicity metrics
    let periodicityScore = calculatePeriodicityScore(recent);
    
    // Calculate noise metrics
    const noiseScore = calculateNoiseScore(rawValue, filteredValue, mean, variance);
    
    // Calculate stability
    const stabilityScore = calculateStabilityScore(recent, range);
    
    // Combine scores with appropriate weights
    const periodWeight = 0.4;
    const noiseWeight = 0.3;
    const stabilityWeight = 0.3;
    
    const qualityScore = 
      (periodicityScore * periodWeight) + 
      (noiseScore * noiseWeight) + 
      (stabilityScore * stabilityWeight);
    
    // Scale to 0-100 range
    const scaledQuality = Math.min(100, Math.max(0, qualityScore * 100));
    
    return scaledQuality;
  } catch (error) {
    console.error("Error evaluating signal quality:", error);
    return Math.max(0, qualityThreshold / 2); // Fallback to moderate quality
  }
}

/**
 * Calculates a score for the periodicity of the signal
 */
function calculatePeriodicityScore(values: number[]): number {
  if (values.length < 6) return 0;
  
  // Count zero crossings
  let crossings = 0;
  const meanShifted = values.map(v => v - (values.reduce((a, b) => a + b, 0) / values.length));
  
  for (let i = 1; i < meanShifted.length; i++) {
    if ((meanShifted[i] >= 0 && meanShifted[i-1] < 0) || 
        (meanShifted[i] < 0 && meanShifted[i-1] >= 0)) {
      crossings++;
    }
  }
  
  // Ideal number of crossings depends on sampling rate and expected heart rate
  // For a 30Hz sampling rate and 60BPM, we expect about 1 crossing per second
  // So in 10 samples (1/3 second), we might expect 1-3 crossings for good quality
  if (crossings < 1) return 0.2; // Too few - likely flat line or very slow
  if (crossings > 5) return 0.3; // Too many - likely noisy
  
  // Optimal range - likely good periodic signal
  return 0.8 + ((3 - Math.abs(crossings - 3)) * 0.05);
}

/**
 * Calculates a score for the noise level in the signal
 */
function calculateNoiseScore(
  rawValue: number,
  filteredValue: number,
  mean: number,
  variance: number
): number {
  // Calculate difference between raw and filtered
  const filteringDelta = Math.abs(rawValue - filteredValue) / Math.max(0.001, Math.abs(mean));
  
  // Reasonable noise level
  if (filteringDelta < 0.1) return 0.9; // Very little filtering needed - clean signal
  if (filteringDelta < 0.2) return 0.7; // Moderate filtering - good signal
  if (filteringDelta < 0.4) return 0.5; // Significant filtering - noisy signal
  return 0.3; // Heavy filtering - very noisy
}

/**
 * Calculates a score for the stability of the signal
 */
function calculateStabilityScore(values: number[], range: number): number {
  if (values.length < 3) return 0.5; // Not enough data
  
  // Calculate consecutive differences
  const diffs = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(Math.abs(values[i] - values[i-1]));
  }
  
  // Calculate mean and max difference
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const maxDiff = Math.max(...diffs);
  
  // Normalize by signal range
  const normalizedMeanDiff = meanDiff / Math.max(0.001, range);
  const normalizedMaxDiff = maxDiff / Math.max(0.001, range);
  
  // Score based on normalized differences
  if (normalizedMaxDiff > 0.8) return 0.3; // Large spikes - unstable
  if (normalizedMeanDiff > 0.3) return 0.5; // Significant variations - moderate stability
  if (normalizedMeanDiff > 0.1) return 0.7; // Moderate variations - good stability
  return 0.9; // Small variations - excellent stability
}
