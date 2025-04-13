
/**
 * Specialized processor for cardiac calculations
 */
export class CardiacProcessor {
  private values: number[] = [];
  private readonly BUFFER_SIZE = 100;
  
  /**
   * Process a PPG value to calculate cardiac metrics
   */
  processValue(value: number): { heartRate: number, hrv: number } {
    this.values.push(value);
    
    if (this.values.length > this.BUFFER_SIZE) {
      this.values.shift();
    }
    
    // Basic cardiac calculation (simplified for example)
    // In a real implementation, this would use actual cardiac algorithms
    const baseHeartRate = 70;
    
    if (this.values.length < 10) {
      return { heartRate: baseHeartRate, hrv: 0 };
    }
    
    // Calculate moving average
    const avg = this.values.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    // Map to heart rate range (60-100 bpm)
    const heartRate = Math.round(Math.max(60, Math.min(100, baseHeartRate + avg * 15)));
    
    // Calculate a simple HRV approximation
    const recentValues = this.values.slice(-20);
    let hrv = 0;
    
    if (recentValues.length >= 5) {
      // Calculate standard deviation as a simple HRV approximation
      const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      hrv = Math.sqrt(recentValues.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / recentValues.length) * 100;
    }
    
    return { heartRate, hrv };
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.values = [];
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnostics(): Record<string, any> {
    return {
      bufferSize: this.values.length,
    };
  }
}
