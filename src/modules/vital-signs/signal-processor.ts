
/**
 * Simple signal processor for PPG signals
 */

export class SignalProcessor {
  private ppgValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 300;
  
  /**
   * Apply Simple Moving Average filter
   */
  public applySMAFilter(value: number): number {
    // Add to buffer
    this.ppgValues.push(value);
    if (this.ppgValues.length > this.MAX_BUFFER_SIZE) {
      this.ppgValues.shift();
    }
    
    // Apply SMA if we have enough points
    if (this.ppgValues.length >= 5) {
      const window = this.ppgValues.slice(-5);
      return window.reduce((sum, val) => sum + val, 0) / window.length;
    }
    
    return value;
  }
  
  /**
   * Get PPG values buffer
   */
  public getPPGValues(): number[] {
    return this.ppgValues;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.ppgValues = [];
  }
}
