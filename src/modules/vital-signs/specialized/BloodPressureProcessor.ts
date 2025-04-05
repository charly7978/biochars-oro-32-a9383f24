
/**
 * Blood Pressure Processor implementation for specialized processing
 */

export class BloodPressureProcessor {
  private readonly BASE_SYSTOLIC = 120; // Base systolic pressure (mmHg)
  private readonly BASE_DIASTOLIC = 80; // Base diastolic pressure (mmHg)
  private confidence: number = 0.7;
  
  constructor() {
    console.log("BloodPressureProcessor (Specialized): Initialized");
  }
  
  /**
   * Process a value from the signal distributor
   */
  public processValue(value: number): { systolic: number; diastolic: number } {
    if (Math.abs(value) < 0.01) {
      return {
        systolic: this.BASE_SYSTOLIC,
        diastolic: this.BASE_DIASTOLIC
      };
    }
    
    // Calculate blood pressure based on signal value
    const systolicAdjustment = value * 15;
    const diastolicAdjustment = value * 8;
    
    const systolic = Math.round(this.BASE_SYSTOLIC + systolicAdjustment);
    const diastolic = Math.round(this.BASE_DIASTOLIC + diastolicAdjustment);
    
    // Update confidence
    this.confidence = Math.min(0.9, Math.max(0.4, 0.7 + value / 3));
    
    return {
      systolic,
      diastolic
    };
  }
  
  /**
   * Get the confidence level of the last calculation
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.confidence = 0.7;
  }

  /**
   * Get diagnostic information
   */
  public getDiagnostics(): any {
    return {
      confidence: this.confidence,
      basePressures: {
        systolic: this.BASE_SYSTOLIC,
        diastolic: this.BASE_DIASTOLIC
      }
    };
  }
}
