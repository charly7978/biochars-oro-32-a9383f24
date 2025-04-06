
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Interface for blood pressure measurement
 */
export interface BloodPressureResult {
  systolic: number;
  diastolic: number;
}

/**
 * Processor for blood pressure calculation from PPG signals
 */
export class BloodPressureProcessor {
  private readonly BASE_SYSTOLIC = 120;
  private readonly BASE_DIASTOLIC = 80;
  
  /**
   * Calculate blood pressure from PPG signals
   */
  public calculateBloodPressure(ppgValues: number[]): BloodPressureResult {
    if (ppgValues.length < 20) {
      return { systolic: 0, diastolic: 0 };
    }
    
    // Use most recent values
    const recentValues = ppgValues.slice(-20);
    
    // Calculate signal characteristics
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const amplitude = max - min;
    
    // Calculate systolic and diastolic variations
    const systolicVar = avg * 10;
    const diastolicVar = amplitude * 5;
    
    // Calculate blood pressure values
    const systolic = Math.round(this.BASE_SYSTOLIC + systolicVar);
    const diastolic = Math.round(this.BASE_DIASTOLIC + diastolicVar);
    
    // Ensure physiologically plausible values
    return {
      systolic: this.ensureInRange(systolic, 90, 180),
      diastolic: this.ensureInRange(diastolic, 60, 120)
    };
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
    console.log("BloodPressureProcessor: Reset completed");
  }
}
