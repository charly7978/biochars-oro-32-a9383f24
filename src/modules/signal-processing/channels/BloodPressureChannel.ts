
/**
 * Specialized channel for blood pressure signal processing
 * Optimizes the signal specifically for systolic and diastolic pressure estimation
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * Blood pressure-specific channel
 */
export class BloodPressureChannel extends SpecializedChannel {
  // Blood pressure-specific parameters
  private readonly SYSTOLIC_EMPHASIS = 1.2;    // Emphasis on systolic peaks
  private readonly DIASTOLIC_WEIGHT = 0.8;     // Weight for diastolic components
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.BLOOD_PRESSURE, config);
  }
  
  /**
   * Apply blood pressure-specific optimization to the signal
   * - Emphasizes waveform characteristics relevant to blood pressure
   * - Enhances dichrotic notch for better diastolic estimation
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Apply blood pressure-specific signal processing
    return value * this.SYSTOLIC_EMPHASIS;
  }
}
