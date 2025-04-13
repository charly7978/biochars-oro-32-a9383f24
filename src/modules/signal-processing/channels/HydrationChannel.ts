/**
 * Specialized channel for hydration signal processing
 * Optimizes the signal specifically for hydration level measurement algorithms
 * Focuses on waveform characteristics related to blood volume and fluid balance
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * Hydration-specific channel implementation
 */
export class HydrationChannel extends SpecializedChannel {
  // Hydration-specific parameters
  private readonly AMPLITUDE_EMPHASIS = 1.2;   // Emphasis on amplitude variations
  private readonly LOW_FREQ_WEIGHT = 0.65;     // Higher weight for low frequencies (fluid balance)
  private readonly HIGH_FREQ_WEIGHT = 0.35;    // Lower weight for high frequencies
  
  // Buffers for analysis
  private waveformBuffer: number[] = [];
  private readonly WAVEFORM_BUFFER_SIZE = 60;
  private amplitudeRatios: number[] = [];
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.HYDRATION, config);
  }
  
  /**
   * Apply hydration-specific optimization to the signal
   * - Emphasizes amplitude changes related to tissue water content
   * - Enhances low-frequency components correlated with fluid balance
   * - Detects subtle changes in pulse wave velocity
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Update waveform buffer for analysis
    this.updateWaveformBuffer(value);
    
    // Extract baseline (DC component)
    const baseline = this.calculateBaseline();
    
    // Enhance amplitude characteristics related to hydration
    const amplitudeEnhanced = this.enhanceAmplitude(value, baseline);
    
    // Apply frequency weighting to emphasize hydration-related components
    const frequencyOptimized = this.applyFrequencyWeighting(value, baseline);
    
    // Calculate pulse wave features
    const pulseWaveComponent = this.calculatePulseWaveFeatures(value, baseline);
    
    // Combine components with appropriate weighting
    return baseline + 
           (amplitudeEnhanced * 0.4) + 
           (frequencyOptimized * 0.4) + 
           (pulseWaveComponent * 0.2);
  }
  
  /**
   * Update buffer for waveform analysis
   */
  private updateWaveformBuffer(value: number): void {
    this.waveformBuffer.push(value);
    
    if (this.waveformBuffer.length > this.WAVEFORM_BUFFER_SIZE) {
      this.waveformBuffer.shift();
      
      // When buffer is full, calculate amplitude ratios
      this.calculateAmplitudeRatios();
    }
  }
  
  /**
   * Calculate amplitude ratios that correlate with hydration levels
   * Higher amplitude ratio typically indicates better hydration
   */
  private calculateAmplitudeRatios(): void {
    if (this.waveformBuffer.length < 10) return;
    
    // Find peaks and troughs in the buffer
    const { peaks, troughs } = this.findPeaksTroughs(this.waveformBuffer);
    
    if (peaks.length > 1 && troughs.length > 1) {
      // Calculate amplitude ratio (peak-to-trough height / peak interval)
      const amplitudes = [];
      const intervals = [];
      
      for (let i = 0; i < peaks.length - 1; i++) {
        const peakIdx = peaks[i];
        const nextPeakIdx = peaks[i + 1];
        
        // Find trough between peaks
        const troughsBetween = troughs.filter(t => t > peakIdx && t < nextPeakIdx);
        if (troughsBetween.length > 0) {
          const troughIdx = troughsBetween[0];
          
          const peakValue = this.waveformBuffer[peakIdx];
          const troughValue = this.waveformBuffer[troughIdx];
          const amplitude = peakValue - troughValue;
          
          amplitudes.push(amplitude);
          intervals.push(nextPeakIdx - peakIdx);
        }
      }
      
      // Calculate ratio
      if (amplitudes.length > 0 && intervals.length > 0) {
        const avgAmplitude = amplitudes.reduce((sum, amp) => sum + amp, 0) / amplitudes.length;
        const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
        
        this.amplitudeRatios.push(avgAmplitude / (avgInterval || 1));
        
        // Keep history limited
        if (this.amplitudeRatios.length > 5) {
          this.amplitudeRatios.shift();
        }
      }
    }
  }
  
  /**
   * Find peaks and troughs in a signal buffer
   */
  private findPeaksTroughs(buffer: number[]): { peaks: number[], troughs: number[] } {
    const peaks: number[] = [];
    const troughs: number[] = [];
    
    // Simple peak/trough detection
    for (let i = 2; i < buffer.length - 2; i++) {
      // Check for peak (local maximum)
      if (buffer[i] > buffer[i-1] && buffer[i] > buffer[i-2] &&
          buffer[i] > buffer[i+1] && buffer[i] > buffer[i+2]) {
        peaks.push(i);
      }
      
      // Check for trough (local minimum)
      if (buffer[i] < buffer[i-1] && buffer[i] < buffer[i-2] &&
          buffer[i] < buffer[i+1] && buffer[i] < buffer[i+2]) {
        troughs.push(i);
      }
    }
    
    return { peaks, troughs };
  }
  
  /**
   * Calculate the baseline (DC component)
   */
  private calculateBaseline(): number {
    if (this.recentValues.length < 5) {
      return 0;
    }
    
    // Use median for more stable baseline
    const sorted = [...this.recentValues].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[midIndex - 1] + sorted[midIndex]) / 2
      : sorted[midIndex];
  }
  
  /**
   * Enhance amplitude characteristics related to hydration
   */
  private enhanceAmplitude(value: number, baseline: number): number {
    if (this.recentValues.length < 10) {
      return value - baseline;
    }
    
    // Amplitude enhancement based on recent values
    const recentAmplitude = Math.max(...this.recentValues) - Math.min(...this.recentValues);
    
    // Apply enhancement factor (higher for signals with stronger amplitude)
    const enhancementFactor = this.AMPLITUDE_EMPHASIS * (1 + Math.min(0.5, recentAmplitude / 10));
    
    return (value - baseline) * enhancementFactor;
  }
  
  /**
   * Apply frequency weighting for hydration-related components
   */
  private applyFrequencyWeighting(value: number, baseline: number): number {
    if (this.recentValues.length < 10) {
      return value - baseline;
    }
    
    // Separate into low and high frequency components (simplified)
    const lowFreqComponent = this.extractLowFrequencyComponent();
    const highFreqComponent = (value - baseline) - lowFreqComponent;
    
    // Apply weighting and combine
    return (lowFreqComponent * this.LOW_FREQ_WEIGHT) + 
           (highFreqComponent * this.HIGH_FREQ_WEIGHT);
  }
  
  /**
   * Extract low frequency component using simple moving average
   */
  private extractLowFrequencyComponent(): number {
    if (this.recentValues.length < 8) {
      return 0;
    }
    
    // Use recent values to calculate a smoothed component (low-pass filter)
    const window = this.recentValues.slice(-8);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    
    // Subtract baseline for the AC component
    const baseline = this.calculateBaseline();
    return avg - baseline;
  }
  
  /**
   * Calculate pulse wave features related to hydration
   */
  private calculatePulseWaveFeatures(value: number, baseline: number): number {
    if (this.recentValues.length < 15 || this.amplitudeRatios.length === 0) {
      return value - baseline;
    }
    
    // Average amplitude ratio (correlates with hydration levels)
    const avgRatio = this.amplitudeRatios.reduce((sum, r) => sum + r, 0) / 
                     this.amplitudeRatios.length;
    
    // Emphasize based on amplitude ratio (higher ratio = better hydration)
    const emphasisFactor = Math.min(1.5, 0.8 + (avgRatio * 0.5));
    
    return (value - baseline) * emphasisFactor;
  }
  
  /**
   * Reset channel state
   */
  public override reset(): void {
    super.reset();
    this.waveformBuffer = [];
    this.amplitudeRatios = [];
  }
  
  /**
   * Get average amplitude ratio for hydration assessment
   */
  public getAmplitudeRatio(): number {
    if (this.amplitudeRatios.length === 0) return 0;
    
    return this.amplitudeRatios.reduce((sum, r) => sum + r, 0) / 
           this.amplitudeRatios.length;
  }
}
