
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal Validator
 * Validates signal data for quality and consistency
 */

/**
 * Validate signal data
 */
export function validateSignalData(data: number[]): { isValid: boolean, reason?: string } {
  // Empty data check
  if (!data || data.length === 0) {
    return { isValid: false, reason: 'Empty signal data' };
  }

  // Check for NaN or Infinity values
  for (const value of data) {
    if (isNaN(value) || !isFinite(value)) {
      return { isValid: false, reason: 'Signal contains NaN or Infinity values' };
    }
  }

  // Only compute variance for signals with enough data points
  if (data.length >= 3) {
    // Calculate variance
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    
    // Check for zero or very low variance (indicating a flat signal)
    if (variance < 0.00001) {
      return { isValid: false, reason: 'Signal has no variance (flat line)' };
    }
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Validate sample timing
 */
export function validateSampleTiming(timestamps: number[]): { isValid: boolean, reason?: string } {
  // Empty data check
  if (!timestamps || timestamps.length < 2) {
    return { isValid: true }; // Not enough data to check timing
  }

  // Check for timestamp order
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] <= timestamps[i - 1]) {
      return { isValid: false, reason: 'Timestamps not in ascending order' };
    }
  }

  // Calculate timing differences
  const diffs = [];
  for (let i = 1; i < timestamps.length; i++) {
    diffs.push(timestamps[i] - timestamps[i - 1]);
  }

  // Calculate mean and standard deviation of differences
  const mean = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
  const variance = diffs.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / diffs.length;
  const stdDev = Math.sqrt(variance);

  // Check for large variations in timing
  if (stdDev > mean * 0.5) {
    return { isValid: false, reason: 'High timing jitter detected' };
  }

  // Check for large gaps
  const maxGap = Math.max(...diffs);
  if (maxGap > mean * 3) {
    return { isValid: false, reason: 'Large timing gap detected' };
  }

  // All checks passed
  return { isValid: true };
}
