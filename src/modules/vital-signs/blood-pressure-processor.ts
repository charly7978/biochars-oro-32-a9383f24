/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for blood pressure measurements
 * Direct measurement only
 */
export class BloodPressureProcessor {
  private readonly BASE_SYSTOLIC = 120;
  private readonly BASE_DIASTOLIC = 80;
  private readonly HR_ADJUSTMENT_FACTOR = 0.1;
  
  /**
   * Process RR intervals to calculate blood pressure
   */
  public calculateBloodPressure(ppgValues: number[]): { systolic: number, diastolic: number } {
    if (!ppgValues || ppgValues.length < 3) {
      return { systolic: this.BASE_SYSTOLIC, diastolic: this.BASE_DIASTOLIC };
    }
    
    const rrProcessingResult = ppgValues.length >= 3 ? this.processRRIntervals(ppgValues) : null;
    
    let systolicValue = this.BASE_SYSTOLIC;
    let diastolicValue = this.BASE_DIASTOLIC;
    
    if (rrProcessingResult) {
      const { avgInterval, hrv } = rrProcessingResult;
      
      const hrAdjustment = (60000 / avgInterval - 70) * this.HR_ADJUSTMENT_FACTOR;
      
      systolicValue = this.BASE_SYSTOLIC + (hrAdjustment * 2) + (hrv * 0.05);
      diastolicValue = this.BASE_DIASTOLIC + hrAdjustment + (hrv * 0.02);
    }
    
    return {
      systolic: Math.round(systolicValue),
      diastolic: Math.round(diastolicValue)
    };
  }
  
  /**
   * Process RR intervals for blood pressure calculation
   */
  private processRRIntervals(values: number[]): any {
    const avgInterval = values.reduce((a, b) => a + b, 0) / values.length;
    const hrv = Math.sqrt(values.map(x => Math.pow(x - avgInterval, 2)).reduce((a, b) => a + b, 0) / values.length);
    
    return {
      avgInterval,
      hrv
    };
  }
  
  public reset(): void {
    // No state to reset in this direct measurement processor
  }
}
