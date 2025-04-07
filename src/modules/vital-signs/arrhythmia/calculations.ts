
/**
 * Calculations for arrhythmia detection
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * Measures short-term variability in RR intervals
 */
export function calculateRMSSD(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  
  let sumSquaredDiffs = 0;
  for (let i = 1; i < intervals.length; i++) {
    const diff = intervals[i] - intervals[i-1];
    sumSquaredDiffs += diff * diff;
  }
  
  return Math.sqrt(sumSquaredDiffs / (intervals.length - 1));
}

/**
 * Calculate RR variation as coefficient of variation
 * Measures overall variability in RR intervals
 */
export function calculateRRVariation(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  let sumSquaredDeviations = 0;
  
  for (let i = 0; i < intervals.length; i++) {
    const deviation = intervals[i] - mean;
    sumSquaredDeviations += deviation * deviation;
  }
  
  // Calculate coefficient of variation
  const standardDeviation = Math.sqrt(sumSquaredDeviations / intervals.length);
  return (standardDeviation / mean) * 100;
}
