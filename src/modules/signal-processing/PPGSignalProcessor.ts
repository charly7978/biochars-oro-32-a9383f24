
/**
 * PPG signal processor
 */
import { ProcessedPPGSignal, SignalProcessingOptions } from './types';

/**
 * Processor for PPG signals
 */
export class PPGSignalProcessor {
  private amplificationFactor: number = 1.5;
  private filterStrength: number = 0.3;
  private qualityThreshold: number = 40;
  private fingerDetectionSensitivity: number = 0.5;
  private lastValues: number[] = [];
  private readonly MAX_HISTORY = 100;
  
  /**
   * Process a PPG signal value
   */
  public processSignal(value: number): ProcessedPPGSignal {
    // Store value in history
    this.lastValues.push(value);
    if (this.lastValues.length > this.MAX_HISTORY) {
      this.lastValues.shift();
    }
    
    // Basic signal processing
    const filteredValue = this.applyFilter(value);
    const normalizedValue = this.normalizeValue(filteredValue);
    const amplifiedValue = this.amplifyValue(normalizedValue);
    
    // Calculate signal quality
    const quality = this.calculateQuality(filteredValue);
    
    // Detect finger presence
    const fingerDetected = quality > this.qualityThreshold;
    
    // Calculate signal strength
    const signalStrength = Math.min(100, Math.max(0, quality * 1.2));
    
    return {
      timestamp: Date.now(),
      rawValue: value,
      filteredValue,
      normalizedValue,
      amplifiedValue,
      quality,
      fingerDetected,
      signalStrength
    };
  }
  
  /**
   * Configure the processor
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
      this.fingerDetectionSensitivity = options.fingerDetectionSensitivity;
    }
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.lastValues = [];
  }
  
  /**
   * Apply filtering to the signal
   */
  private applyFilter(value: number): number {
    if (this.lastValues.length <= 1) {
      return value;
    }
    
    // Simple exponential moving average
    const lastFiltered = this.lastValues[this.lastValues.length - 2];
    return lastFiltered * (1 - this.filterStrength) + value * this.filterStrength;
  }
  
  /**
   * Normalize the value
   */
  private normalizeValue(value: number): number {
    if (this.lastValues.length < 10) {
      return value;
    }
    
    // Get recent values
    const recentValues = this.lastValues.slice(-10);
    
    // Calculate min and max
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    
    // Avoid division by zero
    if (max === min) {
      return 0.5;
    }
    
    // Normalize to 0-1 range
    return (value - min) / (max - min);
  }
  
  /**
   * Amplify the value
   */
  private amplifyValue(value: number): number {
    return value * this.amplificationFactor;
  }
  
  /**
   * Calculate signal quality
   */
  private calculateQuality(value: number): number {
    if (this.lastValues.length < 10) {
      return 50; // Default quality
    }
    
    // Get recent values
    const recentValues = this.lastValues.slice(-10);
    
    // Calculate variance
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    
    // Calculate signal-to-noise ratio
    const amplitude = Math.max(...recentValues) - Math.min(...recentValues);
    const snr = variance > 0 ? amplitude / Math.sqrt(variance) : 0;
    
    // Scale to 0-100
    return Math.min(100, Math.max(0, snr * 20));
  }
}
