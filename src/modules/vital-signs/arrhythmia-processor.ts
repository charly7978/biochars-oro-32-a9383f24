
/**
 * Arrhythmia detection processor
 */

export class ArrhythmiaProcessor {
  private arrhythmiaCount: number = 0;
  
  /**
   * Process RR interval data to detect arrhythmias
   */
  public processRRData(rrData: { intervals: number[], lastPeakTime: number | null }): {
    arrhythmiaStatus: string,
    lastArrhythmiaData: { timestamp: number, rmssd: number, rrVariation: number } | null
  } {
    if (!rrData || !rrData.intervals || rrData.intervals.length < 3) {
      return { 
        arrhythmiaStatus: "INSUFFICIENT DATA", 
        lastArrhythmiaData: null 
      };
    }
    
    // Calculate RR interval variation
    const intervals = rrData.intervals.slice(-3);
    const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variation = intervals.map(i => Math.abs(i - avg) / avg);
    const maxVariation = Math.max(...variation);
    
    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let rmssd = 0;
    if (intervals.length > 1) {
      let sumSqDiff = 0;
      for (let i = 1; i < intervals.length; i++) {
        sumSqDiff += Math.pow(intervals[i] - intervals[i-1], 2);
      }
      rmssd = Math.sqrt(sumSqDiff / (intervals.length - 1));
    }
    
    // Determine if arrhythmia is present
    const isArrhythmia = maxVariation > 0.2;
    
    if (isArrhythmia) {
      this.arrhythmiaCount++;
      
      return {
        arrhythmiaStatus: `ARRHYTHMIA DETECTED|${this.arrhythmiaCount}`,
        lastArrhythmiaData: {
          timestamp: Date.now(),
          rmssd,
          rrVariation: maxVariation
        }
      };
    }
    
    return {
      arrhythmiaStatus: `NORMAL RHYTHM|${this.arrhythmiaCount}`,
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCount(): number {
    return this.arrhythmiaCount;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    // Intentionally not resetting arrhythmia count as it should persist
  }
}
