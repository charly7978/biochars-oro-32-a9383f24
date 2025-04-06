
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType } from '../../../types/vital-sign-types';

/**
 * Processor for hydration estimation from PPG signals
 */
export class HydrationProcessor {
  private readonly BASE_HYDRATION = 65;
  private confidence: number = 0;
  private type: VitalSignType;
  
  constructor() {
    this.type = VitalSignType.HYDRATION;
  }
  
  /**
   * Calculate hydration percentage from PPG signals
   */
  public calculateHydration(ppgValues: number[]): number {
    if (ppgValues.length < 15) {
      this.confidence = 0;
      return 0;
    }
    
    // Use most recent values
    const recentValues = ppgValues.slice(-15);
    
    // Calculate signal characteristics
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const amplitude = max - min;
    
    // Calculate hydration variation based on signal characteristics
    const variation = (avg * 15) - (amplitude * 10);
    
    // Calculate hydration percentage
    const hydration = Math.round(this.BASE_HYDRATION + variation);
    
    // Update confidence
    this.confidence = this.calculateConfidence(recentValues);
    
    // Ensure physiologically plausible value
    return this.ensureInRange(hydration, 30, 90);
  }
  
  /**
   * Calculate confidence level based on signal quality
   */
  private calculateConfidence(values: number[]): number {
    // More data points means higher confidence
    const dataSizeConfidence = Math.min(values.length / 30, 1);
    
    // Calculate variance
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    let variance = 0;
    for (const val of values) {
      variance += Math.pow(val - avg, 2);
    }
    variance /= values.length;
    
    // Lower variance means more stable signal
    const stabilityConfidence = Math.max(0, 1 - (variance / 0.05));
    
    // Combine factors for overall confidence
    let overallConfidence = (dataSizeConfidence * 0.3) + (stabilityConfidence * 0.7);
    
    return Math.min(overallConfidence, 1);
  }
  
  /**
   * Get current confidence level
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Ensure value is within specified range
   */
  private ensureInRange(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.confidence = 0;
    console.log("HydrationProcessor: Reset completed");
  }
}
