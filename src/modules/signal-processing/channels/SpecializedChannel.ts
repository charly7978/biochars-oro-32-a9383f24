
/**
 * Base class for specialized signal processing channels
 * Each channel optimizes the signal for a specific vital sign
 */

import { VitalSignType } from '../../../types/signal';

/**
 * Configuration for a specialized channel
 */
export interface ChannelConfig {
  sampleRate?: number;
  bufferSize?: number;
  adaptiveThreshold?: number;
}

/**
 * Interface for optimized signal channel
 */
export interface OptimizedSignalChannel {
  type: VitalSignType;
  processValue(value: number): number;
  reset(): void;
  configure(config: ChannelConfig): void;
}

/**
 * Base class for all specialized channels
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  public type: VitalSignType;
  protected readonly sampleRate: number = 25; // Default sample rate in Hz
  protected readonly bufferSize: number = 100; // Max values to store
  protected adaptiveThreshold: number = 0.5;
  protected recentValues: number[] = [];
  
  constructor(type: VitalSignType, config: ChannelConfig = {}) {
    this.type = type;
    
    if (config.sampleRate) this.sampleRate = config.sampleRate;
    if (config.bufferSize) this.bufferSize = config.bufferSize;
    if (config.adaptiveThreshold !== undefined) this.adaptiveThreshold = config.adaptiveThreshold;
  }
  
  /**
   * Process a value through the channel
   * @param value Raw value to process
   * @returns Optimized value for this specific vital sign
   */
  public processValue(value: number): number {
    // Store value in recent values buffer
    this.recentValues.push(value);
    if (this.recentValues.length > this.bufferSize) {
      this.recentValues.shift();
    }
    
    // Apply generic preprocessing
    const preprocessedValue = this.applyCommonPreprocessing(value);
    
    // Apply channel-specific optimization
    const optimizedValue = this.applyChannelSpecificOptimization(preprocessedValue);
    
    return optimizedValue;
  }
  
  /**
   * Apply common preprocessing steps
   */
  protected applyCommonPreprocessing(value: number): number {
    // Apply generic preprocessing steps
    return value;
  }
  
  /**
   * Apply channel-specific optimization
   * To be implemented by each channel type
   */
  protected abstract applyChannelSpecificOptimization(value: number): number;
  
  /**
   * Reset the channel state
   */
  public reset(): void {
    this.recentValues = [];
  }
  
  /**
   * Configure channel parameters
   */
  public configure(config: ChannelConfig): void {
    if (config.sampleRate) this.sampleRate = config.sampleRate;
    if (config.bufferSize) this.bufferSize = config.bufferSize;
    if (config.adaptiveThreshold !== undefined) this.adaptiveThreshold = config.adaptiveThreshold;
  }
}

/**
 * Factory function to create channels
 */
export function createChannel(type: VitalSignType, config: ChannelConfig = {}): OptimizedSignalChannel {
  throw new Error(`Channel type ${type} not implemented`);
}
