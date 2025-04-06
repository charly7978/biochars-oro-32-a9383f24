
/**
 * Base class for all specialized channels
 * Provides common functionality and structure for channel-specific optimizations
 */

import { ChannelFeedback } from '../../../types/vital-sign-types';
import { VitalSignType } from '../../../types/vital-sign-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for specialized channels
 */
export interface ChannelConfig {
  initialAmplification: number;
  initialFilterStrength: number;
  frequencyBandMin: number;
  frequencyBandMax: number;
}

/**
 * Interface for OptimizedSignalChannel
 */
export interface OptimizedSignalChannel {
  id: string;                     // Unique identifier
  type: VitalSignType;            // Type of vital sign
  processValue: (value: number) => number;  // Process value for this specific channel
  applyFeedback: (feedback: ChannelFeedback) => void;  // Apply feedback from algorithm
  getQuality: () => number;       // Get channel quality (0-1)
  reset: () => void;              // Reset channel state
  getAmplification: () => number; // Get amplification factor
  getFilterStrength: () => number; // Get filter strength
}

/**
 * Base class for specialized signal channels
 * Each specialized channel optimizes the signal for a specific vital sign
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  public readonly id: string;
  public readonly type: VitalSignType;
  protected amplificationFactor: number;
  protected filterStrength: number;
  protected frequencyBandMin: number;
  protected frequencyBandMax: number;
  protected quality: number = 0;
  protected recentValues: number[] = [];
  protected readonly MAX_RECENT_VALUES = 100;
  protected lastFeedback: ChannelFeedback | null = null;
  protected feedbackHistory: ChannelFeedback[] = [];
  protected readonly MAX_FEEDBACK_HISTORY = 20;
  
  /**
   * Constructor
   * @param type Type of vital sign this channel processes
   * @param config Configuration options
   */
  constructor(type: VitalSignType, config: ChannelConfig) {
    this.id = `${type}-${uuidv4().substring(0, 8)}`;
    this.type = type;
    this.amplificationFactor = config.initialAmplification;
    this.filterStrength = config.initialFilterStrength;
    this.frequencyBandMin = config.frequencyBandMin;
    this.frequencyBandMax = config.frequencyBandMax;
    
    console.log(`${this.typeToString()} Channel initialized with ID: ${this.id}`);
  }
  
  /**
   * Process a value for this specific channel
   * @param value Raw value to process
   * @returns Processed value
   */
  public processValue(value: number): number {
    // Apply common processing first
    const filteredValue = this.applyFilter(value);
    const amplifiedValue = this.applyAmplification(filteredValue);
    const optimizedValue = this.specializedProcessing(amplifiedValue);
    
    // Add to recent values
    this.recentValues.push(optimizedValue);
    if (this.recentValues.length > this.MAX_RECENT_VALUES) {
      this.recentValues.shift();
    }
    
    // Update quality indicator
    this.updateQuality();
    
    return optimizedValue;
  }
  
  /**
   * Apply channel-specific optimization
   * Must be implemented by each specialized channel
   */
  protected abstract specializedProcessing(value: number): number;
  
  /**
   * Apply filtering to the value
   * @param value Value to filter
   * @returns Filtered value
   */
  protected applyFilter(value: number): number {
    // Base implementation uses exponential moving average
    if (this.recentValues.length === 0) {
      return value;
    }
    
    const lastValue = this.recentValues[this.recentValues.length - 1];
    return lastValue * (1 - this.filterStrength) + value * this.filterStrength;
  }
  
  /**
   * Apply amplification to the value
   * @param value Value to amplify
   * @returns Amplified value
   */
  protected applyAmplification(value: number): number {
    return value * this.amplificationFactor;
  }
  
  /**
   * Apply feedback from algorithm to adjust channel parameters
   * @param feedback Feedback information
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Store feedback
    this.lastFeedback = feedback;
    this.feedbackHistory.push(feedback);
    if (this.feedbackHistory.length > this.MAX_FEEDBACK_HISTORY) {
      this.feedbackHistory.shift();
    }
    
    // Apply suggested adjustments
    if (feedback.suggestedAdjustments) {
      const adjustments = feedback.suggestedAdjustments;
      
      // Update amplification if suggested
      if (adjustments.amplificationFactor !== undefined) {
        // Cap adjustment to +/- 10%
        const maxChange = 0.1;
        const currentValue = this.amplificationFactor;
        const targetValue = adjustments.amplificationFactor;
        const change = Math.min(Math.abs(targetValue - currentValue), currentValue * maxChange);
        this.amplificationFactor = currentValue + (targetValue > currentValue ? change : -change);
      }
      
      // Update filter strength if suggested
      if (adjustments.filterStrength !== undefined) {
        // Ensure filter strength stays between 0.1 and 0.95
        this.filterStrength = Math.max(0.1, Math.min(0.95, adjustments.filterStrength));
      }
    }
  }
  
  /**
   * Update quality indicator based on recent values
   */
  protected updateQuality(): void {
    if (this.recentValues.length < 5) {
      this.quality = 0.5; // Default quality
      return;
    }
    
    // Simple quality metric based on variance
    // Real physiological signals have controlled variance
    const mean = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.recentValues.length;
    
    // Quality decreases if variance is too high or too low
    const optimalVariance = 0.01;
    const varianceScore = Math.min(1, Math.max(0, 1 - Math.abs(variance - optimalVariance) / optimalVariance));
    
    // Update quality (with smoothing)
    this.quality = this.quality * 0.7 + varianceScore * 0.3;
  }
  
  /**
   * Get the current quality indicator
   */
  public getQuality(): number {
    return this.quality;
  }
  
  /**
   * Reset the channel
   */
  public reset(): void {
    this.recentValues = [];
    this.quality = 0.5;
    this.lastFeedback = null;
    this.feedbackHistory = [];
  }
  
  /**
   * Get the current amplification factor
   */
  public getAmplification(): number {
    return this.amplificationFactor;
  }
  
  /**
   * Get the current filter strength
   */
  public getFilterStrength(): number {
    return this.filterStrength;
  }
  
  /**
   * Convert channel type to string for logging
   */
  protected typeToString(): string {
    return this.type.toString();
  }
}
