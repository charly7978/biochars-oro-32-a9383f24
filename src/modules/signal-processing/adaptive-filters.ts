
/**
 * Adaptive filters for signal processing
 * Provides various filters that can adapt to changing signal characteristics
 */

/**
 * Configuration for adaptive filters
 */
export interface AdaptiveFilterConfig {
  initialCoefficients: number[];
  adaptationRate: number;
  signalPeriod?: number;
  leakageFactor?: number;
}

/**
 * Base class for adaptive filters
 */
export abstract class AdaptiveFilter {
  protected coefficients: number[];
  protected _adaptationRate: number;  // Changed to private field with getter/setter
  protected readonly leakageFactor: number;
  protected signalBuffer: number[] = [];
  protected readonly signalPeriod: number;
  
  /**
   * Constructor
   */
  constructor(config: AdaptiveFilterConfig) {
    this.coefficients = [...config.initialCoefficients];
    this._adaptationRate = config.adaptationRate;
    this.leakageFactor = config.leakageFactor || 0.9999;
    this.signalPeriod = config.signalPeriod || 30;
  }
  
  /**
   * Apply the filter to a sample
   */
  public abstract process(sample: number): number;
  
  /**
   * Reset the filter state
   */
  public reset(): void {
    this.signalBuffer = [];
  }
  
  /**
   * Get the current filter coefficients
   */
  public getCoefficients(): number[] {
    return [...this.coefficients];
  }
  
  /**
   * Get the adaptation rate
   */
  public get adaptationRate(): number {
    return this._adaptationRate;
  }
  
  /**
   * Set the adaptation rate
   */
  public set adaptationRate(value: number) {
    this._adaptationRate = Math.max(0, Math.min(1, value));
  }
}

/**
 * Least Mean Squares adaptive filter
 * Good for general noise reduction and tracking changing signal characteristics
 */
export class LMSFilter extends AdaptiveFilter {
  private errorHistory: number[] = [];
  private readonly maxErrorHistory: number = 50;
  
  /**
   * Process a sample with LMS algorithm
   * @param sample Input sample
   * @returns Filtered output
   */
  public override process(sample: number): number {
    // Add sample to buffer
    this.signalBuffer.unshift(sample);
    if (this.signalBuffer.length > this.coefficients.length) {
      this.signalBuffer.pop();
    }
    
    // Not enough samples yet
    if (this.signalBuffer.length < this.coefficients.length) {
      return sample;
    }
    
    // Calculate filtered output
    let output = 0;
    for (let i = 0; i < this.coefficients.length; i++) {
      output += this.coefficients[i] * this.signalBuffer[i];
    }
    
    // Calculate error
    const error = sample - output;
    
    // Update error history
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
    
    // Update filter coefficients
    for (let i = 0; i < this.coefficients.length; i++) {
      if (i < this.signalBuffer.length) {
        // Apply leakage to prevent coefficient explosion
        this.coefficients[i] = this.leakageFactor * this.coefficients[i] + 
                              this._adaptationRate * error * this.signalBuffer[i];
      }
    }
    
    return output;
  }
  
  /**
   * Get mean square error
   */
  public getMeanSquareError(): number {
    if (this.errorHistory.length === 0) return 0;
    
    const sumSquaredError = this.errorHistory.reduce((sum, err) => sum + err * err, 0);
    return sumSquaredError / this.errorHistory.length;
  }
  
  /**
   * Reset filter state including error history
   */
  public override reset(): void {
    super.reset();
    this.errorHistory = [];
  }
}

/**
 * Recursive Least Squares filter
 * Faster convergence than LMS but more computationally intensive
 * Useful for accurate tracking of rapidly changing signals
 */
export class RLSFilter extends AdaptiveFilter {
  private P: number[][] = []; // Inverse correlation matrix
  private readonly forgettingFactor: number;
  
  constructor(config: AdaptiveFilterConfig & { forgettingFactor?: number }) {
    super(config);
    this.forgettingFactor = config.forgettingFactor || 0.99;
    
    // Initialize P matrix as identity matrix * reciprocal of regularization param
    const regularization = 0.01;
    this.P = Array(this.coefficients.length).fill(0).map((_, i) => 
      Array(this.coefficients.length).fill(0).map((_, j) => i === j ? 1 / regularization : 0)
    );
  }
  
  /**
   * Process a sample with RLS algorithm
   * @param sample Input sample
   * @returns Filtered output
   */
  public override process(sample: number): number {
    // Add sample to buffer
    this.signalBuffer.unshift(sample);
    if (this.signalBuffer.length > this.coefficients.length) {
      this.signalBuffer.pop();
    }
    
    // Not enough samples yet
    if (this.signalBuffer.length < this.coefficients.length) {
      return sample;
    }
    
    const x = this.signalBuffer.slice(0, this.coefficients.length);
    
    // Calculate filtered output
    let y = 0;
    for (let i = 0; i < this.coefficients.length; i++) {
      y += this.coefficients[i] * x[i];
    }
    
    // Calculate error
    const error = sample - y;
    
    // Calculate gain vector k
    const Px: number[] = new Array(this.coefficients.length).fill(0);
    for (let i = 0; i < this.coefficients.length; i++) {
      for (let j = 0; j < this.coefficients.length; j++) {
        Px[i] += this.P[i][j] * x[j];
      }
    }
    
    // Calculate denominator for k
    let denominator = this.forgettingFactor;
    for (let i = 0; i < this.coefficients.length; i++) {
      denominator += x[i] * Px[i];
    }
    
    // Calculate k
    const k: number[] = new Array(this.coefficients.length).fill(0);
    for (let i = 0; i < this.coefficients.length; i++) {
      k[i] = Px[i] / denominator;
    }
    
    // Update coefficients
    for (let i = 0; i < this.coefficients.length; i++) {
      this.coefficients[i] += k[i] * error;
    }
    
    // Update P matrix
    const newP: number[][] = Array(this.coefficients.length).fill(0).map(() => 
      Array(this.coefficients.length).fill(0)
    );
    
    // P = (P - k*x^T*P) / forgettingFactor
    for (let i = 0; i < this.coefficients.length; i++) {
      for (let j = 0; j < this.coefficients.length; j++) {
        let sum = 0;
        for (let m = 0; m < this.coefficients.length; m++) {
          sum += k[i] * x[m] * this.P[m][j];
        }
        newP[i][j] = (this.P[i][j] - sum) / this.forgettingFactor;
      }
    }
    
    this.P = newP;
    
    return y;
  }
  
  /**
   * Reset filter state including P matrix
   */
  public override reset(): void {
    super.reset();
    
    // Reset P matrix
    const regularization = 0.01;
    this.P = Array(this.coefficients.length).fill(0).map((_, i) => 
      Array(this.coefficients.length).fill(0).map((_, j) => i === j ? 1 / regularization : 0)
    );
  }
}
