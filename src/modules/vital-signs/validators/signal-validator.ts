/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Validator for PPG signal quality and reliability
 */
export class SignalValidator {
  private readonly minAmplitude: number;
  private readonly minSamples: number;
  private rhythmPatternBuffer: number[] = [];
  private fingerDetected: boolean = false;
  private patternConsistency: number = 0;
  private readonly MIN_PATTERN_CONSISTENCY = 0.6;
  
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
  
  /**
   * Track signal for pattern detection
   * Used to detect rhythmic patterns that indicate finger presence
   */
  public trackSignalForPatternDetection(value: number): void {
    this.rhythmPatternBuffer.push(value);
    
    // Keep buffer at reasonable size
    if (this.rhythmPatternBuffer.length > 100) {
      this.rhythmPatternBuffer.shift();
    }
    
    // Update pattern detection
    this.updatePatternDetection();
  }
  
  /**
   * Update pattern detection to detect finger presence
   */
  private updatePatternDetection(): void {
    if (this.rhythmPatternBuffer.length < 30) return;
    
    // Look for rhythmic patterns in the signal
    const recentValues = this.rhythmPatternBuffer.slice(-30);
    
    // Count zero crossings (sign changes) which indicate oscillation
    let zeroCrossings = 0;
    for (let i = 1; i < recentValues.length; i++) {
      if ((recentValues[i] >= 0 && recentValues[i-1] < 0) || 
          (recentValues[i] < 0 && recentValues[i-1] >= 0)) {
        zeroCrossings++;
      }
    }
    
    // Calculate consistency based on zero crossing count
    // A rhythmic signal should have regular zero crossings
    const expectedCrossings = 6; // Assuming ~1Hz heart rate and ~30 samples
    const crossingRatio = Math.min(zeroCrossings, expectedCrossings) / 
                         Math.max(zeroCrossings, expectedCrossings);
    
    // Update pattern consistency with exponential smoothing
    this.patternConsistency = 0.7 * this.patternConsistency + 0.3 * crossingRatio;
    
    // Update finger detection based on pattern consistency
    this.fingerDetected = this.patternConsistency > this.MIN_PATTERN_CONSISTENCY;
  }
  
  /**
   * Check if finger is detected based on rhythmic patterns
   */
  public isFingerDetected(): boolean {
    return this.fingerDetected;
  }
  
  /**
   * Reset finger detection
   */
  public resetFingerDetection(): void {
    this.rhythmPatternBuffer = [];
    this.fingerDetected = false;
    this.patternConsistency = 0;
  }
}
