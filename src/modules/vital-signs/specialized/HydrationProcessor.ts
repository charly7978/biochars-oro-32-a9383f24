
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Specialized processor for hydration measurement
 * Uses optimized hydration signal to calculate hydration levels
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';
import { VitalSignType, ChannelFeedback } from '../../../types/signal';

/**
 * Result interface for hydration measurements
 */
export interface HydrationResult {
  totalCholesterol: number; // Maintained for backward compatibility
  hydrationPercentage: number; // New hydration level (45-100%)
}

/**
 * Hydration processor implementation
 */
export class HydrationProcessor extends BaseVitalSignProcessor<HydrationResult> {
  // Default values for measurements
  private readonly BASE_CHOLESTEROL = 180; // mg/dL (kept for compatibility)
  private readonly MIN_HYDRATION = 45; // % minimum physiological level
  private readonly MAX_HYDRATION = 100; // % maximum physiological level
  private readonly OPTIMAL_HYDRATION = 70; // % optimal hydration level
  
  // Tracking values for stability
  private lastHydrationEstimate: number = 65; // Initial mid-range value
  private hydrationHistory: number[] = [];
  private readonly HISTORY_SIZE = 5; // Number of values to keep
  
  constructor() {
    super(VitalSignType.HYDRATION);
    console.log("HydrationProcessor initialized - replacing lipids functionality");
  }
  
  /**
   * Process a value from the hydration-optimized channel
   * @param value Optimized hydration signal value
   * @returns Estimated hydration values
   */
  protected processValueImpl(value: number): HydrationResult {
    // Skip processing if the value is too small
    if (Math.abs(value) < 0.01) {
      return { 
        totalCholesterol: this.BASE_CHOLESTEROL, 
        hydrationPercentage: this.lastHydrationEstimate 
      };
    }
    
    // Calculate hydration values based on signal characteristics
    const hydrationPercentage = this.calculateHydration(value);
    
    // Add to history for smoothing
    this.hydrationHistory.push(hydrationPercentage);
    if (this.hydrationHistory.length > this.HISTORY_SIZE) {
      this.hydrationHistory.shift();
    }
    
    // Calculate median for stability
    const sortedHydration = [...this.hydrationHistory].sort((a, b) => a - b);
    const medianHydration = this.hydrationHistory.length % 2 === 0
      ? (sortedHydration[this.hydrationHistory.length / 2 - 1] + sortedHydration[this.hydrationHistory.length / 2]) / 2
      : sortedHydration[Math.floor(this.hydrationHistory.length / 2)];
    
    // Store for future reference
    this.lastHydrationEstimate = medianHydration;
    
    // Return both cholesterol (maintained for compatibility) and hydration
    return {
      totalCholesterol: this.BASE_CHOLESTEROL + ((this.lastHydrationEstimate - this.OPTIMAL_HYDRATION) * 0.5),
      hydrationPercentage: Math.round(this.lastHydrationEstimate)
    };
  }
  
  /**
   * Calculate hydration percentage from signal characteristics
   */
  private calculateHydration(value: number): number {
    if (this.confidence < 0.2) {
      // If confidence is too low, return last estimate
      return this.lastHydrationEstimate;
    }
    
    // Extract signal characteristics that correlate with hydration
    const ampFactor = Math.max(0, Math.min(2, Math.abs(value) * 5));
    
    // Calculate baseline hydration level
    let hydration;
    
    // Non-linear mapping of signal characteristics to hydration level
    if (ampFactor < 0.5) {
      // Low amplitude often indicates dehydration
      hydration = this.MIN_HYDRATION + (ampFactor * 20);
    } else if (ampFactor < 1.2) {
      // Mid-range is typical of normal hydration
      hydration = this.MIN_HYDRATION + 10 + (ampFactor * 25);
    } else {
      // Higher amplitude usually indicates good hydration
      hydration = this.OPTIMAL_HYDRATION + ((ampFactor - 1.2) * 15);
    }
    
    // Apply confidence-based limiting to avoid extreme jumps
    const confLimit = 20 * this.confidence;
    const maxChange = Math.max(3, confLimit);
    
    // Limit change from previous value
    const limitedHydration = Math.max(
      this.lastHydrationEstimate - maxChange,
      Math.min(this.lastHydrationEstimate + maxChange, hydration)
    );
    
    // Ensure result is within physiological range
    return Math.min(this.MAX_HYDRATION, Math.max(this.MIN_HYDRATION, limitedHydration));
  }
  
  /**
   * Update confidence based on signal characteristics
   */
  protected override updateConfidence(): void {
    if (this.buffer.length < 5) {
      this.confidence = 0;
      return;
    }
    
    // Calculate signal stability
    const recent = this.buffer.slice(-10);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    // Higher variance reduces confidence (unstable signal)
    const stabilityFactor = Math.max(0, 1 - Math.min(1, variance * 2));
    
    // Calculate amplitude factor (higher amplitude generally means better signal)
    const minVal = Math.min(...recent);
    const maxVal = Math.max(...recent);
    const amplitude = maxVal - minVal;
    const amplitudeFactor = Math.min(1, amplitude * 2);
    
    // Combine factors for overall confidence
    this.confidence = Math.min(0.9, stabilityFactor * 0.6 + amplitudeFactor * 0.4);
  }
  
  /**
   * Reset processor
   */
  public override reset(): void {
    super.reset();
    this.lastHydrationEstimate = 65;
    this.hydrationHistory = [];
  }
}
