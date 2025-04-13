
/**
 * Enhanced signal processor for PPG signals with standardized interfaces
 */

export class SignalProcessor {
  private ppgValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 300;
  
  /**
   * Process a signal value and return filtered result
   * @param value Raw signal value to process
   * @returns Filtered signal value
   */
  public processSignal(value: number): number {
    return this.applySMAFilter(value);
  }
  
  /**
   * Apply Simple Moving Average filter
   * @param value Raw signal value
   * @returns Filtered value
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
   * @returns Array of stored PPG values
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
  
  /**
   * Configure the signal processor with options
   * @param options Configuration options for the processor
   */
  public configure(options: any): void {
    // Default implementation does nothing
    // Extended processors can override this
  }
}
