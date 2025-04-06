
import { SpecializedChannel } from './SpecializedChannel';
import { VitalSignType } from '../../../types/vital-sign-types';

/**
 * Specialized channel for blood pressure signal processing
 */
export class BloodPressureChannel extends SpecializedChannel {
  private systolicFactor: number = 1.2;
  private diastolicFactor: number = 0.8;
  private pulseWeight: number = 0.3;
  
  constructor() {
    // Default configuration optimized for blood pressure signals
    const config = {
      initialAmplification: 1.3,
      initialFilterStrength: 0.25,
      frequencyBandMin: 0.5,
      frequencyBandMax: 2.0
    };
    
    super(VitalSignType.BLOOD_PRESSURE, config);
  }
  
  /**
   * Apply specialized processing for blood pressure signals
   */
  protected specializedProcessing(value: number): number {
    // Blood pressure requires analyzing both systolic and pulse component
    
    // Here we apply a specialized transformation focusing on the
    // physiological characteristics of blood pressure signals
    let processedValue = value;
    
    // Include a pulse wavelet component
    if (this.recentValues.length > 0) {
      const pulseFactor = Math.cos(this.recentValues.length * 0.2) * this.pulseWeight;
      processedValue = processedValue * (1 + pulseFactor);
      
      // Adjust based on signal history
      const avgValue = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
      if (processedValue > avgValue) {
        // Enhance systolic component
        processedValue *= this.systolicFactor;
      } else {
        // Enhance diastolic component
        processedValue *= this.diastolicFactor;
      }
    }
    
    return processedValue;
  }
  
  /**
   * Override applyChannelProcessing to integrate specialized processing
   */
  protected applyChannelProcessing(value: number): number {
    // Apply base processing first
    const baseProcessed = super.applyChannelProcessing(value);
    
    // Apply specialized processing
    return this.specializedProcessing(baseProcessed);
  }
}
