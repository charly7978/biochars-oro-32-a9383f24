
/**
 * Hydration processor implementation
 * Processes PPG signals to estimate hydration levels
 */

import { ISignalProcessor } from '../signal-processing/types';

export class HydrationProcessor {
  private readonly BASE_HYDRATION = 65; // Base hydration percentage
  private readonly BASE_CHOLESTEROL = 180; // Base cholesterol level (mg/dL)
  private confidence: number = 0.5;
  private lastHydrationLevel: number = 0;
  
  constructor() {
    console.log("HydrationProcessor: Initialized");
  }
  
  /**
   * Calculate hydration from PPG signal values
   */
  public calculateHydration(ppgValues: number[]): {
    totalCholesterol: number;
    hydrationPercentage: number;
  } {
    if (!ppgValues || ppgValues.length < 5) {
      return {
        totalCholesterol: this.BASE_CHOLESTEROL,
        hydrationPercentage: this.BASE_HYDRATION
      };
    }
    
    // Analyze PPG signal characteristics
    // Higher amplitude and regular rhythm often correlate with better hydration
    const signalValues = ppgValues.slice(-20); // Use last 20 values
    const signalAmplitude = Math.max(...signalValues) - Math.min(...signalValues);
    const signalVariability = this.calculateVariability(signalValues);
    
    // Calculate hydration percentage
    // Higher amplitude generally indicates better hydration
    // Higher variability might indicate dehydration
    let hydrationAdjustment = signalAmplitude * 5 - signalVariability * 3;
    hydrationAdjustment = Math.min(Math.max(hydrationAdjustment, -15), 15);
    
    const hydrationPercentage = Math.min(100, Math.max(45, Math.round(this.BASE_HYDRATION + hydrationAdjustment)));
    this.lastHydrationLevel = hydrationPercentage;
    
    // Calculate cholesterol level (inverse relationship with hydration)
    // This is a simplified model for demonstration
    const cholesterolAdjustment = (75 - hydrationPercentage) * 1.5;
    const totalCholesterol = Math.round(this.BASE_CHOLESTEROL + cholesterolAdjustment);
    
    // Calculate confidence based on signal quality
    this.confidence = this.calculateConfidence(signalValues, signalAmplitude, signalVariability);
    
    return {
      totalCholesterol,
      hydrationPercentage
    };
  }
  
  /**
   * Get the confidence level of the last calculation
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Calculate the variability of a signal
   */
  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate confidence based on signal quality metrics
   */
  private calculateConfidence(values: number[], amplitude: number, variability: number): number {
    if (values.length < 5) return 0.1;
    
    // Higher amplitude generally means better signal (up to a point)
    const amplitudeConfidence = Math.min(amplitude * 5, 1);
    
    // Lower variability generally means more stable signal (up to a point)
    const stabilityConfidence = Math.max(0, 1 - (variability / 2));
    
    // Length confidence - more data points mean better confidence
    const lengthConfidence = Math.min(values.length / 20, 1);
    
    // Weighted average of confidence factors
    return (amplitudeConfidence * 0.4) + (stabilityConfidence * 0.4) + (lengthConfidence * 0.2);
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.lastHydrationLevel = 0;
    this.confidence = 0.5;
  }

  /**
   * Get diagnostic information
   */
  public getDiagnostics(): any {
    return {
      confidence: this.confidence,
      lastHydrationLevel: this.lastHydrationLevel,
      baselines: {
        hydration: this.BASE_HYDRATION,
        cholesterol: this.BASE_CHOLESTEROL
      }
    };
  }
}
