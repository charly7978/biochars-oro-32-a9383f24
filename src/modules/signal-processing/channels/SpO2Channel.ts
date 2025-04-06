
/**
 * Specialized channel for SpO2 signal processing
 * Optimizes the signal specifically for oxygen saturation measurement
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * SpO2-specific parameters
 */
export class SpO2Channel extends SpecializedChannel {
  // SpO2-specific parameters
  private readonly RED_INTENSITY_WEIGHT = 0.7;
  private readonly MIN_PULSE_AMPLITUDE = 0.01;
  
  constructor() {
    const config: ChannelConfig = {
      initialAmplification: 1.5,
      initialFilterStrength: 0.4,
      frequencyBandMin: 0.5,  // Hz - typical pulse frequency range
      frequencyBandMax: 3.0   // Hz
    };
    
    super(VitalSignType.SPO2, config);
  }
  
  /**
   * Apply SpO2-specific optimization to the signal
   * - Emphasizes pulsatile components 
   * - Optimizes for light absorption data characteristic of SpO2
   */
  protected specializedProcessing(value: number): number {
    if (Math.abs(value) < this.MIN_PULSE_AMPLITUDE) {
      return value;
    }
    
    // Apply frequency-domain emphasis for pulse components
    return this.applyPulseEmphasis(value);
  }
  
  /**
   * Apply emphasis to pulsatile components that are important for SpO2
   */
  private applyPulseEmphasis(value: number): number {
    if (this.recentValues.length < 3) {
      return value;
    }
    
    // SpO2 needs strong pulsatility detection
    // Amplify changes that are in physiological pulse range
    const prev1 = this.recentValues[this.recentValues.length - 1];
    const prev2 = this.recentValues[this.recentValues.length - 2]; 
    
    // Calculate first derivative (rate of change)
    const derivative1 = value - prev1;
    const derivative2 = prev1 - prev2;
    
    // If we have a sign change in derivative (potential peak or valley)
    // which is important for SpO2 calculation, emphasize it
    if (Math.sign(derivative1) !== Math.sign(derivative2) && 
        Math.abs(derivative1) > this.MIN_PULSE_AMPLITUDE) {
      // Emphasize this feature as it's likely a pulse component
      const emphasis = 1.2;
      return value * emphasis;
    }
    
    return value;
  }
}
