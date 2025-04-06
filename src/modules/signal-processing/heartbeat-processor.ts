
/**
 * Processor for heart beat detection and analysis
 */

import { ProcessedHeartbeatSignal, SignalProcessingOptions, ISignalProcessor } from './types';

export class HeartbeatProcessor implements ISignalProcessor {
  private readonly MAX_VALUES = 300;
  private readonly MIN_RR_INTERVAL = 300; // ms
  private readonly MAX_RR_INTERVAL = 1500; // ms
  
  private values: number[] = [];
  private peaks: number[] = [];
  private lastPeakIndex: number = -1;
  private lastPeakTime: number = 0;
  private rrIntervals: number[] = [];
  private confidence: number = 0.5;
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.2,
    filterStrength: 0.7,
    qualityThreshold: 0.3
  };
  
  /**
   * Process a signal value and detect peaks
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    const timestamp = Date.now();
    this.values.push(value);
    
    // Limit array size
    if (this.values.length > this.MAX_VALUES) {
      this.values.shift();
    }
    
    // Initialize result
    const result: ProcessedHeartbeatSignal = {
      timestamp,
      value,
      isPeak: false,
      peakConfidence: 0,
      instantaneousBPM: null,
      rrInterval: null,
      heartRateVariability: null
    };
    
    // Need at least 3 values to detect a peak
    if (this.values.length < 3) {
      return result;
    }
    
    // Check if current value is a peak
    const isPeak = this.isPeak(this.values.length - 1);
    
    if (isPeak) {
      this.peaks.push(timestamp);
      
      // Calculate RR interval if there's a previous peak
      if (this.lastPeakTime > 0) {
        const rrInterval = timestamp - this.lastPeakTime;
        
        // Ensure the RR interval is physiologically plausible
        if (rrInterval >= this.MIN_RR_INTERVAL && rrInterval <= this.MAX_RR_INTERVAL) {
          this.rrIntervals.push(rrInterval);
          
          // Limit array size
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
          }
          
          // Calculate heart rate
          const instantaneousBPM = Math.round(60000 / rrInterval);
          
          // Update result
          result.isPeak = true;
          result.peakConfidence = this.calculatePeakConfidence();
          result.instantaneousBPM = instantaneousBPM;
          result.rrInterval = rrInterval;
          
          // Calculate HRV if we have enough RR intervals
          if (this.rrIntervals.length >= 3) {
            result.heartRateVariability = this.calculateHRV();
          }
        }
      }
      
      this.lastPeakIndex = this.values.length - 1;
      this.lastPeakTime = timestamp;
    }
    
    return result;
  }
  
  /**
   * Check if value at index is a peak
   */
  private isPeak(index: number): boolean {
    if (index <= 0 || index >= this.values.length - 1) {
      return false;
    }
    
    const current = this.values[index];
    const prev = this.values[index - 1];
    const next = this.values[index + 1];
    
    // Simple peak detection
    return current > prev && current >= next;
  }
  
  /**
   * Calculate peak confidence
   */
  private calculatePeakConfidence(): number {
    if (this.values.length < 10) {
      return 0.5;
    }
    
    // Calculate average amplitude
    const recent = this.values.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const amplitude = max - min;
    
    // Adjust confidence based on amplitude and stability
    let conf = 0.5;
    
    // Higher amplitude = higher confidence
    if (amplitude > 0.15) {
      conf += 0.2;
    } else if (amplitude < 0.05) {
      conf -= 0.2;
    }
    
    // Stable RR intervals = higher confidence
    if (this.rrIntervals.length >= 3) {
      const avg = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
      const variation = this.rrIntervals.map(i => Math.abs(i - avg) / avg);
      const maxVar = Math.max(...variation);
      
      if (maxVar < 0.1) {
        conf += 0.2;
      } else if (maxVar > 0.3) {
        conf -= 0.2;
      }
    }
    
    // Ensure confidence is in valid range
    this.confidence = Math.min(1.0, Math.max(0.1, conf));
    return this.confidence;
  }
  
  /**
   * Calculate heart rate variability
   */
  private calculateHRV(): number {
    if (this.rrIntervals.length < 3) {
      return 0;
    }
    
    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let sumSquaredDiff = 0;
    for (let i = 1; i < this.rrIntervals.length; i++) {
      const diff = this.rrIntervals[i] - this.rrIntervals[i - 1];
      sumSquaredDiff += diff * diff;
    }
    
    const rmssd = Math.sqrt(sumSquaredDiff / (this.rrIntervals.length - 1));
    return rmssd;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.values = [];
    this.peaks = [];
    this.lastPeakIndex = -1;
    this.lastPeakTime = 0;
    this.rrIntervals = [];
    this.confidence = 0.5;
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    this.options = { ...this.options, ...options };
  }
}
