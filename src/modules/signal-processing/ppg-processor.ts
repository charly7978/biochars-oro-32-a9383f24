
/**
 * Processor for PPG signal analysis
 */

import { ProcessedPPGSignal, SignalProcessingOptions, ISignalProcessor } from './types';

export class PPGSignalProcessor implements ISignalProcessor {
  private readonly MAX_VALUES = 300;
  private readonly QUALITY_WINDOW_SIZE = 15;
  
  private values: number[] = [];
  private filteredValues: number[] = [];
  private quality: number = 0;
  private fingerDetected: boolean = false;
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.0,
    filterStrength: 0.8,
    qualityThreshold: 0.4,
    fingerDetectionSensitivity: 0.3
  };
  
  /**
   * Process a PPG signal value
   */
  public processSignal(value: number): ProcessedPPGSignal {
    const timestamp = Date.now();
    
    // Store raw value
    this.values.push(value);
    if (this.values.length > this.MAX_VALUES) {
      this.values.shift();
    }
    
    // Apply filtering
    const filtered = this.applyFilter(value);
    this.filteredValues.push(filtered);
    if (this.filteredValues.length > this.MAX_VALUES) {
      this.filteredValues.shift();
    }
    
    // Calculate signal quality
    this.updateQuality();
    
    // Detect finger presence
    this.updateFingerDetection();
    
    // Amplify and normalize
    const normalized = this.normalizeValue(filtered);
    const amplified = this.amplifyValue(normalized);
    
    // Return processed signal
    return {
      timestamp,
      rawValue: value,
      filteredValue: filtered,
      normalizedValue: normalized,
      amplifiedValue: amplified,
      quality: this.quality,
      signalStrength: Math.abs(filtered),
      fingerDetected: this.fingerDetected
    };
  }
  
  /**
   * Apply moving average filter to smooth the signal
   */
  private applyFilter(value: number): number {
    if (this.filteredValues.length === 0) {
      return value;
    }
    
    const lastFiltered = this.filteredValues[this.filteredValues.length - 1];
    const filterStrength = this.options.filterStrength || 0.8;
    
    return lastFiltered * filterStrength + value * (1 - filterStrength);
  }
  
  /**
   * Normalize signal to range -1 to 1
   */
  private normalizeValue(value: number): number {
    if (this.filteredValues.length < 10) {
      return value;
    }
    
    const recent = this.filteredValues.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    
    if (max === min) {
      return 0;
    }
    
    return (value - min) / (max - min) * 2 - 1;
  }
  
  /**
   * Amplify signal by factor
   */
  private amplifyValue(value: number): number {
    const factor = this.options.amplificationFactor || 1.0;
    return value * factor;
  }
  
  /**
   * Update signal quality metric
   */
  private updateQuality(): void {
    if (this.filteredValues.length < this.QUALITY_WINDOW_SIZE) {
      this.quality = 0;
      return;
    }
    
    const window = this.filteredValues.slice(-this.QUALITY_WINDOW_SIZE);
    const min = Math.min(...window);
    const max = Math.max(...window);
    
    // Calculate amplitude
    const amplitude = max - min;
    
    // Calculate variance
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
    const variance = window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / window.length;
    
    // Combine metrics to determine quality
    let qualityScore = amplitude * 50;
    
    // Penalize high variance (noisy signal)
    if (variance > 0.01) {
      qualityScore = qualityScore / (variance * 10);
    }
    
    // Clip to 0-100 range
    this.quality = Math.min(100, Math.max(0, qualityScore));
  }
  
  /**
   * Update finger detection status
   */
  private updateFingerDetection(): void {
    if (this.filteredValues.length < this.QUALITY_WINDOW_SIZE) {
      this.fingerDetected = false;
      return;
    }
    
    // Check quality and amplitude
    const sensitivity = this.options.fingerDetectionSensitivity || 0.3;
    const qualityThreshold = this.options.qualityThreshold || 30;
    
    if (this.quality < qualityThreshold) {
      this.fingerDetected = false;
      return;
    }
    
    // Check for signal amplitude
    const window = this.filteredValues.slice(-this.QUALITY_WINDOW_SIZE);
    const amplitude = Math.max(...window) - Math.min(...window);
    
    this.fingerDetected = amplitude > sensitivity;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.values = [];
    this.filteredValues = [];
    this.quality = 0;
    this.fingerDetected = false;
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    this.options = { ...this.options, ...options };
  }
}
