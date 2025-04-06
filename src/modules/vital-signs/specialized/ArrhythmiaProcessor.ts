
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

// Define types for RR interval data
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

// Define types for arrhythmia processing result
export interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
}

/**
 * Processor for arrhythmia detection from real PPG signals
 */
export class ArrhythmiaProcessor {
  private arrhythmiaCount: number = 0;
  private rrIntervals: number[] = [];
  private lastArrhythmiaTime: number = 0;
  private consecutiveAbnormalBeats: number = 0;
  private readonly CONSECUTIVE_THRESHOLD = 15;
  private readonly MIN_ARRHYTHMIA_INTERVAL_MS = 20000;
  
  /**
   * Process RR interval data to detect arrhythmias
   */
  public processRRData(rrData?: RRIntervalData): ArrhythmiaProcessingResult {
    const currentTime = Date.now();
    let arrhythmiaDetected = false;
    
    // Update RR intervals with real data
    if (rrData?.intervals && rrData.intervals.length > 0) {
      // Store intervals for processing
      this.rrIntervals = [...this.rrIntervals, ...rrData.intervals].slice(-50);
      
      // Analyze for arrhythmia if we have enough intervals
      if (this.rrIntervals.length >= 8) {
        arrhythmiaDetected = this.detectArrhythmia(currentTime);
      }
    }
    
    // Build status message
    const arrhythmiaStatusMessage = 
      this.arrhythmiaCount > 0 
        ? `ARRHYTHMIA DETECTED|${this.arrhythmiaCount}` 
        : `NORMAL RHYTHM|${this.arrhythmiaCount}`;
    
    // Additional information only if there's active arrhythmia
    const lastArrhythmiaData = arrhythmiaDetected 
      ? {
          timestamp: currentTime,
          rmssd: this.calculateRMSSD(this.rrIntervals.slice(-8)),
          rrVariation: this.calculateRRVariation(this.rrIntervals.slice(-8))
        } 
      : null;
    
    return {
      arrhythmiaStatus: arrhythmiaStatusMessage,
      lastArrhythmiaData
    };
  }
  
  /**
   * Detect arrhythmia patterns in real RR intervals
   */
  private detectArrhythmia(currentTime: number): boolean {
    // Get recent intervals for analysis
    const recentRR = this.rrIntervals.slice(-8);
    
    // Calculate average RR interval
    const avgRR = recentRR.reduce((a, b) => a + b, 0) / recentRR.length;
    
    // Check for abnormal beat patterns
    let abnormalBeatsDetected = 0;
    
    for (let i = 0; i < recentRR.length; i++) {
      const variation = Math.abs(recentRR[i] - avgRR) / avgRR;
      
      // If variation exceeds 20%, consider it abnormal
      if (variation > 0.2) {
        abnormalBeatsDetected++;
      }
    }
    
    // Update consecutive anomalies counter
    if (abnormalBeatsDetected >= 2) {
      this.consecutiveAbnormalBeats++;
    } else {
      this.consecutiveAbnormalBeats = Math.max(0, this.consecutiveAbnormalBeats - 1);
    }
    
    // Check if arrhythmia is confirmed
    const timeSinceLastArrhythmia = currentTime - this.lastArrhythmiaTime;
    const canDetectNewArrhythmia = timeSinceLastArrhythmia > this.MIN_ARRHYTHMIA_INTERVAL_MS;
    
    if (this.consecutiveAbnormalBeats >= this.CONSECUTIVE_THRESHOLD && canDetectNewArrhythmia) {
      this.arrhythmiaCount++;
      this.lastArrhythmiaTime = currentTime;
      this.consecutiveAbnormalBeats = 0;
      
      console.log("ArrhythmiaProcessor: Arrhythmia detected", {
        count: this.arrhythmiaCount,
        time: new Date(currentTime).toISOString(),
        variation: this.calculateRRVariation(recentRR)
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate RMSSD (Root Mean Square of Successive Differences)
   */
  private calculateRMSSD(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    
    let sum = 0;
    for (let i = 1; i < intervals.length; i++) {
      const diff = intervals[i] - intervals[i-1];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum / (intervals.length - 1));
  }
  
  /**
   * Calculate RR interval variation as percentage
   */
  private calculateRRVariation(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    
    const min = Math.min(...intervals);
    const max = Math.max(...intervals);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    return (max - min) / avg * 100;
  }
  
  /**
   * Get current arrhythmia count
   */
  public getArrhythmiaCount(): number {
    return this.arrhythmiaCount;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.rrIntervals = [];
    this.consecutiveAbnormalBeats = 0;
    console.log("ArrhythmiaProcessor: Reset completed");
  }
}
