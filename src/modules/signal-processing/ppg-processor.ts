
/**
 * PPG Signal Processor
 * Processes raw PPG signals for use in vital signs extraction
 */
import { ProcessedPPGSignal, ISignalProcessor } from './types';

export class PPGSignalProcessor implements ISignalProcessor<number> {
  private buffer: number[] = [];
  private readonly bufferSize: number = 50;
  private quality: number = 0;
  
  constructor() {
    this.buffer = [];
  }
  
  /**
   * Process raw PPG signal
   */
  processSignal(value: number): number {
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // Calculate filtered value
    const filteredValue = this.applyFilter(value);
    
    // Update quality
    this.updateQuality();
    
    return filteredValue;
  }
  
  /**
   * Apply filter to smooth the signal
   */
  private applyFilter(value: number): number {
    if (this.buffer.length < 3) return value;
    
    // Simple moving average
    const window = this.buffer.slice(-3);
    return window.reduce((sum, val) => sum + val, 0) / window.length;
  }
  
  /**
   * Update signal quality
   */
  private updateQuality(): void {
    if (this.buffer.length < 10) {
      this.quality = Math.min(this.buffer.length * 10, 100);
      return;
    }
    
    // Calculate variance
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    const variance = this.buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.buffer.length;
    
    // Calculate SNR
    const snr = mean / Math.sqrt(variance);
    this.quality = Math.min(100, Math.max(0, Math.round(snr * 10)));
  }
  
  /**
   * Configure processing options
   */
  configure(options: any): void {
    // Apply configuration
  }
  
  /**
   * Reset processor state
   */
  reset(): void {
    this.buffer = [];
    this.quality = 0;
  }
}
