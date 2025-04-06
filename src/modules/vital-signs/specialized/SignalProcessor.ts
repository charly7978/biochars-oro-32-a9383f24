
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Processor for signal filtering and preparation
 */
export class SignalProcessor {
  private ppgValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 300;
  private readonly SMA_WINDOW_SIZE = 5;
  
  /**
   * Apply Simple Moving Average filter to smooth signal
   */
  public applySMAFilter(value: number): number {
    // Add value to buffer
    this.ppgValues.push(value);
    
    // Limit buffer size
    if (this.ppgValues.length > this.MAX_BUFFER_SIZE) {
      this.ppgValues.shift();
    }
    
    // Apply SMA if we have enough values
    if (this.ppgValues.length >= this.SMA_WINDOW_SIZE) {
      const windowValues = this.ppgValues.slice(-this.SMA_WINDOW_SIZE);
      return windowValues.reduce((sum, val) => sum + val, 0) / this.SMA_WINDOW_SIZE;
    }
    
    return value;
  }
  
  /**
   * Get current PPG values buffer
   */
  public getPPGValues(): number[] {
    return this.ppgValues;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.ppgValues = [];
    console.log("SignalProcessor: Reset completed");
  }
}
