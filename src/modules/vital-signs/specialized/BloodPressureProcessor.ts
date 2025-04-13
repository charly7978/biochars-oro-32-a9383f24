
/**
 * Specialized processor for blood pressure calculations
 */
export class BloodPressureProcessor {
  private values: number[] = [];
  private readonly BUFFER_SIZE = 100;
  
  /**
   * Process a PPG value to calculate blood pressure
   */
  processValue(value: number): { systolic: number, diastolic: number } {
    this.values.push(value);
    
    if (this.values.length > this.BUFFER_SIZE) {
      this.values.shift();
    }
    
    // Basic blood pressure calculation (simplified for example)
    // In a real implementation, this would use actual blood pressure algorithms
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    if (this.values.length < 10) {
      return { systolic: baseSystolic, diastolic: baseDiastolic };
    }
    
    // Calculate moving average
    const avg = this.values.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    // Map to blood pressure ranges
    const systolic = Math.round(baseSystolic + avg * 10);
    const diastolic = Math.round(baseDiastolic + avg * 5);
    
    return { 
      systolic: Math.max(90, Math.min(180, systolic)),
      diastolic: Math.max(60, Math.min(120, diastolic))
    };
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
    // More samples = higher confidence, up to 0.9
    return Math.min(0.9, this.values.length / this.BUFFER_SIZE);
  }
  
  /**
   * Get feedback data for signal distributor
   */
  getFeedback(): any {
    return {
      confidence: this.getConfidence(),
      suggestedAdjustments: {
        amplificationFactor: 1.0,
        filterStrength: 0.8
      }
    };
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
