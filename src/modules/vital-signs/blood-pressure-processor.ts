
/**
 * Blood pressure processor implementation
 */

export class BloodPressureProcessor {
  private readonly BASE_SYSTOLIC = 120; // mmHg
  private readonly BASE_DIASTOLIC = 80; // mmHg
  private ppgValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 50;
  
  /**
   * Calculate blood pressure from PPG values
   */
  public calculateBloodPressure(ppgValues: number[]): { systolic: number, diastolic: number } {
    if (!ppgValues || ppgValues.length < 15) {
      return { systolic: this.BASE_SYSTOLIC, diastolic: this.BASE_DIASTOLIC };
    }
    
    // Add values to internal buffer
    for (const value of ppgValues) {
      this.ppgValues.push(value);
      if (this.ppgValues.length > this.MAX_BUFFER_SIZE) {
        this.ppgValues.shift();
      }
    }
    
    try {
      // Extract features from PPG
      const { variation, pulseTransit } = this.extractBloodPressureFeatures();
      
      // Calculate systolic and diastolic pressure
      const systolic = Math.round(this.BASE_SYSTOLIC + variation);
      const diastolic = Math.round(this.BASE_DIASTOLIC + (variation * 0.5) + pulseTransit);
      
      return {
        systolic: Math.min(220, Math.max(80, systolic)),
        diastolic: Math.min(120, Math.max(50, diastolic))
      };
    } catch (error) {
      console.error("Error calculating blood pressure:", error);
      return { systolic: this.BASE_SYSTOLIC, diastolic: this.BASE_DIASTOLIC };
    }
  }
  
  /**
   * Extract blood pressure related features from PPG signal
   */
  private extractBloodPressureFeatures(): { variation: number, pulseTransit: number } {
    if (this.ppgValues.length < 10) {
      return { variation: 0, pulseTransit: 0 };
    }
    
    // Calculate amplitude and variability features
    const min = Math.min(...this.ppgValues);
    const max = Math.max(...this.ppgValues);
    const amplitude = max - min;
    
    // Calculate variations
    let sumDiff = 0;
    for (let i = 1; i < this.ppgValues.length; i++) {
      sumDiff += Math.abs(this.ppgValues[i] - this.ppgValues[i-1]);
    }
    const avgDiff = sumDiff / (this.ppgValues.length - 1);
    
    // In real systems, pulse transit time would be measured from ECG R-peak to PPG peak
    // This is a simplified approximation
    const variation = amplitude * 10; 
    const pulseTransit = avgDiff * -5;
    
    return { variation, pulseTransit };
  }
  
  /**
   * Process a single value directly (alternative API)
   */
  public processValue(value: number): { systolic: number, diastolic: number } {
    return this.calculateBloodPressure([value]);
  }
  
  /**
   * Get confidence level in the blood pressure measurement
   */
  public getConfidence(): number {
    return Math.min(0.85, this.ppgValues.length / this.MAX_BUFFER_SIZE);
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.ppgValues = [];
  }
}
