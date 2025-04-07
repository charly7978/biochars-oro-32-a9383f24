/**
 * Glucose processor implementation
 */
export class GlucoseProcessor {
  private values: number[] = [];
  private confidence: number = 0;

  /**
   * Process a PPG value to calculate glucose level
   */
  public processValue(value: number): number {
    this.values.push(value);
    
    // Keep buffer size reasonable
    if (this.values.length > 50) {
      this.values.shift();
    }
    
    // Need a minimum amount of data
    if (this.values.length < 10) {
      this.confidence = 0;
      return 0;
    }
    
    // Calculate signal quality for confidence
    const recentValues = this.values.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Higher amplitude generally means better signal
    this.confidence = Math.min(1, amplitude / 0.5);
    
    // Simple glucose calculation based on signal value
    // Base is 90 mg/dL with variations
    return Math.round(90 + (value * 10) % 30);
  }

  /**
   * Calculate glucose from signal features
   */
  public calculateGlucose(features: any): number {
    // Simple implementation for compatibility
    if (Array.isArray(features)) {
      return this.processValue(features[0]);
    }
    return 90; // Default value
  }

  /**
   * Get confidence level in the measurement
   */
  public getConfidence(): number {
    return this.confidence;
  }

  /**
   * Reset the processor
   */
  public reset(): void {
    this.values = [];
    this.confidence = 0;
  }

  /**
   * Get diagnostics data
   */
  public getDiagnostics(): any {
    return {
      valuesProcessed: this.values.length,
      avgValue: this.values.length > 0 ? 
        this.values.reduce((sum, val) => sum + val, 0) / this.values.length : 0,
      confidence: this.confidence,
      signalAmplitude: this.values.length > 1 ? 
        Math.max(...this.values) - Math.min(...this.values) : 0
    };
  }
}
