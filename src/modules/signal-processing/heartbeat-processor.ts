
/**
 * Heartbeat signal processor
 */
import { SignalProcessor, ProcessedHeartbeatSignal, SignalProcessingOptions } from './types';

export class HeartbeatProcessor implements SignalProcessor<ProcessedHeartbeatSignal> {
  private buffer: number[] = [];
  private timestamp: number = 0;
  private lastPeak: number = 0;
  private peakThreshold: number = 0.5;
  
  /**
   * Process a signal value and detect heartbeats
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    const now = Date.now();
    this.timestamp = now;
    
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > 30) {
      this.buffer.shift();
    }
    
    // Detect peak
    const isPeak = this.detectPeak(value);
    const rrInterval = isPeak && this.lastPeak > 0 ? now - this.lastPeak : null;
    
    // Update last peak time if peak detected
    if (isPeak) {
      this.lastPeak = now;
    }
    
    // Calculate instantaneous heart rate
    const instantaneousBPM = rrInterval ? 60000 / rrInterval : null;
    
    // Return processed signal
    return {
      timestamp: now,
      value,
      isPeak,
      peakConfidence: isPeak ? 0.8 : 0,
      instantaneousBPM,
      rrInterval,
      heartRateVariability: null
    };
  }
  
  /**
   * Detect if current value is a peak
   */
  private detectPeak(value: number): boolean {
    if (this.buffer.length < 3) return false;
    
    // Simple peak detection
    const prevValue = this.buffer[this.buffer.length - 2];
    const prev2Value = this.buffer[this.buffer.length - 3];
    
    return (
      value > this.peakThreshold && 
      value > prevValue && 
      prevValue > prev2Value
    );
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.timestamp = 0;
    this.lastPeak = 0;
  }
  
  /**
   * Configure processor parameters
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.amplificationFactor) {
      this.peakThreshold = 0.5 / options.amplificationFactor;
    }
  }
}
