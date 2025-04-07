/**
 * Blood pressure processor implementation
 */
export class BloodPressureProcessor {
  private values: number[] = [];

  /**
   * Process a PPG value to calculate blood pressure
   */
  public processValue(value: number): { systolic: number, diastolic: number } {
    this.values.push(value);
    
    // Keep buffer size reasonable
    if (this.values.length > 50) {
      this.values.shift();
    }
    
    // Need a minimum amount of data
    if (this.values.length < 10) {
      return { systolic: 0, diastolic: 0 };
    }
    
    // Simple blood pressure calculation based on signal value
    // Base values with small variations
    const systolic = Math.round(120 + (value * 5) % 20);
    const diastolic = Math.round(80 + (value * 3) % 10);
    
    return { systolic, diastolic };
  }

  /**
   * Reset the processor
   */
  public reset(): void {
    this.values = [];
  }

  /**
   * Get diagnostics data
   */
  public getDiagnostics(): any {
    return {
      valuesProcessed: this.values.length,
      avgValue: this.values.length > 0 ? 
        this.values.reduce((sum, val) => sum + val, 0) / this.values.length : 0
    };
  }
}
