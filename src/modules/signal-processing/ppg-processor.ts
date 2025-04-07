
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalProcessor, SignalProcessingOptions } from './types';

/**
 * PPG Signal processor for photoplethysmogram signals
 * Handles filtering, quality assessment, and feature extraction
 */
export class PPGSignalProcessor implements SignalProcessor {
  private buffer: number[] = [];
  private readonly bufferSize: number = 30;
  private quality: number = 0;
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.5,
    filterStrength: 0.5,
    qualityThreshold: 40
  };
  
  constructor(options?: SignalProcessingOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }
  
  /**
   * Process a PPG signal value
   */
  public processSignal(value: number): any {
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // Apply filtering
    const filteredValue = this.applyFilters(value);
    
    // Calculate signal quality
    this.quality = this.calculateSignalQuality();
    
    // Calculate normalized value
    const normalizedValue = this.normalizeSignal(filteredValue);
    
    // Calculate amplified value
    const amplifiedValue = normalizedValue * this.options.amplificationFactor!;
    
    // Determine finger detection
    const fingerDetected = this.detectFinger();
    
    // Result
    return {
      timestamp: Date.now(),
      rawValue: value,
      filteredValue,
      normalizedValue,
      amplifiedValue,
      quality: this.quality,
      fingerDetected,
      signalStrength: Math.abs(filteredValue)
    };
  }
  
  /**
   * Apply signal filters
   */
  private applyFilters(value: number): number {
    if (this.buffer.length < 3) return value;
    
    // Simple moving average filter
    let sum = 0;
    for (let i = Math.max(0, this.buffer.length - 3); i < this.buffer.length; i++) {
      sum += this.buffer[i];
    }
    
    return sum / 3;
  }
  
  /**
   * Calculate signal quality (0-100)
   */
  private calculateSignalQuality(): number {
    if (this.buffer.length < 10) return 0;
    
    // Calculate signal variance
    const mean = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    const variance = this.buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.buffer.length;
    
    // Calculate signal-to-noise ratio
    const signalPower = Math.pow(mean, 2);
    const noisePower = variance;
    
    // Convert to quality score (0-100)
    const snr = signalPower / (noisePower + 0.0001);
    return Math.min(100, Math.max(0, snr * 20));
  }
  
  /**
   * Normalize signal to range [-1, 1]
   */
  private normalizeSignal(value: number): number {
    if (this.buffer.length < 5) return 0;
    
    // Get min and max from recent buffer
    const recentBuffer = this.buffer.slice(-10);
    const min = Math.min(...recentBuffer);
    const max = Math.max(...recentBuffer);
    
    // Avoid division by zero
    if (max === min) return 0;
    
    // Normalize to [-1, 1]
    return 2 * ((value - min) / (max - min) - 0.5);
  }
  
  /**
   * Detect if a finger is present
   */
  private detectFinger(): boolean {
    // Check signal quality
    if (this.quality < this.options.qualityThreshold!) {
      return false;
    }
    
    // Check signal strength
    if (this.buffer.length < 10) return false;
    
    const recentBuffer = this.buffer.slice(-10);
    const min = Math.min(...recentBuffer);
    const max = Math.max(...recentBuffer);
    
    // Finger is detected if signal has sufficient amplitude
    return (max - min) > 0.1;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.quality = 0;
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    this.options = { ...this.options, ...options };
  }
}
