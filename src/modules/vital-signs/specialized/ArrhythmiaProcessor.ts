
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { RRIntervalData } from '../../../types/vital-sign-types';

interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: { 
    timestamp: number; 
    rmssd?: number; 
    rrVariation?: number; 
  } | null;
}

/**
 * Processor for arrhythmia detection
 */
export class ArrhythmiaProcessor {
  private arrhythmiaCount: number = 0;
  private rrIntervals: number[] = [];
  private lastPeakTime: number | null = null;
  private consecutiveAbnormalBeats: number = 0;
  private readonly CONSECUTIVE_THRESHOLD = 3;
  private lastArrhythmiaTime: number = 0;
  
  /**
   * Process RR interval data to detect arrhythmias
   */
  public processRRData(rrData?: RRIntervalData): ArrhythmiaProcessingResult {
    const currentTime = Date.now();
    
    // Update RR intervals with real data
    if (rrData?.intervals && rrData.intervals.length > 0) {
      this.rrIntervals = rrData.intervals;
      this.lastPeakTime = rrData.lastPeakTime;
      
      // Only detect arrhythmia if we have enough samples
      if (this.rrIntervals.length >= 5) {
        this.detectArrhythmia(currentTime);
      }
    }
    
    // Format status message
    const arrhythmiaStatus = 
      this.arrhythmiaCount > 0 
        ? `ARRHYTHMIA DETECTED|${this.arrhythmiaCount}` 
        : `NO ARRHYTHMIAS|${this.arrhythmiaCount}`;
    
    // Return detection results
    return {
      arrhythmiaStatus,
      lastArrhythmiaData: this.arrhythmiaCount > 0 ? {
        timestamp: currentTime,
        rmssd: this.calculateRMSSD(),
        rrVariation: this.calculateRRVariation()
      } : null
    };
  }
  
  /**
   * Calculate RMSSD (Root Mean Square of Successive Differences)
   */
  private calculateRMSSD(): number {
    if (this.rrIntervals.length < 2) return 0;
    
    let sumSquaredDiffs = 0;
    for (let i = 1; i < this.rrIntervals.length; i++) {
      const diff = this.rrIntervals[i] - this.rrIntervals[i-1];
      sumSquaredDiffs += diff * diff;
    }
    
    return Math.sqrt(sumSquaredDiffs / (this.rrIntervals.length - 1));
  }
  
  /**
   * Calculate RR variation
   */
  private calculateRRVariation(): number {
    if (this.rrIntervals.length < 2) return 0;
    
    const mean = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
    let sumSquaredDeviations = 0;
    
    for (let i = 0; i < this.rrIntervals.length; i++) {
      const deviation = this.rrIntervals[i] - mean;
      sumSquaredDeviations += deviation * deviation;
    }
    
    // Calculate coefficient of variation
    const standardDeviation = Math.sqrt(sumSquaredDeviations / this.rrIntervals.length);
    return (standardDeviation / mean) * 100;
  }
  
  /**
   * Detect arrhythmia from RR intervals
   */
  private detectArrhythmia(currentTime: number): void {
    if (this.rrIntervals.length < 3) return;
    
    // Get the most recent intervals for analysis
    const recentRR = this.rrIntervals.slice(-5);
    
    // Calculate average interval
    const avgRR = recentRR.reduce((sum, val) => sum + val, 0) / recentRR.length;
    
    // Get the latest interval
    const lastRR = recentRR[recentRR.length - 1];
    
    // Calculate variation as percentage
    const variation = Math.abs(lastRR - avgRR) / avgRR * 100;
    
    // Detect premature beat if variation exceeds threshold
    const prematureBeat = variation > 20;
    
    if (prematureBeat) {
      this.consecutiveAbnormalBeats++;
      
      // If we have enough consecutive abnormal beats and enough time has passed since last detection
      if (this.consecutiveAbnormalBeats >= this.CONSECUTIVE_THRESHOLD && 
          (currentTime - this.lastArrhythmiaTime > 10000)) {
        this.arrhythmiaCount++;
        this.lastArrhythmiaTime = currentTime;
        this.consecutiveAbnormalBeats = 0;
      }
    } else {
      // Reset consecutive count if normal beat
      this.consecutiveAbnormalBeats = 0;
    }
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.arrhythmiaCount = 0;
    this.rrIntervals = [];
    this.lastPeakTime = null;
    this.consecutiveAbnormalBeats = 0;
    this.lastArrhythmiaTime = 0;
  }
  
  /**
   * Get current arrhythmia count
   */
  public getArrhythmiaCount(): number {
    return this.arrhythmiaCount;
  }
}
