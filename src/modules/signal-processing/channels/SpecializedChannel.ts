
/**
 * Base class for specialized channels
 * Provides common functionality and type safety
 */
import { ProcessorType } from '../types';

export interface ChannelConfig {
  name: string;
  type: ProcessorType;
  bufferSize?: number;
  filterStrength?: number;
  initialAmplification?: number;
  frequencyBandMin?: number;
  frequencyBandMax?: number;
}

export abstract class SpecializedChannel<T> {
  protected readonly name: string;
  protected readonly type: ProcessorType;
  protected readonly bufferSize: number;
  protected readonly filterStrength: number;
  protected recentValues: number[] = [];
  protected quality: number = 0;
  
  constructor(config: ChannelConfig) {
    this.name = config.name;
    this.type = config.type;
    this.bufferSize = config.bufferSize || 100;
    this.filterStrength = config.filterStrength || 0.5;
    
    // Initialize buffer
    this.recentValues = [];
  }
  
  /**
   * Process incoming signal
   */
  abstract processSignal(value: number): T;
  
  /**
   * Reset channel state
   */
  reset(): void {
    this.recentValues = [];
    this.quality = 0;
  }
  
  /**
   * Get channel name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get channel type
   */
  getType(): ProcessorType {
    return this.type;
  }
  
  /**
   * Get channel quality
   */
  getQuality(): number {
    return this.quality;
  }
  
  /**
   * Get channel feedback
   */
  getFeedback() {
    return {
      channelId: this.name,
      signalQuality: this.quality,
      suggestedAdjustments: {},
      timestamp: Date.now(),
      success: true
    };
  }
  
  /**
   * Apply simple moving average filter
   */
  protected applySMA(value: number, windowSize: number = 5): number {
    this.recentValues.push(value);
    
    if (this.recentValues.length > this.bufferSize) {
      this.recentValues.shift();
    }
    
    if (this.recentValues.length < windowSize) {
      return value;
    }
    
    const window = this.recentValues.slice(-windowSize);
    const sum = window.reduce((a, b) => a + b, 0);
    return sum / windowSize;
  }
  
  /**
   * Calculate signal quality
   */
  protected updateQuality(): void {
    if (this.recentValues.length < 10) {
      this.quality = Math.min(this.recentValues.length * 10, 100);
      return;
    }
    
    // Calculate signal variance
    const mean = this.recentValues.reduce((a, b) => a + b, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.recentValues.length;
    
    // Calculate signal-to-noise ratio
    const snr = mean / Math.sqrt(variance);
    
    // Map SNR to quality (0-100)
    this.quality = Math.min(100, Math.max(0, Math.round(snr * 10)));
  }
}
