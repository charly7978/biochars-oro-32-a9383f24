
/**
 * Specialized channel for cardiac signal processing
 * Optimizes the signal specifically for heart rate and arrhythmia detection
 * Focuses on QRS complex and beat-to-beat characteristics
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * Cardiac-specific channel
 */
export class CardiacChannel extends SpecializedChannel {
  // Cardiac-specific parameters
  private readonly PEAK_EMPHASIS = 1.4;          // Emphasis on cardiac peaks
  private readonly SLOPE_WEIGHT = 0.7;           // Weight for slope components
  private readonly RHYTHM_WEIGHT = 0.3;          // Weight for rhythm components
  
  // Peak-related tracking
  private peakBuffer: Array<{value: number, interval: number}> = [];
  private lastPeakTime: number = 0;
  private readonly PEAK_BUFFER_SIZE = 10;
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.CARDIAC, config);
  }
  
  /**
   * Apply cardiac-specific optimization to the signal
   * - Emphasizes QRS complex for beat detection
   * - Enhances beat-to-beat variability for arrhythmia
   * - Preserves slope characteristics for feature extraction
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Extract baseline
    const baseline = this.calculateBaseline();
    
    // Detect and track peaks
    this.detectPeak(value, baseline);
    
    // Enhance peak components (equivalent to QRS complex)
    const peakComponent = this.enhancePeakComponent(value, baseline);
    
    // Enhance rhythm components (for arrhythmia detection)
    const rhythmComponent = this.enhanceRhythmComponent(value, baseline);
    
    // Combine components with cardiac-specific weighting
    const combinedValue = baseline + 
                         (peakComponent * this.SLOPE_WEIGHT) +
                         (rhythmComponent * this.RHYTHM_WEIGHT);
    
    // Apply cardiac-specific emphasis
    return combinedValue * this.PEAK_EMPHASIS;
  }
  
  /**
   * Calculate baseline specific to cardiac signal
   */
  private calculateBaseline(): number {
    if (this.recentValues.length < 5) {
      return 0;
    }
    
    // For cardiac signals, baseline should adapt more quickly
    // Use a more responsive baseline calculation
    
    // Sort values and pick median as baseline
    const sorted = [...this.recentValues].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  
  /**
   * Detect and track cardiac peaks
   */
  private detectPeak(value: number, baseline: number): void {
    if (this.recentValues.length < 5) {
      return;
    }
    
    const recentValues = this.recentValues.slice(-3);
    
    // Check for peak (middle value higher than neighbors)
    if (recentValues.length >= 3 && 
        recentValues[1] > recentValues[0] &&
        recentValues[1] > recentValues[2] &&
        recentValues[1] > baseline + 0.1) {
      
      const now = Date.now();
      const interval = this.lastPeakTime > 0 ? now - this.lastPeakTime : 0;
      
      // Only accept physiologically plausible intervals
      if (interval === 0 || (interval > 300 && interval < 2000)) {
        // Record this peak
        this.peakBuffer.push({
          value: recentValues[1],
          interval: interval
        });
        
        // Update last peak time
        this.lastPeakTime = now;
        
        // Trim buffer if needed
        if (this.peakBuffer.length > this.PEAK_BUFFER_SIZE) {
          this.peakBuffer.shift();
        }
      }
    }
  }
  
  /**
   * Enhance peak components for better QRS detection
   */
  private enhancePeakComponent(value: number, baseline: number): number {
    if (this.recentValues.length < 5) {
      return value - baseline;
    }
    
    // Calculate slope (first derivative)
    const recentValues = this.recentValues.slice(-3);
    const slopes: number[] = [];
    
    for (let i = 1; i < recentValues.length; i++) {
      slopes.push(recentValues[i] - recentValues[i-1]);
    }
    
    // Enhance positive slopes (upslope of QRS)
    const currentSlope = slopes[slopes.length - 1];
    const prevSlope = slopes.length > 1 ? slopes[slopes.length - 2] : 0;
    
    // Emphasize sharp transition points (high slope followed by slope change)
    let slopeEmphasis = 1.0;
    if (Math.abs(currentSlope) > 0.05 && Math.sign(currentSlope) !== Math.sign(prevSlope)) {
      slopeEmphasis = 1.5;
    }
    
    // Apply peak enhancement based on slope characteristics
    return (value - baseline) * (1 + Math.abs(currentSlope) * 3) * slopeEmphasis;
  }
  
  /**
   * Enhance rhythm components for arrhythmia detection
   */
  private enhanceRhythmComponent(value: number, baseline: number): number {
    if (this.peakBuffer.length < 2) {
      return value - baseline;
    }
    
    // Calculate rhythm regularity
    const intervals = this.peakBuffer.map(peak => peak.interval).filter(i => i > 0);
    
    if (intervals.length < 2) {
      return value - baseline;
    }
    
    // Calculate variability metrics
    const meanInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    
    // Calculate interval variation coefficient
    const intervalVariation = intervals.reduce((sum, i) => sum + Math.abs(i - meanInterval), 0) / intervals.length;
    
    // Normalize variation to 0-1 range (0 = completely regular, 1 = highly irregular)
    const normalizedVariation = Math.min(1, intervalVariation / (meanInterval * 0.5));
    
    // Enhance signal based on rhythm characteristics
    return (value - baseline) * (1 + normalizedVariation);
  }
}
