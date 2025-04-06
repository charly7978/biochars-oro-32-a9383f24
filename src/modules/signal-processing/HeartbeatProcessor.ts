
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Heartbeat Processor
 * Detects heartbeats from PPG signal and calculates heart rate and variability metrics
 */

import { ProcessedHeartbeatSignal, SignalProcessingOptions } from './types';

/**
 * Processor for heartbeat detection and analysis
 */
export class HeartbeatProcessor {
  // Configuration
  private peakThreshold: number = 0.6;
  private minTimeBetweenPeaks: number = 300; // Minimum time between peaks in ms (200 BPM max)
  private resetThreshold: number = 5000; // Reset detection if no peak for 5 seconds
  
  // State
  private lastPeakTime: number | null = null;
  private lastPeakValue: number = 0;
  private valueHistory: number[] = [];
  private timeHistory: number[] = [];
  private rrIntervals: number[] = [];
  private readonly MAX_HISTORY = 30;
  private readonly MAX_RR_INTERVALS = 10;
  
  /**
   * Process a PPG signal value to detect heartbeats
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    const timestamp = Date.now();
    
    // Store value in history
    this.valueHistory.push(value);
    this.timeHistory.push(timestamp);
    
    // Trim history if too long
    if (this.valueHistory.length > this.MAX_HISTORY) {
      this.valueHistory.shift();
      this.timeHistory.shift();
    }
    
    // Default result values
    let isPeak = false;
    let peakConfidence = 0;
    let instantaneousBPM = null;
    let rrInterval = null;
    let heartRateVariability = null;
    
    // Need at least some history for peak detection
    if (this.valueHistory.length > 5) {
      // Get recent values
      const recentValues = this.valueHistory.slice(-5);
      
      // Check if current value is a potential peak
      const currentIndex = recentValues.length - 1;
      const currentValue = recentValues[currentIndex];
      
      // Simple peak detection algorithm
      if (currentIndex > 1 && 
          currentValue > recentValues[currentIndex - 1] &&
          currentValue > recentValues[currentIndex - 2] &&
          (currentIndex >= recentValues.length - 1 || currentValue > recentValues[currentIndex + 1])) {
        
        // Check if peak is significant
        const baseline = Math.min(...recentValues);
        const peakAmp = currentValue - baseline;
        
        // Calculate peak confidence
        peakConfidence = this.calculatePeakConfidence(peakAmp, recentValues);
        
        // Check if this is a valid peak
        if (peakConfidence > this.peakThreshold) {
          // Ensure minimum time between peaks
          const validTiming = this.lastPeakTime === null || 
                             (timestamp - this.lastPeakTime) > this.minTimeBetweenPeaks;
          
          if (validTiming) {
            isPeak = true;
            
            // Calculate RR interval if we have a previous peak
            if (this.lastPeakTime !== null) {
              rrInterval = timestamp - this.lastPeakTime;
              
              // Store RR interval
              this.rrIntervals.push(rrInterval);
              if (this.rrIntervals.length > this.MAX_RR_INTERVALS) {
                this.rrIntervals.shift();
              }
              
              // Calculate instantaneous BPM
              instantaneousBPM = Math.round(60000 / rrInterval);
              
              // Calculate heart rate variability
              if (this.rrIntervals.length > 1) {
                heartRateVariability = this.calculateHRV();
              }
            }
            
            // Update last peak time and value
            this.lastPeakTime = timestamp;
            this.lastPeakValue = currentValue;
          }
        }
      }
      
      // Check for reset condition (no peak for too long)
      if (this.lastPeakTime !== null && (timestamp - this.lastPeakTime) > this.resetThreshold) {
        this.lastPeakTime = null;
        this.rrIntervals = [];
      }
    }
    
    return {
      timestamp,
      value,
      isPeak,
      peakConfidence,
      instantaneousBPM,
      rrInterval,
      heartRateVariability
    };
  }
  
  /**
   * Calculate peak confidence based on signal characteristics
   */
  private calculatePeakConfidence(peakAmp: number, recentValues: number[]): number {
    // Get signal range
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const range = max - min;
    
    // Calculate relative peak amplitude
    const relativeAmp = range > 0 ? peakAmp / range : 0;
    
    // Calculate noise level (standard deviation of differences)
    const diffs = [];
    for (let i = 1; i < recentValues.length; i++) {
      diffs.push(recentValues[i] - recentValues[i-1]);
    }
    
    const avgDiff = diffs.reduce((sum, diff) => sum + Math.abs(diff), 0) / diffs.length;
    const noise = diffs.reduce((sum, diff) => sum + Math.pow(Math.abs(diff) - avgDiff, 2), 0) / diffs.length;
    
    // Calculate signal-to-noise ratio
    const snr = avgDiff > 0 ? peakAmp / (noise + 0.0001) : 0;
    
    // Combine factors for confidence
    const confidence = (relativeAmp * 0.6) + (snr * 0.4);
    
    return Math.min(1, Math.max(0, confidence));
  }
  
  /**
   * Calculate heart rate variability metrics (RMSSD)
   */
  private calculateHRV(): number {
    if (this.rrIntervals.length < 2) {
      return 0;
    }
    
    // Calculate successive differences
    const differences = [];
    for (let i = 1; i < this.rrIntervals.length; i++) {
      differences.push(this.rrIntervals[i] - this.rrIntervals[i-1]);
    }
    
    // Calculate RMSSD (Root Mean Square of Successive Differences)
    const squaredDiffs = differences.map(diff => diff * diff);
    const meanSquared = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const rmssd = Math.sqrt(meanSquared);
    
    return rmssd;
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.amplificationFactor !== undefined) {
      // Adjust peak threshold based on amplification
      this.peakThreshold = 0.6 / Math.max(1, options.amplificationFactor);
    }
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.lastPeakTime = null;
    this.lastPeakValue = 0;
    this.valueHistory = [];
    this.timeHistory = [];
    this.rrIntervals = [];
  }
  
  /**
   * Get the calculated heart rate
   */
  public getHeartRate(): number {
    // Calculate average heart rate from RR intervals
    if (this.rrIntervals.length === 0) {
      return 0;
    }
    
    // Calculate average RR interval
    const avgRR = this.rrIntervals.reduce((sum, rr) => sum + rr, 0) / this.rrIntervals.length;
    
    // Convert to BPM
    return Math.round(60000 / avgRR);
  }
}
