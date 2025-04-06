
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Security module to prevent simulation attempts
 * Detects patterns that may indicate signal simulation instead of real measurements
 */

/**
 * Anti-simulation guard configuration
 */
interface AntiSimulationConfig {
  // Maximum allowed consecutive identical values
  maxIdenticalValues: number;
  
  // Maximum allowed consecutive values with perfect linear progression
  maxLinearSequence: number;
  
  // Maximum allowed periodic patterns (sine-wave like patterns)
  maxPeriodicPatternScore: number;
  
  // Maximum allowed variance threshold (too-perfect signals have low variance)
  minRequiredVariance: number;
  
  // Number of values to analyze for patterns
  patternWindow: number;
}

/**
 * Anti-simulation guard for detecting and preventing signal simulation
 */
export class AntiSimulationGuard {
  private valueBuffer: number[] = [];
  private readonly BUFFER_SIZE = 100;
  private blockCount: number = 0;
  private lastViolation: string | null = null;
  private lastViolationTime: number = 0;
  
  // Default configuration
  private config: AntiSimulationConfig = {
    maxIdenticalValues: 5,
    maxLinearSequence: 8,
    maxPeriodicPatternScore: 0.95,
    minRequiredVariance: 0.00001,
    patternWindow: 20
  };
  
  constructor(config?: Partial<AntiSimulationConfig>) {
    this.config = { ...this.config, ...config };
    console.log("AntiSimulationGuard: Initialized with configuration:", this.config);
  }
  
  /**
   * Reset the guard state
   */
  public reset(): void {
    this.valueBuffer = [];
    this.blockCount = 0;
    this.lastViolation = null;
    this.lastViolationTime = 0;
    console.log("AntiSimulationGuard: Reset complete");
  }
  
  /**
   * Check if a value appears to be simulated
   * @param value The value to check
   * @returns True if simulation is detected, false otherwise
   */
  public detectSimulation(value: number): boolean {
    // Add to buffer
    this.valueBuffer.push(value);
    if (this.valueBuffer.length > this.BUFFER_SIZE) {
      this.valueBuffer.shift();
    }
    
    // Not enough data to detect patterns
    if (this.valueBuffer.length < this.config.patternWindow) {
      return false;
    }
    
    // Check for simulation patterns
    const recentValues = this.valueBuffer.slice(-this.config.patternWindow);
    
    // Check for identical consecutive values
    if (this.detectIdenticalValues(recentValues)) {
      this.recordViolation("identical_values");
      return true;
    }
    
    // Check for perfect linear sequences
    if (this.detectLinearSequence(recentValues)) {
      this.recordViolation("linear_pattern");
      return true;
    }
    
    // Check for periodic patterns (like sine waves)
    if (this.detectPeriodicPattern(recentValues)) {
      this.recordViolation("periodic_pattern");
      return true;
    }
    
    // Check for too-perfect variance
    if (this.detectInvalidVariance(recentValues)) {
      this.recordViolation("invalid_variance");
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the number of blocked simulation attempts
   */
  public getBlockCount(): number {
    return this.blockCount;
  }
  
  /**
   * Get information about the last violation
   */
  public getLastViolationInfo(): { type: string | null, time: number } {
    return {
      type: this.lastViolation,
      time: this.lastViolationTime
    };
  }
  
  /**
   * Record a violation
   */
  private recordViolation(type: string): void {
    this.blockCount++;
    this.lastViolation = type;
    this.lastViolationTime = Date.now();
    
    // Log violation for security monitoring
    console.warn(`AntiSimulationGuard: Simulation attempt detected - ${type}`, {
      blockCount: this.blockCount,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Detect too many identical consecutive values
   */
  private detectIdenticalValues(values: number[]): boolean {
    let identicalCount = 1;
    let maxIdentical = 1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] === values[i-1]) {
        identicalCount++;
        maxIdentical = Math.max(maxIdentical, identicalCount);
      } else {
        identicalCount = 1;
      }
    }
    
    return maxIdentical >= this.config.maxIdenticalValues;
  }
  
  /**
   * Detect perfect linear sequences
   */
  private detectLinearSequence(values: number[]): boolean {
    let linearCount = 1;
    let maxLinear = 1;
    
    if (values.length < 3) return false;
    
    let diff = values[1] - values[0];
    
    for (let i = 2; i < values.length; i++) {
      const currentDiff = values[i] - values[i-1];
      
      // Check if the difference between consecutive values is constant
      if (Math.abs(currentDiff - diff) < 0.00001) {
        linearCount++;
        maxLinear = Math.max(maxLinear, linearCount);
      } else {
        linearCount = 1;
        diff = currentDiff;
      }
    }
    
    return maxLinear >= this.config.maxLinearSequence;
  }
  
  /**
   * Detect periodic patterns like sine waves
   */
  private detectPeriodicPattern(values: number[]): boolean {
    if (values.length < 8) return false;
    
    // Calculate autocorrelation to detect periodic patterns
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Normalize values
    const normalized = values.map(v => v - mean);
    
    // Calculate variance for normalization
    const variance = normalized.reduce((sum, val) => sum + val * val, 0) / n;
    if (variance < 0.000001) return false; // Avoid division by near-zero
    
    // Calculate autocorrelation for different lags
    const maxLag = Math.floor(n / 2);
    const autoCorr = [];
    
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += normalized[i] * normalized[i + lag];
      }
      autoCorr.push(sum / ((n - lag) * variance));
    }
    
    // Find maximum autocorrelation (excluding lag 0)
    const maxAutocorr = Math.max(...autoCorr);
    
    // High autocorrelation indicates periodic pattern
    return maxAutocorr > this.config.maxPeriodicPatternScore;
  }
  
  /**
   * Detect too-perfect or invalid variance
   */
  private detectInvalidVariance(values: number[]): boolean {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate variance
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    // Real physiological signals always have some variance
    // Too-perfect signals with extremely low variance are suspicious
    return variance < this.config.minRequiredVariance;
  }
}
