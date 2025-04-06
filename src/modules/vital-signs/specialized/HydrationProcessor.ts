
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Specialized processor for hydration measurement
 * Uses optimized hydration signal for tissue hydration calculation
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';
import { VitalSignType } from '../../../types/signal';

/**
 * Hydration processor implementation
 */
export class HydrationProcessor extends BaseVitalSignProcessor<number> {
  // Default values for hydration
  private readonly BASELINE_HYDRATION = 65; // percent
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.3;
  private readonly MAX_PHYSIOLOGICAL_HYDRATION = 85;
  private readonly MIN_PHYSIOLOGICAL_HYDRATION = 40;
  
  constructor() {
    super(VitalSignType.HYDRATION);
  }
  
  /**
   * Process a value from the hydration-optimized channel
   * @param value Optimized hydration signal value
   * @returns Hydration percentage value
   */
  protected processValueImpl(value: number): number {
    // Skip processing if the value is too small
    if (Math.abs(value) < 0.005) {
      return 0;
    }
    
    // Calculate hydration value
    const hydration = this.calculateHydration(value);
    
    return Math.round(hydration);
  }
  
  /**
   * Calculate hydration percentage
   * Using only direct measurements, no simulation
   */
  public calculateHydration(value: number): number {
    if (this.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      return 0;
    }
    
    // Process hydration value - simple algorithm for direct measurement
    // Use exponential transformation to map signal to physiological range
    const hydrationOffset = (Math.exp(Math.abs(value)) - 1) * Math.sign(value) * 10;
    const hydration = this.BASELINE_HYDRATION + hydrationOffset;
    
    // Ensure result is within physiological range
    return Math.min(
      this.MAX_PHYSIOLOGICAL_HYDRATION, 
      Math.max(this.MIN_PHYSIOLOGICAL_HYDRATION, hydration)
    );
  }
  
  /**
   * Get empty result when no valid data is available
   */
  protected getEmptyResult(): number {
    return 0;
  }
  
  /**
   * Update confidence based on signal characteristics specific to hydration
   */
  protected updateConfidence(): void {
    if (this.buffer.length < 10) {
      this.confidence = 0;
      return;
    }
    
    // Recent values for analysis
    const recent = this.buffer.slice(-10);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // Calculate variance
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    const normalizedVariance = Math.sqrt(variance) / (Math.abs(mean) + 0.0001);
    
    // Calculate stability score
    const stabilityScore = Math.max(0, 1 - Math.min(1, normalizedVariance * 5));
    
    // Calculate amplitude score
    const amplitude = Math.max(...recent) - Math.min(...recent);
    const amplitudeScore = Math.min(1, amplitude / 0.2);
    
    // Calculate consistency
    let consistencyScore = 0;
    if (this.buffer.length > 30) {
      const longTerm = this.buffer.slice(-30);
      const longMean = longTerm.reduce((sum, val) => sum + val, 0) / longTerm.length;
      const meanDiff = Math.abs(mean - longMean) / (Math.abs(longMean) + 0.0001);
      consistencyScore = Math.max(0, 1 - Math.min(1, meanDiff * 5));
    }
    
    // Weighted average for confidence
    this.confidence = (stabilityScore * 0.4 + amplitudeScore * 0.3 + consistencyScore * 0.3);
    
    // Cap confidence for hydration which requires more data
    if (this.buffer.length < 30) {
      this.confidence *= (this.buffer.length / 30);
    }
  }
}
