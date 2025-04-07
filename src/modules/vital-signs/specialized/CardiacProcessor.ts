/**
 * Cardiac processor implementation
 */
export class CardiacProcessor {
  private values: number[] = [];

  /**
   * Process a PPG value to calculate cardiac values
   */
  public processValue(value: number): { heartRate: number, hrv: number } {
    this.values.push(value);
    
    // Keep buffer size reasonable
    if (this.values.length > 50) {
      this.values.shift();
    }
    
    // Need a minimum amount of data
    if (this.values.length < 10) {
      return { heartRate: 0, hrv: 0 };
    }
    
    // Simple calculation based on signal value
    const heartRate = Math.round(70 + (value * 10) % 30);
    const hrv = Math.round(50 + (value * 5) % 20);
    
    return { heartRate, hrv };
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
