
/**
 * Specialized processor for hydration percentage calculation
 * based on PPG signal characteristics
 */
import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';

/**
 * Result structure for hydration processing
 */
export interface HydrationResult {
  hydrationPercentage: number;
  confidence: number;
}

/**
 * Processor for extracting hydration percentage from PPG signal
 */
export class HydrationProcessor extends BaseVitalSignProcessor<HydrationResult> {
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly MIN_SAMPLES_FOR_CALCULATION = 20;
  private signalValues: number[] = [];
  private lastResult: HydrationResult = { hydrationPercentage: 50, confidence: 0 };
  private confidenceLevel: number = 0;
  private samplesProcessed: number = 0;
  
  constructor() {
    super();
    this.reset();
  }
  
  /**
   * Process a single PPG value to extract hydration information
   * @param value Filtered PPG value
   * @returns Hydration result with percentage and confidence
   */
  public processValue(value: number): HydrationResult {
    // Add to buffer
    this.signalValues.push(value);
    if (this.signalValues.length > this.MAX_BUFFER_SIZE) {
      this.signalValues.shift();
    }
    
    this.samplesProcessed++;
    
    // Calculate hydration if enough samples
    if (this.signalValues.length >= this.MIN_SAMPLES_FOR_CALCULATION) {
      const hydrationPercentage = this.calculateHydrationPercentage();
      const confidence = this.calculateConfidence();
      
      this.lastResult = {
        hydrationPercentage,
        confidence
      };
      
      return this.lastResult;
    }
    
    return this.lastResult;
  }
  
  /**
   * Reset the processor state
   */
  public reset(): void {
    this.signalValues = [];
    this.lastResult = { hydrationPercentage: 50, confidence: 0 };
    this.confidenceLevel = 0;
    this.samplesProcessed = 0;
  }
  
  /**
   * Calculate hydration percentage from PPG signal characteristics
   * @returns Hydration percentage (0-100)
   */
  private calculateHydrationPercentage(): number {
    if (this.signalValues.length < this.MIN_SAMPLES_FOR_CALCULATION) {
      return 50; // Default value
    }
    
    // Calculate signal properties
    const min = Math.min(...this.signalValues);
    const max = Math.max(...this.signalValues);
    const amplitude = max - min;
    const mean = this.signalValues.reduce((sum, val) => sum + val, 0) / this.signalValues.length;
    
    // Calculate variations
    const variations = this.signalValues.map(val => Math.abs(val - mean));
    const meanVariation = variations.reduce((sum, val) => sum + val, 0) / variations.length;
    
    // Signal characteristics related to hydration
    // Higher amplitude and consistent waveform correlate with better hydration
    const amplitudeFactor = Math.min(1.5, Math.max(0.5, amplitude / 10)); 
    const variationFactor = Math.min(1.2, Math.max(0.8, 1 - (meanVariation / 5)));
    
    // Calculate baseline hydration (40-90% range)
    let hydrationBase = 65; // Average baseline
    
    // Apply factors
    let hydrationPercentage = hydrationBase * amplitudeFactor * variationFactor;
    
    // Ensure result is within physiological range (30-90%)
    return Math.min(90, Math.max(30, Math.round(hydrationPercentage)));
  }
  
  /**
   * Calculate confidence in the hydration measurement
   * @returns Confidence level (0-1)
   */
  private calculateConfidence(): number {
    // Base confidence starts low
    let confidence = 0.3;
    
    // More samples increase confidence
    confidence += Math.min(0.3, this.signalValues.length / this.MAX_BUFFER_SIZE);
    
    // Signal consistency increases confidence
    if (this.signalValues.length >= 10) {
      const recent = this.signalValues.slice(-10);
      const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const variations = recent.map(val => Math.abs(val - mean));
      const stdDev = Math.sqrt(variations.reduce((sum, val) => sum + (val * val), 0) / variations.length);
      
      const normalizedStdDev = stdDev / mean;
      if (normalizedStdDev < 0.2) {
        confidence += 0.2;
      }
    }
    
    // Increase confidence with more samples processed
    confidence += Math.min(0.2, this.samplesProcessed / 300);
    
    return Math.min(0.9, confidence);
  }
  
  /**
   * Get the last calculated result
   * @returns Last calculated hydration result
   */
  public getLastResult(): HydrationResult {
    return this.lastResult;
  }
  
  /**
   * Get confidence level in current measurement
   * @returns Confidence level (0-1)
   */
  public getConfidence(): number {
    return this.lastResult.confidence;
  }
}
