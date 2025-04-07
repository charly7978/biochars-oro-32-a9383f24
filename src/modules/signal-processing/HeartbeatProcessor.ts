
/**
 * Heartbeat signal processor
 */
import { ProcessedHeartbeatSignal, SignalProcessingOptions } from './types';

/**
 * Processor for heartbeat detection
 */
export class HeartbeatProcessor {
  private peakThreshold: number = 0.6;
  private minTimeBetweenPeaks: number = 300; // ms
  private lastPeakTime: number | null = null;
  private lastPeakValue: number = 0;
  private recentRRIntervals: number[] = [];
  private readonly MAX_INTERVALS = 10;
  
  /**
   * Process a signal value for heartbeat detection
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    const now = Date.now();
    
    // Detect peaks
    const isPeak = this.detectPeak(value, now);
    
    // Calculate instant BPM if peak detected
    let instantaneousBPM: number | null = null;
    let rrInterval: number | null = null;
    
    if (isPeak && this.lastPeakTime) {
      rrInterval = now - this.lastPeakTime;
      
      // Store RR interval
      if (rrInterval > this.minTimeBetweenPeaks) {
        this.recentRRIntervals.push(rrInterval);
        
        // Limit array size
        if (this.recentRRIntervals.length > this.MAX_INTERVALS) {
          this.recentRRIntervals.shift();
        }
        
        // Calculate BPM
        instantaneousBPM = Math.round(60000 / rrInterval);
      }
    }
    
    // Calculate HRV if enough intervals
    let heartRateVariability: number | null = null;
    if (this.recentRRIntervals.length >= 3) {
      heartRateVariability = this.calculateHRV();
    }
    
    return {
      timestamp: now,
      value,
      isPeak,
      peakConfidence: isPeak ? this.calculatePeakConfidence(value) : 0,
      instantaneousBPM,
      rrInterval,
      heartRateVariability
    };
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.fingerDetectionSensitivity) {
      this.peakThreshold = options.fingerDetectionSensitivity;
    }
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.lastPeakTime = null;
    this.lastPeakValue = 0;
    this.recentRRIntervals = [];
  }
  
  /**
   * Detect a peak in the signal
   */
  private detectPeak(value: number, time: number): boolean {
    // Check if value exceeds threshold
    if (value < this.peakThreshold) {
      return false;
    }
    
    // Check if enough time has passed since last peak
    if (this.lastPeakTime && (time - this.lastPeakTime) < this.minTimeBetweenPeaks) {
      return false;
    }
    
    // Check if value is higher than last peak
    if (value > this.lastPeakValue || !this.lastPeakTime) {
      this.lastPeakValue = value;
      this.lastPeakTime = time;
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate confidence in peak detection
   */
  private calculatePeakConfidence(value: number): number {
    // Simple linear scaling
    return Math.min(1, (value - this.peakThreshold) / (1 - this.peakThreshold));
  }
  
  /**
   * Calculate heart rate variability
   */
  private calculateHRV(): number {
    if (this.recentRRIntervals.length < 2) {
      return 0;
    }
    
    // Calculate successive differences
    const differences: number[] = [];
    for (let i = 1; i < this.recentRRIntervals.length; i++) {
      differences.push(Math.abs(this.recentRRIntervals[i] - this.recentRRIntervals[i - 1]));
    }
    
    // Calculate RMSSD (Root Mean Square of Successive Differences)
    const squaredDiffs = differences.map(diff => diff * diff);
    const meanSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    
    return Math.sqrt(meanSquaredDiff);
  }
}
