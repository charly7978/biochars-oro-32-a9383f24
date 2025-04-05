
/**
 * Hydration processor implementation
 * Specialized in analyzing PPG waveform characteristics related to hydration
 */

import { SignalProcessor } from '../signal-processing/types';

export class HydrationProcessor {
  private readonly BASE_HYDRATION = 65; // Base hydration percentage
  private signalBuffer: number[] = [];
  private readonly BUFFER_SIZE = 30;
  private lastHydrationValue: number = 0;
  private bufferFilled: boolean = false;
  
  /**
   * Calculate hydration percentage from PPG signal values
   * Based on waveform characteristics that correlate with tissue water content
   */
  public calculateHydration(ppgValues: number[]): number {
    // Add values to buffer
    for (const value of ppgValues) {
      this.signalBuffer.push(value);
      if (this.signalBuffer.length > this.BUFFER_SIZE) {
        this.signalBuffer.shift();
        this.bufferFilled = true;
      }
    }
    
    // Need minimum data for meaningful analysis
    if (!this.bufferFilled || this.signalBuffer.length < 15) {
      return this.BASE_HYDRATION;
    }
    
    try {
      // Calculate amplitude ratio (higher ratio often correlates with better hydration)
      const amplitudeRatio = this.calculateAmplitudeRatio();
      
      // Calculate waveform symmetry (more symmetrical waveforms often indicate better hydration)
      const waveformSymmetry = this.calculateWaveformSymmetry();
      
      // Calculate pulse transit time features
      const pulseTransitFeature = this.calculatePulseTransitFeature();
      
      // Combine features with appropriate weights
      const hydrationScore = (
        amplitudeRatio * 0.4 + 
        waveformSymmetry * 0.4 + 
        pulseTransitFeature * 0.2
      );
      
      // Map to physiological range (45-85%)
      const hydrationPercentage = Math.min(85, Math.max(45, 
        this.BASE_HYDRATION + (hydrationScore * 20) - 10
      ));
      
      // Smooth changes to prevent unrealistic jumps
      this.lastHydrationValue = this.lastHydrationValue === 0 ? 
        hydrationPercentage : 
        0.7 * this.lastHydrationValue + 0.3 * hydrationPercentage;
      
      return Math.round(this.lastHydrationValue);
    } catch (error) {
      console.error("Error calculating hydration:", error);
      return this.BASE_HYDRATION;
    }
  }
  
  /**
   * Calculate amplitude ratio that correlates with hydration levels
   * Higher amplitude ratio typically indicates better hydration
   */
  private calculateAmplitudeRatio(): number {
    const { peaks, troughs } = this.findPeaksTroughs();
    if (peaks.length < 2 || troughs.length < 2) {
      return 0.5; // Default value
    }
    
    // Calculate average peak-to-trough amplitude
    let totalAmplitude = 0;
    let validPairs = 0;
    
    for (let i = 0; i < peaks.length - 1; i++) {
      const peakIdx = peaks[i];
      const nextPeakIdx = peaks[i + 1];
      
      // Find trough between peaks
      const troughsBetween = troughs.filter(t => t > peakIdx && t < nextPeakIdx);
      if (troughsBetween.length > 0) {
        const troughIdx = troughsBetween[0];
        
        const peakValue = this.signalBuffer[peakIdx];
        const troughValue = this.signalBuffer[troughIdx];
        const amplitude = peakValue - troughValue;
        
        totalAmplitude += amplitude;
        validPairs++;
      }
    }
    
    if (validPairs === 0) return 0.5;
    
    const avgAmplitude = totalAmplitude / validPairs;
    const normalizedAmplitude = Math.min(1, Math.max(0, avgAmplitude / 0.2));
    
    return normalizedAmplitude;
  }
  
  /**
   * Calculate waveform symmetry
   * More symmetrical waveforms can indicate better hydration
   */
  private calculateWaveformSymmetry(): number {
    const { peaks, troughs } = this.findPeaksTroughs();
    if (peaks.length < 2 || troughs.length < 2) {
      return 0.5; // Default value
    }
    
    // Calculate symmetry of waveform segments
    let totalSymmetry = 0;
    let validSegments = 0;
    
    for (let i = 0; i < peaks.length - 1; i++) {
      const peakIdx = peaks[i];
      const nextPeakIdx = peaks[i + 1];
      
      // Find trough between peaks
      const troughsBetween = troughs.filter(t => t > peakIdx && t < nextPeakIdx);
      if (troughsBetween.length > 0) {
        const troughIdx = troughsBetween[0];
        
        // Calculate rising and falling times
        const risingTime = troughIdx - peakIdx;
        const fallingTime = nextPeakIdx - troughIdx;
        
        // Perfect symmetry would have equal rising and falling times
        const symmetry = 1 - Math.abs(risingTime - fallingTime) / (risingTime + fallingTime);
        
        totalSymmetry += symmetry;
        validSegments++;
      }
    }
    
    if (validSegments === 0) return 0.5;
    
    return totalSymmetry / validSegments;
  }
  
  /**
   * Calculate pulse transit features that correlate with hydration
   * Faster transit times can indicate better hydration
   */
  private calculatePulseTransitFeature(): number {
    // Simple feature based on detection of pulse waves
    const { peaks } = this.findPeaksTroughs();
    if (peaks.length < 3) {
      return 0.5; // Default value
    }
    
    // Calculate average intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    // Normalize: lower intervals (faster pulses) often correlate with better hydration
    const normalizedInterval = Math.min(1, Math.max(0, 1 - (avgInterval - 5) / 15));
    
    return normalizedInterval;
  }
  
  /**
   * Find peaks and troughs in the signal buffer
   */
  private findPeaksTroughs(): { peaks: number[], troughs: number[] } {
    const peaks: number[] = [];
    const troughs: number[] = [];
    
    // Simple peak/trough detection
    for (let i = 2; i < this.signalBuffer.length - 2; i++) {
      // Check for peak (local maximum)
      if (this.signalBuffer[i] > this.signalBuffer[i-1] && 
          this.signalBuffer[i] > this.signalBuffer[i-2] &&
          this.signalBuffer[i] > this.signalBuffer[i+1] && 
          this.signalBuffer[i] > this.signalBuffer[i+2]) {
        peaks.push(i);
      }
      
      // Check for trough (local minimum)
      if (this.signalBuffer[i] < this.signalBuffer[i-1] && 
          this.signalBuffer[i] < this.signalBuffer[i-2] &&
          this.signalBuffer[i] < this.signalBuffer[i+1] && 
          this.signalBuffer[i] < this.signalBuffer[i+2]) {
        troughs.push(i);
      }
    }
    
    return { peaks, troughs };
  }
  
  /**
   * Process value directly (alternative API)
   */
  public processValue(value: number): number {
    return this.calculateHydration([value]);
  }
  
  /**
   * Get confidence in the hydration measurement
   */
  public getConfidence(): number {
    if (!this.bufferFilled) return 0.1;
    const bufferRatio = Math.min(1, this.signalBuffer.length / this.BUFFER_SIZE);
    return Math.min(0.9, bufferRatio * 0.9);
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.signalBuffer = [];
    this.lastHydrationValue = 0;
    this.bufferFilled = false;
  }
}
