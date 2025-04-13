
/**
 * SpO2 processor implementation
 */

export class SpO2Processor {
  private readonly BASE_SPO2 = 95; // Base SpO2 percentage
  private ppgValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 30;
  
  /**
   * Calculate SpO2 from PPG signal values
   */
  public calculateSpO2(ppgValues: number[]): number {
    if (!ppgValues || ppgValues.length < 10) {
      return this.BASE_SPO2;
    }
    
    // Add values to internal buffer
    for (const value of ppgValues) {
      this.ppgValues.push(value);
      if (this.ppgValues.length > this.MAX_BUFFER_SIZE) {
        this.ppgValues.shift();
      }
    }
    
    // Simple implementation
    const variation = this.calculateSpO2Variation();
    
    // Ensure result is within physiological range (90-100%)
    return Math.min(99, Math.max(90, Math.round(this.BASE_SPO2 + variation)));
  }
  
  /**
   * Calculate SpO2 variation based on PPG characteristics
   */
  private calculateSpO2Variation(): number {
    if (this.ppgValues.length < 10) {
      return 0;
    }
    
    // Simple variation based on signal amplitude and pattern
    const min = Math.min(...this.ppgValues);
    const max = Math.max(...this.ppgValues);
    const amplitude = max - min;
    
    // SpO2 is typically related to the ratio of absorption at different wavelengths
    // This is a simplified approximation
    return (amplitude * 2) - 2;
  }
  
  /**
   * Process a single value (alternative API)
   */
  public processValue(value: number): number {
    return this.calculateSpO2([value]);
  }
  
  /**
   * Get confidence level in the SpO2 measurement
   */
  public getConfidence(): number {
    // Confidence increases with more data points
    return Math.min(0.9, this.ppgValues.length / this.MAX_BUFFER_SIZE);
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.ppgValues = [];
  }
}
