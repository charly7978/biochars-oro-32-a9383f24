/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Specialized Signal Channel Base Class
 * Provides common functionality for all signal channels
 */

import { ChannelFeedback, VitalSignType } from '../../../types/vital-sign-types';

/**
 * Configuration for specialized channels
 */
export interface ChannelConfig {
  initialAmplification: number;
  initialFilterStrength: number;
  frequencyBandMin: number;
  frequencyBandMax: number;
}

/**
 * Base implementation of an optimized signal channel
 */
export class SpecializedChannel {
  private _id: string;
  private _type: VitalSignType;
  private _quality: number = 0;
  private _amplification: number = 1.0;
  private _filterStrength: number = 0.5;
  private _buffer: number[] = [];
  protected recentValues: number[] = []; // Adding protected recentValues property
  private readonly MAX_BUFFER_SIZE = 100;
  
  /**
   * Constructor
   */
  constructor(type: VitalSignType, config?: ChannelConfig) {
    this._id = `channel-${type}-${Date.now().toString(36)}`;
    this._type = type;
    
    // Apply configuration if provided
    if (config) {
      this._amplification = config.initialAmplification;
      this._filterStrength = config.initialFilterStrength;
    }
    
    console.log(`SpecializedChannel: Created channel ${this._id} for ${type}`);
  }
  
  /**
   * Channel ID
   */
  get id(): string {
    return this._id;
  }
  
  /**
   * Vital sign type
   */
  get type(): VitalSignType {
    return this._type;
  }
  
  /**
   * Process a value through this channel
   */
  public processValue(value: number): number {
    // Add to buffer
    this._buffer.push(value);
    if (this._buffer.length > this.MAX_BUFFER_SIZE) {
      this._buffer.shift();
    }
    
    // Update recent values for specialized processing
    this.recentValues.push(value);
    if (this.recentValues.length > 10) {
      this.recentValues.shift();
    }
    
    // Apply channel-specific processing
    const processedValue = this.applyChannelProcessing(value);
    
    // Calculate quality based on buffer variance
    this.calculateQuality();
    
    return processedValue;
  }
  
  /**
   * Apply channel-specific processing
   * Override in subclasses
   */
  protected applyChannelProcessing(value: number): number {
    // Base implementation just applies amplification
    return value * this._amplification;
  }
  
  /**
   * Specialized processing method for subclasses to override
   * This allows subclasses to implement their own processing logic
   */
  protected specializedProcessing(value: number): number {
    // Base implementation returns the value unchanged
    return value;
  }
  
  /**
   * Apply feedback to optimize channel
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Only apply feedback to this channel
    if (feedback.channelId !== this._id) {
      return;
    }
    
    // Apply suggested adjustments
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this._amplification = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this._filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
    }
    
    console.log(`SpecializedChannel: Applied feedback to ${this._id}`, {
      amplification: this._amplification,
      filterStrength: this._filterStrength
    });
  }
  
  /**
   * Calculate signal quality from buffer
   */
  private calculateQuality(): void {
    if (this._buffer.length < 3) {
      this._quality = 0.5; // Default quality
      return;
    }
    
    // Calculate variance
    const mean = this._buffer.reduce((sum, val) => sum + val, 0) / this._buffer.length;
    const variance = this._buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this._buffer.length;
    
    // Quality is a function of variance
    // Very low variance (flat line) is bad, but so is extremely high variance (noise)
    const normalizedVariance = Math.min(1.0, variance / 2.0);
    this._quality = normalizedVariance * 0.8 + 0.2; // Scale to 0.2-1.0 range
  }
  
  /**
   * Get current signal quality
   */
  public getQuality(): number {
    return this._quality;
  }
  
  /**
   * Reset the channel
   */
  public reset(): void {
    this._buffer = [];
    this.recentValues = [];
    this._quality = 0;
    console.log(`SpecializedChannel: Reset channel ${this._id}`);
  }
  
  /**
   * Get current amplification factor
   */
  public getAmplification(): number {
    return this._amplification;
  }
  
  /**
   * Get current filter strength
   */
  public getFilterStrength(): number {
    return this._filterStrength;
  }
}

// Remove the duplicate interface declaration and export from types
export type { OptimizedSignalChannel } from '../../../types/signal';
