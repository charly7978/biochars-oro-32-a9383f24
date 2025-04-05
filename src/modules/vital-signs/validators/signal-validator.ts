
/**
 * Signal validation utilities
 */

export class SignalValidator {
  private minAmplitude: number;
  private minDataPoints: number;
  
  constructor(minAmplitude: number, minDataPoints: number) {
    this.minAmplitude = minAmplitude;
    this.minDataPoints = minDataPoints;
  }
  
  /**
   * Check if signal has enough amplitude to be valid
   */
  public isValidSignal(value: number): boolean {
    return Math.abs(value) >= this.minAmplitude;
  }
  
  /**
   * Check if we have enough data points for processing
   */
  public hasEnoughData(values: number[]): boolean {
    return values.length >= this.minDataPoints;
  }
  
  /**
   * Check if signal amplitude is sufficient
   */
  public hasValidAmplitude(values: number[]): boolean {
    if (values.length < 5) return false;
    
    const min = Math.min(...values.slice(-15));
    const max = Math.max(...values.slice(-15));
    return (max - min) >= this.minAmplitude;
  }
  
  /**
   * Log validation results for diagnostics
   */
  public logValidationResults(isValid: boolean, amplitude: number, values: number[]): void {
    console.log(`Signal validation: ${isValid ? 'PASSED' : 'FAILED'}`, {
      amplitude,
      threshold: this.minAmplitude,
      dataPoints: values.length,
      requiredPoints: this.minDataPoints
    });
  }
}
