/**
 * Base class for all specialized signal channels
 * Provides common functionality for signal optimization
 */
import { VitalSignType, OptimizedSignalChannel, ChannelFeedback } from '../../../types/signal';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for a specialized channel
 */
export interface ChannelConfig {
  initialAmplification: number;
  initialFilterStrength: number;
  frequencyBandMin: number;
  frequencyBandMax: number;
}

/**
 * Abstract base class for specialized signal channels
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  // Channel identification
  public readonly id: string;
  public readonly type: VitalSignType;  // Changed from protected to public to match interface
  
  // Signal processing parameters
  private amplification: number;
  private filterStrength: number;
  private frequencyBandMin: number;
  private frequencyBandMax: number;
  
  // Signal quality tracking
  private quality: number = 0;
  protected recentValues: number[] = [];
  private readonly MAX_RECENT_VALUES = 30;
  
  /**
   * Constructor
   */
  constructor(type: VitalSignType, config: ChannelConfig) {
    this.id = `${type}-channel-${uuidv4().substring(0, 8)}`;
    this.type = type;
    
    // Set initial parameters
    this.amplification = config.initialAmplification;
    this.filterStrength = config.initialFilterStrength;
    this.frequencyBandMin = config.frequencyBandMin;
    this.frequencyBandMax = config.frequencyBandMax;
    
    console.log(`${this.typeToString()} Channel: Initialized with amplification=${this.amplification}, filter=${this.filterStrength}`);
  }
  
  /**
   * Process a value through the channel
   */
  public processValue(value: number): number {
    // Apply general optimizations
    let optimizedValue = value;
    
    // Apply amplification
    optimizedValue *= this.amplification;
    
    // Apply channel-specific optimization
    optimizedValue = this.applyChannelSpecificOptimization(optimizedValue);
    
    // Apply simple low-pass filter based on filter strength
    if (this.recentValues.length > 0) {
      const lastValue = this.recentValues[this.recentValues.length - 1];
      optimizedValue = lastValue * this.filterStrength + optimizedValue * (1 - this.filterStrength);
    }
    
    // Keep track of recent values
    this.recentValues.push(optimizedValue);
    if (this.recentValues.length > this.MAX_RECENT_VALUES) {
      this.recentValues.shift();
    }
    
    // Update quality estimate
    this.updateQuality();
    
    return optimizedValue;
  }
  
  /**
   * Apply channel-specific optimization
   * Must be implemented by subclasses
   */
  protected abstract applyChannelSpecificOptimization(value: number): number;
  
  /**
   * Apply feedback from vital sign algorithm
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Verify this feedback is for this channel
    if (feedback.channelId !== this.id) {
      console.warn(`${this.typeToString()} Channel: Received feedback for wrong channel (${feedback.channelId})`);
      return;
    }
    
    console.log(`${this.typeToString()} Channel: Applying feedback - quality=${feedback.signalQuality.toFixed(2)}`);
    
    // Apply suggested adjustments if provided
    const adjustments = feedback.suggestedAdjustments;
    
    if (adjustments.amplificationFactor !== undefined) {
      this.amplification *= adjustments.amplificationFactor;
      // Ensure amplification stays in reasonable bounds
      this.amplification = Math.max(0.5, Math.min(3.0, this.amplification));
    }
    
    if (adjustments.filterStrength !== undefined) {
      this.filterStrength = adjustments.filterStrength;
      // Ensure filter strength stays in valid range
      this.filterStrength = Math.max(0, Math.min(0.95, this.filterStrength));
    }
    
    if (adjustments.frequencyRangeMin !== undefined) {
      this.frequencyBandMin = adjustments.frequencyRangeMin;
    }
    
    if (adjustments.frequencyRangeMax !== undefined) {
      this.frequencyBandMax = adjustments.frequencyRangeMax;
    }
    
    console.log(`${this.typeToString()} Channel: New parameters - amplification=${this.amplification.toFixed(2)}, filter=${this.filterStrength.toFixed(2)}`);
  }
  
  /**
   * Get the channel's quality estimate
   */
  public getQuality(): number {
    return this.quality;
  }
  
  /**
   * Reset the channel
   */
  public reset(): void {
    this.recentValues = [];
    this.quality = 0;
    console.log(`${this.typeToString()} Channel: Reset`);
  }
  
  /**
   * Update quality estimate based on recent values
   */
  private updateQuality(): void {
    if (this.recentValues.length < 5) {
      this.quality = 0;
      return;
    }
    
    // Calculate signal quality based on stability and amplitude
    const recent = this.recentValues.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    
    // Signal should have some amplitude
    const amplitudeFactor = Math.min(1, range * 5);
    
    // Calculate stability based on variance
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    const stabilityFactor = Math.max(0, 1 - Math.min(1, variance * 10));
    
    // Combine factors for overall quality
    this.quality = (amplitudeFactor * 0.7 + stabilityFactor * 0.3);
  }
  
  /**
   * Convert channel type to readable string
   */
  protected typeToString(): string {
    return this.type.charAt(0).toUpperCase() + this.type.slice(1);
  }
}
