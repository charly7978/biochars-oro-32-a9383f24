
/**
 * Specialized channel for SpO2 measurement
 */
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * SpO2 optimized signal channel
 */
export class SpO2Channel extends SpecializedChannel {
  // SpO2-specific parameters
  private readonly redSignalWeight: number = 0.7;
  private readonly irSignalWeight: number = 0.3;
  private readonly acEmphasisFactor: number = 1.5;
  
  // Buffer for derived metrics
  private perfusionIndex: number = 0;
  private acComponent: number = 0;
  private dcComponent: number = 0;
  
  /**
   * Constructor
   */
  constructor(config: ChannelConfig) {
    super(VitalSignType.SPO2, config);
  }
  
  /**
   * Apply SpO2-specific optimization
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // SpO2 optimization - emphasize AC component which carries oxygen information
    
    // Update DC component (slow-moving baseline)
    if (this.recentValues.length > 0) {
      // DC is the moving average with heavy smoothing
      const lastDC = this.dcComponent;
      const alpha = 0.95; // Strong smoothing factor
      this.dcComponent = lastDC * alpha + value * (1 - alpha);
    } else {
      this.dcComponent = value;
    }
    
    // Extract AC component (pulsatile signal)
    const ac = value - this.dcComponent;
    
    // Emphasize AC component which carries SpO2 information
    const emphasizedAC = ac * this.acEmphasisFactor;
    
    // Combine with enhanced AC component for SpO2 optimization
    const optimizedValue = this.dcComponent + emphasizedAC;
    
    // Update AC metric using rectified AC
    const alpha = 0.8; // Smoothing factor
    this.acComponent = Math.abs(ac) * (1 - alpha) + this.acComponent * alpha;
    
    // Calculate perfusion index for quality assessment
    if (Math.abs(this.dcComponent) > 0.001) {
      this.perfusionIndex = this.acComponent / Math.abs(this.dcComponent);
    } else {
      this.perfusionIndex = 0;
    }
    
    return optimizedValue;
  }
  
  /**
   * Get SpO2-specific metrics
   */
  public getSpO2Metrics(): {
    perfusionIndex: number;
    acComponent: number;
    dcComponent: number;
    ratio: number;
  } {
    return {
      perfusionIndex: this.perfusionIndex,
      acComponent: this.acComponent,
      dcComponent: this.dcComponent,
      ratio: this.acComponent > 0 && this.dcComponent !== 0 ? 
        this.acComponent / Math.abs(this.dcComponent) : 0
    };
  }
  
  /**
   * Override updateQuality for SpO2-specific quality assessment
   */
  protected override updateQuality(): void {
    if (this.recentValues.length < 5) {
      this.quality = 0;
      return;
    }
    
    // Basic statistics
    const mean = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.recentValues.length;
    
    // Calculate SpO2-specific quality metrics
    
    // 1. Signal-to-noise ratio
    const snr = mean !== 0 ? Math.abs(mean / Math.sqrt(variance)) : 0;
    
    // 2. Perfusion quality - higher perfusion index generally means better SpO2 signal
    const perfusionQuality = Math.min(1, this.perfusionIndex * 20);
    
    // 3. Pulsatility - check if signal has cardiac component
    let pulsatilityScore = 0;
    if (this.recentValues.length >= 10) {
      // Analyze recent values for pulsatility
      const recentVals = this.recentValues.slice(-10);
      const diffs = [];
      for (let i = 1; i < recentVals.length; i++) {
        diffs.push(recentVals[i] - recentVals[i-1]);
      }
      
      // Count sign changes (indicates oscillations)
      let signChanges = 0;
      for (let i = 1; i < diffs.length; i++) {
        if ((diffs[i] > 0 && diffs[i-1] < 0) || (diffs[i] < 0 && diffs[i-1] > 0)) {
          signChanges++;
        }
      }
      
      // 2-5 sign changes in 10 samples is ideal for heart rate (40-120 BPM at 20Hz)
      pulsatilityScore = signChanges >= 2 && signChanges <= 5 ? 1 : (signChanges > 0 ? 0.5 : 0);
    }
    
    // Combine with appropriate weights for SpO2
    this.quality = Math.min(0.95, (
      snr * 0.3 +           // Signal-to-noise ratio
      perfusionQuality * 0.4 + // Perfusion quality
      pulsatilityScore * 0.3   // Pulsatility score
    ));
  }
}
