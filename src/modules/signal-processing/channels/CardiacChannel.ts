
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/vital-sign-types';

/**
 * Specialized channel for cardiac signal processing
 */
export class CardiacChannel extends SpecializedChannel {
  private readonly peakAmplification = 1.5;
  private readonly valleyAmplification = 0.7;
  private readonly peakThreshold = 0.6;
  
  constructor() {
    // Default configuration optimized for cardiac signals
    const config: ChannelConfig = {
      initialAmplification: 2.2,
      initialFilterStrength: 0.35,
      frequencyBandMin: 0.8,
      frequencyBandMax: 3.5
    };
    
    super(VitalSignType.CARDIAC, config);
  }
  
  /**
   * Apply specialized processing for cardiac signals
   */
  protected specializedProcessing(value: number): number {
    // Cardiac processing focuses on enhancing the QRS complex
    
    let processedValue = value;
    
    // Detect potential peaks
    const isPotentialPeak = this.isPotentialPeak(processedValue);
    
    if (isPotentialPeak) {
      // Enhance peaks for better detection
      processedValue *= this.peakAmplification;
    } else if (this.isPotentialValley(processedValue)) {
      // Dampen valleys to increase peak-valley difference
      processedValue *= this.valleyAmplification;
    }
    
    return processedValue;
  }
  
  /**
   * Check if the value might be part of a peak
   */
  private isPotentialPeak(value: number): boolean {
    if (this.recentValues.length < 3) return false;
    
    // Get recent values
    const recent = this.recentValues.slice(-3);
    
    // Simple peak detection - current value higher than threshold
    // and higher than previous values
    return value > this.peakThreshold && 
           value > recent[recent.length - 1] &&
           recent[recent.length - 1] > recent[recent.length - 2];
  }
  
  /**
   * Check if the value might be part of a valley
   */
  private isPotentialValley(value: number): boolean {
    if (this.recentValues.length < 3) return false;
    
    // Get recent values
    const recent = this.recentValues.slice(-3);
    
    // Simple valley detection - current value lower than previous values
    return value < recent[recent.length - 1] &&
           recent[recent.length - 1] < recent[recent.length - 2];
  }
}
