
/**
 * Base class for specialized signal processing channels
 */

import { OptimizedSignalChannel, ChannelFeedback, VitalSignType } from '../../../types/signal';

/**
 * Base class for all specialized signal channels
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  protected id: string;
  protected amplification: number = 1.0;
  protected filterStrength: number = 0.5;
  protected signalType: VitalSignType;
  protected quality: number = 0;
  
  /**
   * Constructor
   */
  constructor(signalType: VitalSignType) {
    this.signalType = signalType;
    this.id = `${signalType}-channel`;
  }
  
  /**
   * Process a signal value with specialized processing
   */
  public processValue(value: number): number {
    // Apply basic processing
    const filteredValue = this.applyFiltering(value);
    const amplifiedValue = this.applyAmplification(filteredValue);
    
    // Update quality based on signal
    this.updateQuality(amplifiedValue);
    
    // Apply channel-specific processing
    return this.specializedProcessing(amplifiedValue);
  }
  
  /**
   * Apply filtering to the signal
   */
  protected applyFiltering(value: number): number {
    // Basic low-pass filter
    return value * this.filterStrength;
  }
  
  /**
   * Apply amplification to the signal
   */
  protected applyAmplification(value: number): number {
    return value * this.amplification;
  }
  
  /**
   * Update signal quality measure
   */
  protected updateQuality(value: number): void {
    // Simple quality estimation based on signal strength
    const signalStrength = Math.abs(value);
    
    if (signalStrength > 0.1) {
      this.quality = Math.min(1.0, this.quality + 0.05);
    } else {
      this.quality = Math.max(0.0, this.quality - 0.1);
    }
  }
  
  /**
   * Apply specialized processing for this channel type
   * To be implemented by derived classes
   */
  protected abstract specializedProcessing(value: number): number;
  
  /**
   * Apply feedback to adjust channel parameters
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Only apply feedback for this channel
    if (feedback.channelId !== this.id) return;
    
    // Update amplification if needed
    if (feedback.signalAmplitude < 0.2 && this.amplification < 2.0) {
      this.amplification *= 1.1;
    } else if (feedback.signalAmplitude > 0.8 && this.amplification > 0.5) {
      this.amplification *= 0.9;
    }
    
    // Update filter strength if needed
    const targetQuality = feedback.quality || feedback.signalQuality || 0.5;
    if (targetQuality < 0.3 && this.filterStrength < 0.9) {
      this.filterStrength += 0.05;
    } else if (targetQuality > 0.7 && this.filterStrength > 0.1) {
      this.filterStrength -= 0.05;
    }
    
    // Apply suggested adjustments if provided
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplification) {
        this.amplification = feedback.suggestedAdjustments.amplification;
      }
      
      if (feedback.suggestedAdjustments.filterStrength) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
    }
  }
  
  /**
   * Reset the channel state
   */
  public reset(): void {
    this.amplification = 1.0;
    this.filterStrength = 0.5;
    this.quality = 0;
  }
  
  /**
   * Get the channel ID
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Get current amplification factor
   */
  public getAmplification(): number {
    return this.amplification;
  }
  
  /**
   * Get current filter strength
   */
  public getFilterStrength(): number {
    return this.filterStrength;
  }
  
  /**
   * Get the current signal quality
   */
  public getQuality(): number {
    return this.quality;
  }
}
