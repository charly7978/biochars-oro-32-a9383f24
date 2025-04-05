
/**
 * Specialized processor for hydration percentage estimation
 * Analyzes PPG waveform characteristics to estimate hydration levels
 */
import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';

export interface HydrationResult {
  hydrationPercentage: number;
  confidence: number;
}

export class HydrationProcessor extends BaseVitalSignProcessor<HydrationResult> {
  private readonly MIN_SAMPLES_REQUIRED = 45;
  private readonly BASELINE_SAMPLES = 15;
  private readonly WINDOW_SIZE = 5;
  private baselineValues: number[] = [];
  private hasBaseline = false;
  private lastValidResult: HydrationResult = {
    hydrationPercentage: 0,
    confidence: 0
  };
  
  constructor() {
    super();
    this.reset();
  }
  
  /**
   * Process a PPG signal value to estimate hydration percentage
   * @param value Filtered PPG signal value
   * @returns Hydration result with confidence
   */
  public processValue(value: number): HydrationResult {
    // Add value to buffer for analysis
    this.buffer.push(value);
    
    // Maintain buffer size
    if (this.buffer.length > this.MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    
    // Establish baseline if needed
    if (!this.hasBaseline) {
      this.baselineValues.push(value);
      if (this.baselineValues.length >= this.BASELINE_SAMPLES) {
        this.hasBaseline = true;
      }
      return this.lastValidResult;
    }
    
    // Need minimum samples for accurate calculation
    if (this.buffer.length < this.MIN_SAMPLES_REQUIRED) {
      return this.lastValidResult;
    }
    
    // Calculate hydration based on signal characteristics
    const hydrationPercentage = this.calculateHydrationPercentage();
    const confidence = this.calculateConfidence();
    
    // Only update last valid result if confidence is good
    if (confidence > 0.3) {
      this.lastValidResult = {
        hydrationPercentage,
        confidence
      };
    }
    
    return this.lastValidResult;
  }
  
  /**
   * Reset the processor to initial state
   */
  public reset(): void {
    this.buffer = [];
    this.baselineValues = [];
    this.hasBaseline = false;
    this.lastValidResult = {
      hydrationPercentage: 0,
      confidence: 0
    };
  }
  
  /**
   * Calculate estimated hydration percentage from signal characteristics
   * @returns Estimated hydration percentage (0-100)
   */
  private calculateHydrationPercentage(): number {
    // Get recent values for analysis
    const recentValues = this.buffer.slice(-this.MIN_SAMPLES_REQUIRED);
    
    // Calculate signal characteristics related to hydration
    const amplitude = this.calculateAmplitude(recentValues);
    const waveformComplexity = this.calculateWaveformComplexity(recentValues);
    const signalStability = this.calculateSignalStability(recentValues);
    
    // Baseline amplitude for comparison
    const baselineAmplitude = this.calculateAmplitude(this.baselineValues);
    
    // Calculate relative amplitude (indicator of hydration)
    const relativeAmplitude = baselineAmplitude > 0 ? 
                            amplitude / baselineAmplitude : 0;
    
    // Apply formula for hydration estimation
    // Based on amplitude, waveform complexity and signal stability
    let hydration = 50 + (relativeAmplitude * 15) +
                  (waveformComplexity * 10) + (signalStability * 20);
    
    // Restrict to valid range
    hydration = Math.max(0, Math.min(100, hydration));
    
    return Math.round(hydration);
  }
  
  /**
   * Calculate confidence level for the hydration estimation
   * @returns Confidence value (0-1)
   */
  private calculateConfidence(): number {
    // Not enough data for confidence
    if (this.buffer.length < this.MIN_SAMPLES_REQUIRED) {
      return 0;
    }
    
    // Calculate signal quality factors
    const stability = this.calculateSignalStability(this.buffer);
    const noise = this.calculateNoiseLevel(this.buffer);
    const consistency = this.calculateValueConsistency(this.buffer);
    
    // Combined confidence based on quality factors
    const confidence = (stability * 0.4) + ((1 - noise) * 0.4) + (consistency * 0.2);
    
    return Math.min(0.95, confidence);
  }
  
  /**
   * Calculate amplitude of signal (max - min)
   * @param values Array of signal values
   * @returns Signal amplitude
   */
  private calculateAmplitude(values: number[]): number {
    if (values.length === 0) return 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max - min;
  }
  
  /**
   * Calculate waveform complexity using sliding window
   * @param values Array of signal values
   * @returns Complexity value (0-1)
   */
  private calculateWaveformComplexity(values: number[]): number {
    if (values.length < this.WINDOW_SIZE) return 0;
    
    let complexitySum = 0;
    let windowCount = 0;
    
    // Use sliding window to analyze complexity
    for (let i = 0; i <= values.length - this.WINDOW_SIZE; i++) {
      const window = values.slice(i, i + this.WINDOW_SIZE);
      const windowVariance = this.calculateVariance(window);
      complexitySum += windowVariance;
      windowCount++;
    }
    
    // Normalize to 0-1 range
    const avgComplexity = windowCount > 0 ? complexitySum / windowCount : 0;
    return this.normalizeComplexity(avgComplexity);
  }
  
  /**
   * Calculate signal stability
   * @param values Array of signal values
   * @returns Stability value (0-1)
   */
  private calculateSignalStability(values: number[]): number {
    if (values.length < 3) return 0;
    
    // Calculate moving average
    const movingAvg = [];
    for (let i = 2; i < values.length; i++) {
      const avg = (values[i] + values[i-1] + values[i-2]) / 3;
      movingAvg.push(avg);
    }
    
    // Calculate average deviation from moving average
    let deviation = 0;
    for (let i = 0; i < movingAvg.length; i++) {
      deviation += Math.abs(values[i+2] - movingAvg[i]);
    }
    
    const avgDeviation = deviation / movingAvg.length;
    
    // Calculate stability (inverse of normalized deviation)
    return 1 - this.normalizeDeviation(avgDeviation);
  }
  
  /**
   * Calculate noise level in signal
   * @param values Array of signal values
   * @returns Noise level (0-1)
   */
  private calculateNoiseLevel(values: number[]): number {
    if (values.length < 4) return 0;
    
    let noiseSum = 0;
    
    // Measure high-frequency components
    for (let i = 1; i < values.length; i++) {
      noiseSum += Math.abs(values[i] - values[i-1]);
    }
    
    const avgNoise = noiseSum / (values.length - 1);
    return this.normalizeNoise(avgNoise);
  }
  
  /**
   * Calculate consistency of values
   * @param values Array of signal values
   * @returns Consistency value (0-1)
   */
  private calculateValueConsistency(values: number[]): number {
    if (values.length < 4) return 0;
    
    // Calculate standard deviation
    const stdDev = this.calculateStandardDeviation(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Coefficient of variation
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 1;
    
    // Convert to consistency (inverse of CV)
    return 1 - Math.min(1, cv);
  }
  
  /**
   * Calculate variance of values
   * @param values Array of values
   * @returns Variance value
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Calculate standard deviation
   * @param values Array of values
   * @returns Standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }
  
  /**
   * Normalize complexity value to 0-1 range
   * @param complexity Raw complexity value
   * @returns Normalized complexity
   */
  private normalizeComplexity(complexity: number): number {
    // Empirical normalization based on expected range
    const normalizer = 0.02;
    return Math.min(1, complexity / normalizer);
  }
  
  /**
   * Normalize deviation to 0-1 range
   * @param deviation Raw deviation value
   * @returns Normalized deviation
   */
  private normalizeDeviation(deviation: number): number {
    // Empirical normalization based on expected range
    const normalizer = 0.2;
    return Math.min(1, deviation / normalizer);
  }
  
  /**
   * Normalize noise to 0-1 range
   * @param noise Raw noise value
   * @returns Normalized noise
   */
  private normalizeNoise(noise: number): number {
    // Empirical normalization based on expected range
    const normalizer = 0.1;
    return Math.min(1, noise / normalizer);
  }
  
  /**
   * Get diagnostic information
   * @returns Diagnostic data object
   */
  public getDiagnosticInfo(): any {
    return {
      bufferSize: this.buffer.length,
      hasBaseline: this.hasBaseline,
      baselineSampleCount: this.baselineValues.length,
      lastProcessedValue: this.lastProcessedValue,
      lastConfidence: this.lastValidResult.confidence,
      lastHydration: this.lastValidResult.hydrationPercentage
    };
  }
}
