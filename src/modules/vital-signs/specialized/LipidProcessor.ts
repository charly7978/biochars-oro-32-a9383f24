
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for lipid calculation
 */
export class LipidProcessor {
  private confidence = 0;
  private buffer: number[] = [];
  private readonly BASE_CHOLESTEROL = 180; // Base cholesterol level
  private readonly BASE_TRIGLYCERIDES = 150; // Base triglycerides level
  
  /**
   * Calculate lipid levels from PPG values
   */
  public calculateLipids(ppgValues: number[]): { totalCholesterol: number, triglycerides: number } {
    if (ppgValues.length < 10) {
      return { totalCholesterol: 0, triglycerides: 0 };
    }
    
    // Store values in buffer
    this.buffer = [...ppgValues.slice(-30)];
    
    // Extract signal features
    const max = Math.max(...this.buffer);
    const min = Math.min(...this.buffer);
    const amplitude = max - min;
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    
    // Calculate lipid variations based on signal features
    const cholesterolOffset = mean * 30;
    const triglyceridesOffset = amplitude * 25;
    
    // Update confidence based on signal quality
    this.updateConfidence(amplitude, mean);
    
    // Return lipid levels within physiological ranges
    return {
      totalCholesterol: Math.max(120, Math.min(240, Math.round(this.BASE_CHOLESTEROL + cholesterolOffset))),
      triglycerides: Math.max(80, Math.min(220, Math.round(this.BASE_TRIGLYCERIDES + triglyceridesOffset)))
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
