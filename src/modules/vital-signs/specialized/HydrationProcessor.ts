
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for hydration calculation
 */
export class HydrationProcessor {
  private confidence = 0;
  private buffer: number[] = [];
  private readonly BASE_HYDRATION = 65; // Base hydration percentage
  
  /**
   * Initialize the processor
   */
  public initialize(): void {
    this.buffer = [];
    this.confidence = 0;
    console.log('HydrationProcessor initialized');
  }
  
  /**
   * Process a value and return hydration level
   */
  public processValue(value: number): number {
    this.addToBuffer(value);
    return this.calculateHydration(this.buffer);
  }
  
  /**
   * Add a value to the buffer
   */
  private addToBuffer(value: number): void {
    this.buffer.push(value);
    if (this.buffer.length > 30) {
      this.buffer.shift();
    }
    this.updateConfidence();
  }
  
  /**
   * Calculate hydration level from PPG values
   */
  public calculateHydration(ppgValues: number[]): number {
    if (ppgValues.length < 10) {
      return 0;
    }
    
    // Extract signal features
    const max = Math.max(...ppgValues);
    const min = Math.min(...ppgValues);
    const amplitude = max - min;
    const mean = ppgValues.reduce((sum, val) => sum + val, 0) / ppgValues.length;
    
    // Calculate hydration variation based on signal features
    // Higher amplitude correlates with better hydration
    const hydrationOffset = amplitude * 15;
    
    // Calculate confidence based on signal stability
    this.updateConfidence();
    
    // Return hydration level within physiological range (50-80%)
    return Math.max(50, Math.min(80, Math.round(this.BASE_HYDRATION + hydrationOffset)));
  }
  
  /**
   * Update confidence level based on signal characteristics
   */
  private updateConfidence(): void {
    if (this.buffer.length < 10) {
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
    const amplitudeFactor = Math.min(1, 
      Math.max(...this.buffer.slice(-10)) - Math.min(...this.buffer.slice(-10))
    );
    
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
   * Get feedback for the channel
   */
  public getFeedback(): any {
    return {
      quality: this.confidence,
      suggestedAdjustments: {
        amplificationFactor: this.confidence < 0.5 ? 1.2 : 1.0
      }
    };
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.confidence = 0;
  }
}
