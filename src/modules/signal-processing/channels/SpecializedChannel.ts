
/**
 * Base abstract class for specialized signal processing channels
 */

import { ISignalProcessor } from '../types';

/**
 * Configuration options for specialized channels
 */
export interface ChannelConfig {
  enabled: boolean;
  name: string;
  priority: number;
}

/**
 * Base abstract class for all specialized processing channels
 */
export abstract class SpecializedChannel<TResult> implements ISignalProcessor {
  protected config: ChannelConfig;
  protected quality: number = 0;
  protected samples: number[] = [];
  protected readonly maxSamples: number = 500;
  
  /**
   * Create a new specialized channel
   * @param config Channel configuration
   */
  constructor(config?: Partial<ChannelConfig>) {
    this.config = {
      enabled: true,
      name: 'default',
      priority: 1,
      ...config
    };
  }
  
  /**
   * Process a signal value
   * @param value Signal value to process
   * @returns Processed value
   */
  public processSignal(value: number): number {
    if (!this.config.enabled) {
      return value;
    }
    
    this.addSample(value);
    this.updateQuality(value);
    return this.processValue(value);
  }
  
  /**
   * Abstract method to be implemented by derived classes for value processing
   * @param value Signal value to process
   * @returns Processed value
   */
  protected abstract processValue(value: number): number;
  
  /**
   * Add sample to buffer
   * @param value Signal value
   */
  protected addSample(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * Reset channel state
   */
  public reset(): void {
    this.samples = [];
    this.quality = 0;
  }
  
  /**
   * Configure the channel
   * @param options Configuration options
   */
  public configure(options: Partial<ChannelConfig>): void {
    this.config = {
      ...this.config,
      ...options
    };
  }
  
  /**
   * Get channel name
   * @returns Channel name
   */
  public getName(): string {
    return this.config.name;
  }
  
  /**
   * Get channel priority
   * @returns Channel priority
   */
  public getPriority(): number {
    return this.config.priority;
  }
  
  /**
   * Check if channel is enabled
   * @returns True if enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Get signal quality
   * @returns Signal quality value
   */
  public getQuality(): number {
    return this.quality;
  }
  
  /**
   * Update signal quality based on new value and history
   * @param value New signal value
   */
  protected updateQuality(value: number): void {
    // Base implementation with simple quality determination
    // Derived classes should implement their own logic
    if (this.samples.length < 10) {
      this.quality = 0.3; // Initial quality is low
      return;
    }
    
    // Calculate basic variation metrics
    const recent = this.samples.slice(-10);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const stdDev = Math.sqrt(
      recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length
    );
    
    // Normalize standard deviation as a percentage of the mean
    const cv = Math.abs(stdDev / mean);
    
    // Convert coefficient of variation to a quality metric
    // Lower variation means higher quality
    let baseQuality = 0;
    if (cv < 0.1) {
      baseQuality = 0.9; // Very stable signal
    } else if (cv < 0.2) {
      baseQuality = 0.7; // Good signal
    } else if (cv < 0.5) {
      baseQuality = 0.5; // Moderate signal
    } else if (cv < 1.0) {
      baseQuality = 0.3; // Poor signal
    } else {
      baseQuality = 0.1; // Very poor signal
    }
    
    // Apply smoothing with previous quality (simple EMA)
    this.quality = this.quality * 0.7 + baseQuality * 0.3;
  }
  
  /**
   * Get result from the channel
   * @returns Channel specific result
   */
  public abstract getResult(): TResult;
}

/**
 * Default result type for basic channels
 */
export interface DefaultChannelResult {
  value: number;
  quality: number;
}

/**
 * Generic processor channel for simple value processing
 */
export class GenericProcessorChannel extends SpecializedChannel<DefaultChannelResult> {
  private processor: (value: number) => number;
  private lastProcessed: number = 0;
  
  /**
   * Create a new generic processor channel
   * @param processor Function to process values
   * @param config Channel configuration
   */
  constructor(
    processor: (value: number) => number,
    config?: Partial<ChannelConfig>
  ) {
    super(config);
    this.processor = processor;
  }
  
  /**
   * Process value using the provided processor function
   * @param value Signal value
   * @returns Processed value
   */
  protected processValue(value: number): number {
    this.lastProcessed = this.processor(value);
    return this.lastProcessed;
  }
  
  /**
   * Get channel result
   * @returns Result with processed value and quality
   */
  public getResult(): DefaultChannelResult {
    return {
      value: this.lastProcessed,
      quality: this.quality
    };
  }
}
