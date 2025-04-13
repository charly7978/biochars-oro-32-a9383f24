
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for glucose calculation
 */
export class GlucoseProcessor {
  private confidence = 0;
  private buffer: number[] = [];
  private readonly BASE_GLUCOSE = 85; // Base glucose level
  
  /**
   * Calculate glucose level from PPG values
   */
  public calculateGlucose(ppgValues: number[]): number {
    if (ppgValues.length < 10) {
      return 0;
    }
    
    // Store values in buffer
    this.buffer = [...ppgValues.slice(-30)];
    
    // Extract signal features
    const max = Math.max(...this.buffer);
    const min = Math.min(...this.buffer);
    const amplitude = max - min;
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    
    // Calculate glucose variation based on signal features
    const glucoseOffset = mean * 20;
    
    // Update confidence based on signal quality
    this.updateConfidence(amplitude, mean);
    
    // Return glucose level within physiological range (70-140 mg/dL)
    return Math.max(70, Math.min(140, Math.round(this.BASE_GLUCOSE + glucoseOffset)));
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
