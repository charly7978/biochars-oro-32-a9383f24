
/**
 * Specialized channel for hydration signal processing
 * Optimizes the signal specifically for hydration measurement
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * Hydration-specific channel implementation
 */
export class HydrationChannel extends SpecializedChannel {
  // Hydration-specific parameters
  private readonly LOW_FREQUENCY_WEIGHT = 0.8;  // High weight for slow variations
  private readonly HIGH_FREQUENCY_WEIGHT = 0.2; // Lower weight for fast variations
  private readonly MIN_AMPLITUDE = 0.005;
  private readonly PERFUSION_WEIGHT = 1.3;
  private hydrationBuffer: number[] = [];
  private readonly BUFFER_SIZE = 150;  // Longer buffer for hydration
  
  constructor() {
    const config: ChannelConfig = {
      initialAmplification: 2.0,    // Higher amplification for subtle changes
      initialFilterStrength: 0.15,   // Lower filter strength to preserve slow changes
      frequencyBandMin: 0.05,       // Hz - very low frequency for tissue hydration
      frequencyBandMax: 0.5         // Hz - up to typical respiratory rate
    };
    
    super(VitalSignType.HYDRATION, config);
  }
  
  /**
   * Apply hydration-specific optimization to the signal
   * Focuses on low-frequency components related to tissue water content
   */
  protected specializedProcessing(value: number): number {
    if (Math.abs(value) < this.MIN_AMPLITUDE) {
      return value;
    }
    
    // Update hydration buffer for long-term analysis
    this.hydrationBuffer.push(value);
    if (this.hydrationBuffer.length > this.BUFFER_SIZE) {
      this.hydrationBuffer.shift();
    }
    
    // Apply specific hydration processing
    return this.applyHydrationEmphasis(value);
  }
  
  /**
   * Apply emphasis to components that are important for hydration
   * Hydration is primarily reflected in baseline changes and perfusion
   */
  private applyHydrationEmphasis(value: number): number {
    if (this.recentValues.length < 5) {
      return value;
    }
    
    // Extract recent values for short-term analysis
    const recent = this.recentValues.slice(-5);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // Calculate baseline trend over longer period if available
    let baseline = mean;
    if (this.hydrationBuffer.length > 30) {
      const longTerm = this.hydrationBuffer.slice(-30);
      baseline = longTerm.reduce((sum, val) => sum + val, 0) / longTerm.length;
    }
    
    // Blend value with baseline (emphasize low-frequency components)
    const enhancedValue = 
      (value * this.HIGH_FREQUENCY_WEIGHT) + 
      (baseline * this.LOW_FREQUENCY_WEIGHT);
    
    // Calculate perfusion index estimate (important for hydration)
    if (this.recentValues.length > 30) {
      const perfusionSample = this.recentValues.slice(-30);
      const min = Math.min(...perfusionSample);
      const max = Math.max(...perfusionSample);
      const perfusion = (max - min) / Math.abs(mean + 0.001);
      
      // Apply perfusion weighting
      const perfusionFactor = Math.min(1.5, Math.max(0.5, 1.0 + (perfusion * this.PERFUSION_WEIGHT)));
      return enhancedValue * perfusionFactor;
    }
    
    return enhancedValue;
  }
}
