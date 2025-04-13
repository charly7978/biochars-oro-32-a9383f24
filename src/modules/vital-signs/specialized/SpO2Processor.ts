
/**
 * Specialized processor for SpO2 calculation
 */
export class SpO2Processor {
  private values: number[] = [];
  private readonly BUFFER_SIZE = 100;
  
  /**
   * Process a PPG value to calculate SpO2
   */
  processValue(value: number): number {
    this.values.push(value);
    
    if (this.values.length > this.BUFFER_SIZE) {
      this.values.shift();
    }
    
    // Basic SpO2 calculation (simplified for example)
    // In a real implementation, this would use actual pulse oximetry algorithms
    const baseValue = 95;
    
    if (this.values.length < 10) {
      return baseValue;
    }
    
    // Calculate moving average
    const avg = this.values.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    // Map to SpO2 range (95-100%)
    return Math.min(100, Math.max(95, baseValue + avg * 2));
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.values = [];
  }
  
  /**
   * Get current confidence level
   */
  getConfidence(): number {
    // More samples = higher confidence, up to 0.95
    return Math.min(0.95, this.values.length / this.BUFFER_SIZE);
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnostics(): Record<string, any> {
    return {
      bufferSize: this.values.length,
      confidence: this.getConfidence(),
    };
  }
}
