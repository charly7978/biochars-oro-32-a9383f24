
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Validator for PPG signal quality and reliability
 */
export class SignalValidator {
  private readonly minAmplitude: number;
  private readonly minSamples: number;
  
  /**
   * Create a new signal validator
   * @param minAmplitude Minimum required signal amplitude
   * @param minSamples Minimum required number of samples
   */
  constructor(minAmplitude: number, minSamples: number) {
    this.minAmplitude = minAmplitude;
    this.minSamples = minSamples;
  }
  
  /**
   * Check if a single signal value is valid
   */
  public isValidSignal(value: number): boolean {
    // Value should not be zero or near-zero
    return Math.abs(value) > 0.01;
  }
  
  /**
   * Check if there are enough data points
   */
  public hasEnoughData(values: number[]): boolean {
    return values.length >= this.minSamples;
  }
  
  /**
   * Check if signal amplitude is sufficient
   */
  public hasValidAmplitude(values: number[]): boolean {
    if (values.length < 5) return false;
    
    // Get the most recent values
    const recentValues = values.slice(-15);
    
    // Calculate min, max and amplitude
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Check if amplitude is sufficient
    return amplitude >= this.minAmplitude;
  }
  
  /**
   * Log validation results for debugging
   */
  public logValidationResults(passed: boolean, amplitude: number, values: number[]): void {
    console.log(`SignalValidator: Amplitude validation ${passed ? 'passed' : 'failed'}`, {
      amplitude,
      threshold: this.minAmplitude,
      samples: values.length,
      minSamples: this.minSamples
    });
  }
}
