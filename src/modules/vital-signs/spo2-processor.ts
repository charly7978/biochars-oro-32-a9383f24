
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { calculateAC, calculateDC } from './utils';

export class SpO2Processor {
  private readonly SPO2_BUFFER_SIZE = 10;
  private spo2Buffer: number[] = [];
  private lastValidSpo2: number = 0;
  private confidenceLevel: number = 0;
  private readonly MIN_CONFIDENCE = 0.6;

  /**
   * Calculates the oxygen saturation (SpO2) from real PPG values
   * No simulation or reference values are used
   */
  public calculateSpO2(values: number[]): number {
    if (values.length < 30) {
      return this.getLastValidSpo2(0.5);
    }

    try {
      // Calculate DC component (baseline)
      const dc = calculateDC(values);
      if (dc <= 0) {
        console.log("SpO2Processor: Invalid DC component (zero or negative)");
        return this.getLastValidSpo2(0.5);
      }

      // Calculate AC component (pulsatile)
      const ac = calculateAC(values);
      if (ac <= 0) {
        console.log("SpO2Processor: Invalid AC component (zero or negative)");
        return this.getLastValidSpo2(0.4);
      }

      // Calculate R value (normalized ratio of AC to DC)
      const ratio = ac / dc;
      
      // Empirical formula for SpO2 calculation
      // Based on Beer-Lambert Law and calibration curves
      let spo2 = 110 - (25 * ratio);
      
      // Ensure spo2 is within physiological range (70-100%)
      spo2 = Math.min(100, Math.max(70, spo2));
      
      // Calculate confidence based on signal quality
      const signalToNoiseRatio = ac / (dc * 0.1);
      this.confidenceLevel = Math.min(1, Math.max(0, signalToNoiseRatio / 5));
      
      // Only consider high confidence measurements for the buffer
      if (this.confidenceLevel >= this.MIN_CONFIDENCE) {
        this.addToBuffer(Math.round(spo2));
        this.lastValidSpo2 = this.getAverageFromBuffer();
        return this.lastValidSpo2;
      }
      
      // Return last valid value with reduced confidence
      return this.getLastValidSpo2(this.confidenceLevel);
    } catch (error) {
      console.error("SpO2Processor: Error during SpO2 calculation", error);
      return this.getLastValidSpo2(0.1);
    }
  }

  /**
   * Add SpO2 value to buffer
   */
  private addToBuffer(spo2: number): void {
    this.spo2Buffer.push(spo2);
    if (this.spo2Buffer.length > this.SPO2_BUFFER_SIZE) {
      this.spo2Buffer.shift();
    }
  }

  /**
   * Calculate average SpO2 from buffer
   */
  private getAverageFromBuffer(): number {
    if (this.spo2Buffer.length === 0) return 0;
    
    const sum = this.spo2Buffer.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.spo2Buffer.length);
  }

  /**
   * Get last valid SpO2 value
   */
  private getLastValidSpo2(confidenceMultiplier: number = 1): number {
    // Apply confidence reduction
    const effectiveConfidence = this.confidenceLevel * confidenceMultiplier;
    
    // For very low confidence, return 0
    if (effectiveConfidence < 0.3) return 0;
    
    return this.lastValidSpo2;
  }

  /**
   * Get current confidence level
   */
  public getConfidence(): number {
    return this.confidenceLevel;
  }

  /**
   * Reset processor
   */
  public reset(): void {
    this.spo2Buffer = [];
    this.lastValidSpo2 = 0;
    this.confidenceLevel = 0;
  }
}
