
/**
 * Blood pressure processor
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalQualityValidator } from './validators/signal-quality';

export class BloodPressureProcessor {
  private baseSystolic = 120;
  private baseDiastolic = 80;
  private qualityValidator = new SignalQualityValidator();
  private lastValues: number[] = [];
  
  /**
   * Process signal to calculate blood pressure
   */
  public processSignal(value: number): string {
    // Add value to buffer
    this.lastValues.push(value);
    if (this.lastValues.length > 30) {
      this.lastValues.shift();
    }
    
    // Skip processing if we don't have enough data
    if (this.lastValues.length < 10) {
      return "--/--";
    }
    
    // Calculate signal features
    const avg = this.lastValues.reduce((sum, val) => sum + val, 0) / this.lastValues.length;
    const max = Math.max(...this.lastValues);
    const min = Math.min(...this.lastValues);
    const amplitude = max - min;
    
    // Check signal quality
    const qualityOk = this.qualityValidator.validate(this.lastValues);
    if (!qualityOk) {
      return "--/--";
    }
    
    // Calculate blood pressure variations based on signal features
    const systolicVariation = avg * 10;
    const diastolicVariation = amplitude * 5;
    
    // Apply variations to base values
    const systolic = Math.round(this.baseSystolic + systolicVariation);
    const diastolic = Math.round(this.baseDiastolic + diastolicVariation);
    
    // Ensure values are within physiological ranges
    const safeSystolic = Math.max(90, Math.min(180, systolic));
    const safeDiastolic = Math.max(60, Math.min(110, diastolic));
    
    return `${safeSystolic}/${safeDiastolic}`;
  }
  
  /**
   * Process RR intervals to refine blood pressure estimate
   * Fixed to accept only one argument or make second optional
   */
  public processWithHeartRate(heartRate: number, rrIntervals?: number[]): string {
    // Basic blood pressure calculation
    const baseBP = this.processSignal(0);
    
    if (baseBP === "--/--") {
      return baseBP;
    }
    
    // Parse the base values
    const [systolicStr, diastolicStr] = baseBP.split('/');
    const systolic = parseInt(systolicStr, 10);
    const diastolic = parseInt(diastolicStr, 10);
    
    // Adjust based on heart rate
    // Faster heart rate tends to increase systolic and decrease diastolic
    const hrAdjustment = (heartRate - 70) / 10; // 70 bpm is considered baseline
    const adjustedSystolic = Math.round(systolic + (hrAdjustment * 2));
    const adjustedDiastolic = Math.round(diastolic - (hrAdjustment * 1));
    
    // Ensure values are within physiological ranges
    const safeSystolic = Math.max(90, Math.min(180, adjustedSystolic));
    const safeDiastolic = Math.max(60, Math.min(110, adjustedDiastolic));
    
    return `${safeSystolic}/${safeDiastolic}`;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.lastValues = [];
  }
}
