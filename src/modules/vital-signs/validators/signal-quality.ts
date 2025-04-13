
/**
 * Signal quality validator
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

export class SignalQualityValidator {
  private minAmplitude = 0.05;
  private maxVariance = 10;
  
  /**
   * Validate signal quality based on amplitude and variance
   * @param values Signal values to validate
   * @returns Whether the signal has acceptable quality
   */
  public validate(values: number[]): boolean {
    if (values.length < 5) {
      return false;
    }
    
    // Calculate basic statistics
    const max = Math.max(...values);
    const min = Math.min(...values);
    const amplitude = max - min;
    
    // Check minimum amplitude
    if (amplitude < this.minAmplitude) {
      return false;
    }
    
    // Calculate variance
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Check maximum variance
    if (variance > this.maxVariance) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Set minimum required amplitude
   */
  public setMinAmplitude(value: number): void {
    this.minAmplitude = value;
  }
  
  /**
   * Set maximum allowed variance
   */
  public setMaxVariance(value: number): void {
    this.maxVariance = value;
  }
}
