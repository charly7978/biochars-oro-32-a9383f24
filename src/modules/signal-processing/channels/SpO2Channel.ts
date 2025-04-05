
/**
 * SpO2 specialized channel
 */

import { VitalSignType } from '../../../types/signal';
import { SpecializedChannel } from './SpecializedChannel';

/**
 * Channel optimized for SpO2 signal extraction
 */
export class SpO2Channel extends SpecializedChannel {
  private readonly RED_WEIGHT = 0.7;
  private readonly IR_WEIGHT = 0.3;
  private readonly AC_EMPHASIS = 1.2;
  private readonly DC_SUPPRESSION = 0.7;
  private readonly NOISE_THRESHOLD = 0.05;
  
  private lastValues: number[] = [];
  private readonly BUFFER_SIZE = 10;
  
  /**
   * Constructor
   */
  constructor() {
    super(VitalSignType.SPO2);
    this.amplification = 1.2; // Higher amplification for SpO2
    this.filterStrength = 0.6; // Stronger filtering for SpO2
  }
  
  /**
   * Process signal with SpO2-specific optimizations
   */
  protected override specializedProcessing(value: number): number {
    // Store the value for analysis
    this.lastValues.push(value);
    if (this.lastValues.length > this.BUFFER_SIZE) {
      this.lastValues.shift();
    }
    
    // Not enough values yet for full processing
    if (this.lastValues.length < 3) {
      return value;
    }
    
    // Calculate baseline
    const baseline = this.calculateBaseline();
    
    // Extract AC component (pulsatile)
    const ac = value - baseline;
    
    // Enhance AC component for better SpO2 estimation
    const enhancedAc = ac * this.AC_EMPHASIS;
    
    // Reduce DC component for better SNR
    const reducedDc = baseline * this.DC_SUPPRESSION;
    
    // Improved SpO2-optimized signal
    const spo2Signal = reducedDc + enhancedAc;
    
    // Noise reduction
    return this.reduceNoise(spo2Signal);
  }
  
  /**
   * Calculate signal baseline (DC component)
   */
  private calculateBaseline(): number {
    if (this.lastValues.length < 3) {
      return this.lastValues[0] || 0;
    }
    
    // Simple moving average for baseline
    return this.lastValues.reduce((sum, val) => sum + val, 0) / this.lastValues.length;
  }
  
  /**
   * Reduce noise in the signal
   */
  private reduceNoise(value: number): number {
    if (this.lastValues.length < 3) {
      return value;
    }
    
    // Check for excessive noise
    const last = this.lastValues[this.lastValues.length - 1] || 0;
    const secondLast = this.lastValues[this.lastValues.length - 2] || 0;
    
    const diff = Math.abs(value - last);
    const prevDiff = Math.abs(last - secondLast);
    
    // If current change is much larger than previous change, it might be noise
    if (diff > prevDiff * 3 && diff > this.NOISE_THRESHOLD) {
      // Reduce the influence of the noise spike
      return last + (value - last) * 0.3;
    }
    
    return value;
  }
  
  /**
   * Apply weighted emphasis on red/IR components
   * This is specific to SpO2 calculation
   */
  public applySpO2Weights(redValue: number, irValue: number): number {
    return redValue * this.RED_WEIGHT + irValue * this.IR_WEIGHT;
  }
  
  /**
   * Reset channel state
   */
  public override reset(): void {
    super.reset();
    this.lastValues = [];
    this.amplification = 1.2; // Higher amplification for SpO2
    this.filterStrength = 0.6; // Stronger filtering for SpO2
  }
  
  /**
   * Update quality calculation with SpO2-specific metrics
   */
  public calculateQuality(redValue: number, irValue: number): number {
    // Calculate ratio
    const ratio = irValue !== 0 ? redValue / irValue : 0;
    
    // Update quality based on ratio validity
    if (ratio > 0.3 && ratio < 1.0) {
      return Math.min(1.0, super.getQuality() + 0.1);
    } else {
      return Math.max(0.0, super.getQuality() - 0.1);
    }
  }
}
