
/**
 * Base class for specialized signal processing channels
 * Each channel is optimized for a specific vital sign
 */
import { ProcessorType } from '../types';

/**
 * Channel configuration
 */
export interface ChannelConfig {
  name: string;
  type: ProcessorType;
  bufferSize?: number;
  filterStrength?: number;
}

/**
 * Base channel interface
 */
export interface BaseChannel<T> {
  processValue(value: number): T;
  reset(): void;
  getType(): ProcessorType;
  getName(): string;
  getQuality(): number;
}

/**
 * Abstract base class for specialized channels
 */
export abstract class SpecializedChannel<T> implements BaseChannel<T> {
  protected type: ProcessorType;
  protected name: string;
  protected quality: number = 0;
  protected recentValues: number[] = [];
  protected readonly MAX_BUFFER_SIZE: number;
  protected filterStrength: number;
  
  constructor(config: ChannelConfig) {
    this.type = config.type;
    this.name = config.name;
    this.MAX_BUFFER_SIZE = config.bufferSize || 50;
    this.filterStrength = config.filterStrength || 0.3;
  }
  
  /**
   * Process a signal value
   */
  abstract processValue(value: number): T;
  
  /**
   * Reset the channel state
   */
  reset(): void {
    this.recentValues = [];
    this.quality = 0;
  }
  
  /**
   * Get the channel type
   */
  getType(): ProcessorType {
    return this.type;
  }
  
  /**
   * Get the channel name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the current signal quality
   */
  getQuality(): number {
    return this.quality;
  }
  
  /**
   * Add a value to the buffer
   */
  protected addToBuffer(value: number): void {
    this.recentValues.push(value);
    if (this.recentValues.length > this.MAX_BUFFER_SIZE) {
      this.recentValues.shift();
    }
  }
  
  /**
   * Apply an SMA filter to the signal
   */
  protected applySMAFilter(value: number): number {
    if (this.recentValues.length === 0) return value;
    
    const windowSize = Math.min(5, this.recentValues.length);
    const values = this.recentValues.slice(-windowSize);
    return [...values, value].reduce((a, b) => a + b, 0) / (windowSize + 1);
  }
  
  /**
   * Apply an EMA filter to the signal
   */
  protected applyEMAFilter(value: number): number {
    if (this.recentValues.length === 0) return value;
    
    const lastValue = this.recentValues[this.recentValues.length - 1];
    return this.filterStrength * value + (1 - this.filterStrength) * lastValue;
  }
  
  /**
   * Calculate signal quality based on signal properties
   */
  protected calculateSignalQuality(): number {
    if (this.recentValues.length < 10) return 0;
    
    // Calculate mean and variance
    const mean = this.recentValues.reduce((a, b) => a + b, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.recentValues.length;
    
    // Low variance (flat signal) or extremely high variance (noise) both indicate poor quality
    const minVariance = 0.0001;
    const maxVariance = 0.1;
    
    if (variance < minVariance || variance > maxVariance) {
      return Math.max(0, Math.min(100, variance < minVariance ? 
        variance / minVariance * 50 : maxVariance / variance * 50));
    }
    
    // Amplitude factor
    const min = Math.min(...this.recentValues);
    const max = Math.max(...this.recentValues);
    const amplitude = max - min;
    const amplitudeFactor = Math.min(amplitude, 0.5) / 0.5;
    
    // Buffer size factor
    const bufferSizeFactor = Math.min(this.recentValues.length / 30, 1);
    
    // Calculate quality
    const quality = (amplitudeFactor * 0.6 + bufferSizeFactor * 0.4) * 100;
    return Math.max(0, Math.min(100, quality));
  }
}
