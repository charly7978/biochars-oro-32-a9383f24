
/**
 * Arrhythmia detector module for heart beat processing
 */

/**
 * Analyzes heart beat results to detect arrhythmia patterns
 */
export function detectArrhythmia(result: any, arrhythmiaCount: number) {
  let isArrhythmia = false;
  let updatedCount = arrhythmiaCount;
  
  // Check RR intervals for arrhythmia patterns if available
  if (result.rrData && result.rrData.intervals && result.rrData.intervals.length >= 3) {
    const intervals = result.rrData.intervals.slice(-5); // Use last 5 intervals
    
    // Calculate average interval
    const avgInterval = intervals.reduce((sum: number, val: number) => sum + val, 0) / intervals.length;
    
    // Check for significant deviation from average (>20%)
    const lastInterval = intervals[intervals.length - 1];
    const deviation = Math.abs(lastInterval - avgInterval) / avgInterval;
    
    // If deviation is substantial, possibly arrhythmia
    if (deviation > 0.2 && result.confidence > 0.5) {
      isArrhythmia = true;
      updatedCount++;
      console.log("Arrhythmia detected: Significant RR interval deviation", { 
        deviation, 
        lastInterval, 
        avgInterval 
      });
    }
  }
  
  return {
    isArrhythmia,
    arrhythmiaCount: updatedCount
  };
}
