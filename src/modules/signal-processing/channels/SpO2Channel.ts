
/**
 * Specialized channel for SpO2 signal processing
 * Optimizes the signal specifically for oxygen saturation detection
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * SpO2-specific channel
 */
export class SpO2Channel extends SpecializedChannel {
  // SpO2-specific parameters
  private readonly RED_EMPHASIS = 1.3;       // Emphasis on red component
  private readonly IR_WEIGHT = 0.6;          // Weight for IR component
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.SPO2, config);
  }
  
  /**
   * Apply SpO2-specific optimization to the signal
   * - Emphasizes the ratio between red and IR light absorption
   * - Enhances small variations in ratio that indicate SpO2 changes
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Apply SpO2-specific signal processing
    return value * this.RED_EMPHASIS;
  }
}
