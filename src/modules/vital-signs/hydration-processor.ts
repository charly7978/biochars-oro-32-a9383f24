
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hydration processor implementation
 * Calculates hydration percentage from PPG signal characteristics
 */

import { VitalSignsResult } from "./types/vital-signs-result";

/**
 * Processor for hydration measurements
 */
export class HydrationProcessor {
  // Default values for measurements
  private readonly BASE_HYDRATION = 65; // % baseline hydration level
  private readonly MIN_HYDRATION = 45; // % minimum physiological level
  private readonly MAX_HYDRATION = 100; // % maximum physiological level
  private readonly BASE_CHOLESTEROL = 180; // mg/dL (kept for compatibility)

  // Tracking values for stability
  private lastHydrationEstimate: number = 65; // Initial mid-range value
  private hydrationHistory: number[] = [];
  private confidence: number = 0;
  private readonly HISTORY_SIZE = 5; // Number of values to keep for smoothing
  
  /**
   * Calculate hydration percentage and cholesterol
   * @param ppgValues PPG signal values
   * @returns Hydration result with cholesterol and hydration percentage
   */
  public calculateHydration(ppgValues: number[]): { totalCholesterol: number, hydrationPercentage: number } {
    if (!ppgValues || ppgValues.length < 10) {
      return {
        totalCholesterol: this.BASE_CHOLESTEROL,
        hydrationPercentage: this.lastHydrationEstimate
      };
    }

    // Calculate signal characteristics
    const signalMin = Math.min(...ppgValues.slice(-15));
    const signalMax = Math.max(...ppgValues.slice(-15));
    const amplitude = Math.max(0.01, signalMax - signalMin);
    
    // Extract representative value
    const lastValues = ppgValues.slice(-30);
    const meanValue = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
    
    // Calculate hydration based on signal characteristics
    let hydrationPercentage = this.calculateHydrationFromSignal(amplitude, meanValue, ppgValues);
    
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
    this.updateConfidence(amplitude, ppgValues);
    
    // Return both cholesterol (maintained for compatibility) and hydration
    return {
      totalCholesterol: Math.round(this.BASE_CHOLESTEROL + ((this.lastHydrationEstimate - this.BASE_HYDRATION) * 0.5)),
      hydrationPercentage: Math.round(this.lastHydrationEstimate)
    };
  }

  /**
   * Update confidence based on signal quality
   */
  private updateConfidence(amplitude: number, ppgValues: number[]): void {
    if (ppgValues.length < 10) {
      this.confidence = 0;
      return;
    }
    
    // Calculate signal stability
    const recent = ppgValues.slice(-10);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    // Higher variance reduces confidence (unstable signal)
    const stabilityFactor = Math.max(0, 1 - Math.min(1, variance * 2));
    
    // Amplitude factor (higher amplitude generally means better signal)
    const amplitudeFactor = Math.min(1, amplitude * 2);
    
    // Combine factors for overall confidence
    this.confidence = Math.min(0.9, stabilityFactor * 0.6 + amplitudeFactor * 0.4);
  }
  
  /**
   * Calculate hydration percentage from signal characteristics
   */
  private calculateHydrationFromSignal(amplitude: number, meanValue: number, ppgValues: number[]): number {
    // Non-linear mapping of signal characteristics to hydration level
    const ampFactor = Math.max(0, Math.min(2, amplitude * 5));
    
    let hydration;
    if (ampFactor < 0.5) {
      // Low amplitude often indicates dehydration
      hydration = this.MIN_HYDRATION + (ampFactor * 20);
    } else if (ampFactor < 1.2) {
      // Mid-range is typical of normal hydration
      hydration = this.MIN_HYDRATION + 10 + (ampFactor * 25);
    } else {
      // Higher amplitude usually indicates good hydration
      hydration = this.BASE_HYDRATION + ((ampFactor - 1.2) * 15);
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
   * Get current confidence level
   */
  public getConfidence(): number {
    return this.confidence;
  }

  /**
   * Reset processor state
   */
  public reset(): void {
    this.lastHydrationEstimate = 65;
    this.hydrationHistory = [];
    this.confidence = 0;
  }

  /**
   * Get diagnostics - empty implementation to satisfy interface requirements
   */
  public getDiagnostics(): Record<string, any> {
    return {
      confidence: this.confidence,
      lastEstimate: this.lastHydrationEstimate,
      historySize: this.hydrationHistory.length
    };
  }
}
