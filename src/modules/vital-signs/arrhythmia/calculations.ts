
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * Used for heart rate variability analysis
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
 * Calculate RR variation coefficient
 * Used for assessing rhythm regularity
 */
export function calculateRRVariation(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  
  // Calculate mean interval
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Calculate standard deviation
  let sumSquaredDeviations = 0;
  for (const interval of intervals) {
    const deviation = interval - mean;
    sumSquaredDeviations += deviation * deviation;
  }
  const stdDev = Math.sqrt(sumSquaredDeviations / intervals.length);
  
  // Return coefficient of variation as percentage
  return (stdDev / mean) * 100;
}

/**
 * Detect premature beats in RR intervals
 */
export function detectPrematureBeats(intervals: number[], threshold: number = 20): boolean[] {
  if (intervals.length < 3) return [];
  
  // Calculate mean RR interval
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Detect premature beats
  const prematureBeats = intervals.map(interval => {
    const variation = Math.abs(interval - mean) / mean * 100;
    return variation > threshold && interval < mean;
  });
  
  return prematureBeats;
}

/**
 * Detect missed beats in RR intervals
 */
export function detectMissedBeats(intervals: number[], threshold: number = 40): boolean[] {
  if (intervals.length < 3) return [];
  
  // Calculate mean RR interval
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Detect missed beats (much longer than normal)
  const missedBeats = intervals.map(interval => {
    const variation = (interval - mean) / mean * 100;
    return variation > threshold;
  });
  
  return missedBeats;
}
