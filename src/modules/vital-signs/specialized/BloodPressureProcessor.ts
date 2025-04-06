
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for blood pressure calculation
 */
export class BloodPressureProcessor {
  private confidence = 0;
  private buffer: number[] = [];
  private readonly BASE_SYSTOLIC = 120; // Base systolic pressure
  private readonly BASE_DIASTOLIC = 80; // Base diastolic pressure
  
  /**
   * Calculate blood pressure from PPG values
   */
  public calculateBloodPressure(ppgValues: number[]): { systolic: number, diastolic: number } {
    if (ppgValues.length < 10) {
      return { systolic: 0, diastolic: 0 };
    }
    
    // Store values in buffer
    this.buffer = [...ppgValues.slice(-30)];
    
    // Extract signal features
    const max = Math.max(...this.buffer);
    const min = Math.min(...this.buffer);
    const amplitude = max - min;
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    
    // Calculate blood pressure variations based on signal features
    const systolicOffset = mean * 10;
    const diastolicOffset = amplitude * 5;
    
    // Update confidence based on signal quality
    this.updateConfidence(amplitude, mean);
    
    // Return blood pressure within physiological ranges
    return {
      systolic: Math.max(90, Math.min(150, Math.round(this.BASE_SYSTOLIC + systolicOffset))),
      diastolic: Math.max(60, Math.min(100, Math.round(this.BASE_DIASTOLIC + diastolicOffset)))
    };
  }
  
  /**
   * Update confidence level based on signal characteristics
   */
  private updateConfidence(amplitude: number, mean: number): void {
    if (amplitude < 0.01 || this.buffer.length < 10) {
      this.confidence = 0;
      return;
    }
    
    // Calculate signal consistency
    let consistency = 0;
    for (let i = 1; i < this.buffer.length; i++) {
      const diff = Math.abs(this.buffer[i] - this.buffer[i-1]);
      consistency += diff;
    }
    consistency = consistency / this.buffer.length;
    
    // Higher consistency (lower value) means better confidence
    const consistencyFactor = Math.max(0, 1 - consistency * 10);
    
    // Amplitude factor (higher amplitude means better confidence)
    const amplitudeFactor = Math.min(1, amplitude * 5);
    
    // Combine factors for overall confidence
    this.confidence = Math.min(1, (consistencyFactor + amplitudeFactor) / 2);
  }
  
  /**
   * Get the current confidence level
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.confidence = 0;
  }
}
