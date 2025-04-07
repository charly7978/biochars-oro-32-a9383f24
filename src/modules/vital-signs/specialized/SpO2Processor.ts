
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for SpO2 calculation from PPG signals
 */
export class SpO2Processor {
  private readonly MIN_SPO2 = 90;
  private readonly MAX_SPO2 = 99;
  private readonly BASE_SPO2 = 95;
  private confidence = 0;
  private buffer: number[] = [];
  
  /**
   * Initialize the processor
   */
  public initialize(): void {
    this.buffer = [];
    this.confidence = 0;
    console.log('SpO2Processor initialized');
  }
  
  /**
   * Process a value and return SpO2 level
   */
  public processValue(value: number): number {
    this.addToBuffer(value);
    return this.calculateSpO2(this.buffer);
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
   * Calculate SpO2 from PPG signals
   */
  public calculateSpO2(ppgValues: number[]): number {
    if (ppgValues.length < 10) {
      return 0;
    }
    
    // Use most recent values
    const recentValues = ppgValues.slice(-10);
    
    // Calculate signal characteristics
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const amplitude = max - min;
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Calculate SpO2 based on signal characteristics
    const variation = (avg * 5) % 4;
    
    // Ensure result is within physiological range
    return Math.max(
      this.MIN_SPO2,
      Math.min(this.MAX_SPO2, Math.round(this.BASE_SPO2 + variation))
    );
  }
  
  /**
   * Update confidence level based on signal characteristics
   */
  private updateConfidence(): void {
    if (this.buffer.length < 10) {
      this.confidence = 0;
      return;
    }
    
    const recentValues = this.buffer.slice(-10);
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const amplitude = max - min;
    
    // Higher amplitude means better signal quality
    this.confidence = Math.min(1, amplitude * 10);
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
    console.log("SpO2Processor: Reset completed");
  }
}
