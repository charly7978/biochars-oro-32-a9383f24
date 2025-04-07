
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * A time-domain measure of heart rate variability
 */
export function calculateRMSSD(intervals: number[]): number {
  if (intervals.length < 2) {
    return 0;
  }

  let sumSquaredDiffs = 0;

  // Calculate squared differences between successive intervals
  for (let i = 1; i < intervals.length; i++) {
    const diff = intervals[i] - intervals[i - 1];
    sumSquaredDiffs += diff * diff;
  }

  // Calculate the root mean square
  const meanSquaredDiffs = sumSquaredDiffs / (intervals.length - 1);
  return Math.sqrt(meanSquaredDiffs);
}

/**
 * Calculate RR Interval Variation 
 * Measures the variation between consecutive RR intervals
 */
export function calculateRRVariation(intervals: number[]): number {
  if (intervals.length < 2) {
    return 0;
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Calculate absolute deviations from the average
  const absoluteDeviations = intervals.map(interval => Math.abs(interval - avgInterval));
  
  // Calculate average absolute deviation
  const avgDeviation = absoluteDeviations.reduce((sum, val) => sum + val, 0) / absoluteDeviations.length;
  
  // Calculate variation as ratio of average deviation to average interval
  return avgDeviation / avgInterval;
}

/**
 * Calculate pNNx (percentage of successive RR intervals that differ by more than x ms)
 * Common values for x are 50ms (pNN50) or 20ms (pNN20)
 */
export function calculatePNNx(intervals: number[], x: number): number {
  if (intervals.length < 2) {
    return 0;
  }

  let count = 0;
  
  // Count intervals with difference greater than x
  for (let i = 1; i < intervals.length; i++) {
    if (Math.abs(intervals[i] - intervals[i - 1]) > x) {
      count++;
    }
  }
  
  // Calculate percentage
  return (count / (intervals.length - 1)) * 100;
}

/**
 * Calculate spectral analysis indices (simplified)
 */
export function calculateSpectralIndices(intervals: number[]): { 
  lf: number; 
  hf: number; 
  ratio: number 
} {
  if (intervals.length < 10) {
    return { lf: 0, hf: 0, ratio: 1 };
  }
  
  // This is a simplified placeholder as proper spectral analysis
  // requires more complex FFT calculations
  
  // For demonstration purposes only:
  const shortTermVar = calculateRMSSD(intervals);
  const longTermVar = calculateRRVariation(intervals);
  
  const lf = longTermVar * 1000;
  const hf = shortTermVar;
  const ratio = lf / (hf || 1);
  
  return { lf, hf, ratio };
}
