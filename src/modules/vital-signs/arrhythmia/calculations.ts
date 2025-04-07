
/**
 * Utility functions for arrhythmia calculations
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * A common measure for heart rate variability
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
 * Calculate coefficient of variation for RR intervals
 * Higher values indicate more variability
 */
export function calculateRRVariation(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  let sumSquaredDeviations = 0;
  for (let i = 0; i < intervals.length; i++) {
    const deviation = intervals[i] - mean;
    sumSquaredDeviations += deviation * deviation;
  }
  
  const standardDeviation = Math.sqrt(sumSquaredDeviations / intervals.length);
  return (standardDeviation / mean) * 100;
}

/**
 * Check if heart rate is outside normal range
 */
export function isAbnormalHeartRate(bpm: number): boolean {
  return bpm < 40 || bpm > 150;
}

/**
 * Detect if intervals show premature beats
 */
export function detectPrematureBeats(intervals: number[]): boolean {
  if (intervals.length < 3) return false;
  
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  for (let i = 0; i < intervals.length; i++) {
    // A premature beat typically causes one interval to be much shorter
    // and the next one to be longer
    if (intervals[i] < mean * 0.7) {
      return true;
    }
  }
  
  return false;
}
