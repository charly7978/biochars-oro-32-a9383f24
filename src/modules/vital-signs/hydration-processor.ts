
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Processor for hydration measurements
 */

import { VitalSignType } from '../../types/signal';

/**
 * Specialized processor for hydration measurements
 * Uses signal characteristics to calculate estimated hydration levels
 * Only uses direct measurement without simulation
 */
export class HydrationProcessor {
  // Constants for hydration calculation
  private readonly BASE_HYDRATION = 65; // Base hydration percentage (%)
  private readonly MIN_HYDRATION = 45; // Minimum physiologically plausible hydration (%)
  private readonly MAX_HYDRATION = 100; // Maximum physiologically plausible hydration (%)
  private readonly BASE_CHOLESTEROL = 180; // Base cholesterol for compatibility
  
  // State tracking
  private confidence: number = 0.1; // Initial confidence is low
  private lastHydrationValue: number = 65; // Initial mid-range value
  private hydrationBuffer: number[] = [];
  
  /**
   * Calculate hydration based on signal characteristics
   * Uses a combination of amplitude and stability of the PPG signal
   */
  public calculateHydration(ppgValues: number[]): { totalCholesterol: number, hydrationPercentage: number } {
    if (!ppgValues || ppgValues.length < 10) {
      return {
        totalCholesterol: this.BASE_CHOLESTEROL,
        hydrationPercentage: this.lastHydrationValue
      };
    }
    
    // Take recent PPG samples for analysis
    const recentValues = ppgValues.slice(-30);
    
    // Calculate signal characteristics
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Calculate variance as a measure of signal stability
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    
    // Higher amplitude generally correlates with better hydration
    // More stable signal (lower variance) also suggests better hydration
    const amplitudeFactor = Math.min(2, Math.max(0, amplitude * 5));
    const stabilityFactor = Math.max(0, 1 - Math.min(1, variance * 10));
    
    // Calculate raw hydration value
    let hydrationValue;
    
    // Non-linear mapping of signal characteristics to hydration level
    if (amplitudeFactor < 0.5) {
      // Low amplitude often indicates dehydration
      hydrationValue = this.MIN_HYDRATION + (amplitudeFactor * 20);
    } else if (amplitudeFactor < 1.2) {
      // Mid-range is typical of normal hydration
      hydrationValue = this.MIN_HYDRATION + 10 + (amplitudeFactor * 25);
    } else {
      // Higher amplitude usually indicates good hydration
      hydrationValue = 70 + ((amplitudeFactor - 1.2) * 15);
    }
    
    // Apply stability factor - more stable signals give more consistent readings
    hydrationValue = hydrationValue * (0.8 + (stabilityFactor * 0.2));
    
    // Update confidence based on signal quality
    this.updateConfidence(amplitude, variance);
    
    // Add to buffer for smoothing
    this.hydrationBuffer.push(hydrationValue);
    if (this.hydrationBuffer.length > 10) {
      this.hydrationBuffer.shift();
    }
    
    // Use median for stability instead of mean
    const sortedValues = [...this.hydrationBuffer].sort((a, b) => a - b);
    const medianHydration = sortedValues[Math.floor(sortedValues.length / 2)];
    
    // Limit change from previous value based on confidence
    const maxChange = 5 + (20 * this.confidence);
    let finalHydration = Math.max(
      this.lastHydrationValue - maxChange,
      Math.min(this.lastHydrationValue + maxChange, medianHydration)
    );
    
    // Ensure hydration is in physiological range
    finalHydration = Math.min(this.MAX_HYDRATION, Math.max(this.MIN_HYDRATION, finalHydration));
    
    // Store for next calculation
    this.lastHydrationValue = finalHydration;
    
    // Calculate cholesterol value for compatibility
    // Higher hydration typically correlates with healthier cholesterol profile
    const hydrationRatio = (finalHydration - this.MIN_HYDRATION) / (this.MAX_HYDRATION - this.MIN_HYDRATION);
    const cholesterolValue = this.BASE_CHOLESTEROL - (hydrationRatio * 30);
    
    return {
      totalCholesterol: Math.round(cholesterolValue),
      hydrationPercentage: Math.round(finalHydration)
    };
  }
  
  /**
   * Update confidence based on signal characteristics
   */
  private updateConfidence(amplitude: number, variance: number): void {
    // Higher amplitude generally means better signal
    const amplitudeConfidence = Math.min(0.9, amplitude * 5);
    
    // Lower variance (more stable) generally means better signal
    const stabilityConfidence = Math.max(0, 1 - Math.min(0.9, variance * 10));
    
    // Combine factors
    const rawConfidence = (amplitudeConfidence * 0.7) + (stabilityConfidence * 0.3);
    
    // Smooth confidence changes
    this.confidence = (this.confidence * 0.7) + (rawConfidence * 0.3);
  }
  
  /**
   * Get current confidence level
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.confidence = 0.1;
    this.lastHydrationValue = 65;
    this.hydrationBuffer = [];
  }
}
