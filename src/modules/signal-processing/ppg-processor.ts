
/**
 * PPG signal processor
 */
import { SignalProcessor, ProcessedPPGSignal, SignalProcessingOptions } from './types';

export class PPGProcessor implements SignalProcessor<ProcessedPPGSignal> {
  private buffer: number[] = [];
  private filterBuffer: number[] = [];
  private amplificationFactor: number = 1.0;
  private filterStrength: number = 0.2;
  private qualityThreshold: number = 30;
  private fingerDetectionThreshold: number = 0.1;
  
  /**
   * Process a signal value
   */
  public processSignal(value: number): ProcessedPPGSignal {
    const now = Date.now();
    
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > 100) {
      this.buffer.shift();
    }
    
    // Apply filtering
    const filteredValue = this.applyFiltering(value);
    
    // Normalize and amplify
    const normalizedValue = this.normalize(filteredValue);
    const amplifiedValue = normalizedValue * this.amplificationFactor;
    
    // Calculate quality and detect finger
    const quality = this.calculateQuality(this.filterBuffer);
    const fingerDetected = this.detectFinger(quality, amplifiedValue);
    
    // Return processed signal
    return {
      timestamp: now,
      rawValue: value,
      filteredValue,
      normalizedValue,
      amplifiedValue,
      quality,
      fingerDetected,
      signalStrength: Math.abs(amplifiedValue)
    };
  }
  
  /**
   * Apply filtering to the signal
   */
  private applyFiltering(value: number): number {
    // Simple exponential moving average filter
    if (this.filterBuffer.length === 0) {
      this.filterBuffer.push(value);
      return value;
    }
    
    const lastFiltered = this.filterBuffer[this.filterBuffer.length - 1];
    const filtered = lastFiltered * (1 - this.filterStrength) + value * this.filterStrength;
    
    this.filterBuffer.push(filtered);
    if (this.filterBuffer.length > 100) {
      this.filterBuffer.shift();
    }
    
    return filtered;
  }
  
  /**
   * Normalize value
   */
  private normalize(value: number): number {
    if (this.filterBuffer.length < 10) return value;
    
    const recent = this.filterBuffer.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    
    return range > 0 ? (value - min) / range : value;
  }
  
  /**
   * Calculate signal quality (0-100)
   */
  private calculateQuality(values: number[]): number {
    if (values.length < 10) return 0;
    
    const recent = values.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    
    // Higher range (amplitude) generally means better quality
    const amplitudeQuality = Math.min(100, range * 200);
    
    // Check for variability (too much is bad)
    let variability = 0;
    for (let i = 1; i < recent.length; i++) {
      variability += Math.abs(recent[i] - recent[i-1]);
    }
    variability /= recent.length - 1;
    
    const variabilityScore = Math.max(0, 100 - variability * 500);
    
    // Combined quality score
    return (amplitudeQuality * 0.7 + variabilityScore * 0.3);
  }
  
  /**
   * Detect if finger is present on sensor
   */
  private detectFinger(quality: number, value: number): boolean {
    return quality > this.qualityThreshold && Math.abs(value) > this.fingerDetectionThreshold;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.filterBuffer = [];
  }
  
  /**
   * Configure processor parameters
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.amplificationFactor !== undefined) {
      this.amplificationFactor = options.amplificationFactor;
    }
    
    if (options.filterStrength !== undefined) {
      this.filterStrength = options.filterStrength;
    }
    
    if (options.qualityThreshold !== undefined) {
      this.qualityThreshold = options.qualityThreshold;
    }
    
    if (options.fingerDetectionSensitivity !== undefined) {
      this.fingerDetectionThreshold = 0.1 / options.fingerDetectionSensitivity;
    }
  }
}
