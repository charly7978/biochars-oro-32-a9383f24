/**
 * Heart beat processor for PPG signals
 */

import { ProcessedHeartbeatSignal } from "./index";

export class HeartBeatProcessor {
  private values: number[] = [];
  private readonly MAX_VALUES = 100;
  private peaks: number[] = [];
  private rrIntervals: number[] = [];
  private lastPeakTime: number | null = null;
  
  /**
   * Process a signal value and detect peaks
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    const timestamp = Date.now();
    
    // Add value to buffer
    this.values.push(value);
    if (this.values.length > this.MAX_VALUES) {
      this.values.shift();
    }
    
    // Detect if this is a peak
    const isPeak = this.detectPeak(value);
    let instantaneousBPM: number | null = null;
    let rrInterval: number | null = null;
    let heartRateVariability: number | null = null;
    
    // If peak detected, calculate heart rate metrics
    if (isPeak) {
      this.peaks.push(timestamp);
      
      // Keep only recent peaks
      if (this.peaks.length > 10) {
        this.peaks.shift();
      }
      
      // Calculate RR interval if we have a previous peak
      if (this.lastPeakTime !== null) {
        rrInterval = timestamp - this.lastPeakTime;
        this.rrIntervals.push(rrInterval);
        
        // Keep only recent RR intervals
        if (this.rrIntervals.length > 10) {
          this.rrIntervals.shift();
        }
        
        // Calculate instantaneous BPM from RR interval
        instantaneousBPM = 60000 / rrInterval;
      }
      
      // Update last peak time
      this.lastPeakTime = timestamp;
      
      // Calculate heart rate variability (RMSSD)
      if (this.rrIntervals.length >= 2) {
        const rrDifferences = [];
        for (let i = 1; i < this.rrIntervals.length; i++) {
          rrDifferences.push(this.rrIntervals[i] - this.rrIntervals[i-1]);
        }
        
        const squaredDifferences = rrDifferences.map(diff => diff * diff);
        const meanSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / squaredDifferences.length;
        heartRateVariability = Math.sqrt(meanSquaredDiff);
      }
    }
    
    return {
      timestamp,
      value,
      isPeak,
      peakConfidence: isPeak ? 0.8 : 0.0,
      instantaneousBPM,
      rrInterval,
      heartRateVariability
    };
  }
  
  /**
   * Detect if the current value is a peak
   */
  private detectPeak(value: number): boolean {
    if (this.values.length < 5) return false;
    
    // Simple peak detection
    const current = value;
    const prev1 = this.values[this.values.length - 1];
    const prev2 = this.values[this.values.length - 2];
    const prev3 = this.values[this.values.length - 3];
    const prev4 = this.values[this.values.length - 4];
    
    // Peak if current is less than previous value but previous was greater than ones before it
    return prev1 > current && prev1 > prev2 && prev1 > prev3 && prev1 > prev4;
  }
  
  /**
   * Configure processor
   */
  public configure(options: any): void {
    // Configure options
    console.log("HeartBeatProcessor: Configured with", options);
  }
  
  /**
   * Reset processor
   */
  public reset(): void {
    this.values = [];
    this.peaks = [];
    this.rrIntervals = [];
    this.lastPeakTime = null;
  }
}
