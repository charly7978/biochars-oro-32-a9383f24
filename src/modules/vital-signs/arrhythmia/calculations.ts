
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * A standard HRV metric based on RR intervals
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
 * Calculate RR variation as coefficient of variation (CV)
 * Expressed as a percentage
 */
export function calculateRRVariation(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  if (mean === 0) return 0;
  
  let sumSquaredDeviations = 0;
  
  for (let i = 0; i < intervals.length; i++) {
    const deviation = intervals[i] - mean;
    sumSquaredDeviations += deviation * deviation;
  }
  
  // Calculate coefficient of variation
  const standardDeviation = Math.sqrt(sumSquaredDeviations / intervals.length);
  return (standardDeviation / mean) * 100;
}

/**
 * Check if an interval represents a potential arrhythmia based on deviation
 */
export function isAbnormalInterval(interval: number, avgInterval: number): boolean {
  if (avgInterval === 0) return false;
  
  const variation = Math.abs(interval - avgInterval) / avgInterval * 100;
  return variation > 30; // 30% deviation threshold
}

/**
 * Enforce physiological constraints on heart rate intervals
 * Filter out impossible values
 */
export function filterPhysiologicalIntervals(intervals: number[]): number[] {
  // Only accept intervals that correspond to heart rates between 30-200 BPM
  const MIN_INTERVAL = 300; // 60000/200 = 300ms (200 BPM)
  const MAX_INTERVAL = 2000; // 60000/30 = 2000ms (30 BPM)
  
  return intervals.filter(interval => 
    interval >= MIN_INTERVAL && interval <= MAX_INTERVAL
  );
}
