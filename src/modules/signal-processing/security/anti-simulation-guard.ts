
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal processing security module
 * Detects and prevents simulation attempts in real-time
 */

/**
 * Configuration options for the anti-simulation guard
 */
export interface AntiSimulationConfig {
  // How many recent values to analyze
  bufferSize: number;
  
  // Minimum required variance in signal
  minimumVariance: number;
  
  // Maximum allowed consecutive identical values
  maxIdenticalValues: number;
  
  // Maximum allowed perfect linear patterns
  maxLinearPatterns: number;
  
  // How much continuity is required in signal
  continuityThreshold: number;
}

/**
 * Security guard for preventing simulation or fake data
 */
export class AntiSimulationGuard {
  private valueBuffer: number[] = [];
  private readonly DEFAULT_CONFIG: AntiSimulationConfig = {
    bufferSize: 30,
    minimumVariance: 0.0001,
    maxIdenticalValues: 5,
    maxLinearPatterns: 8,
    continuityThreshold: 0.8
  };
  
  private config: AntiSimulationConfig;
  private detections: number = 0;
  private lastDetectionTime: number = 0;
  private lastDetectionType: string = "";
  
  constructor(config?: Partial<AntiSimulationConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    console.log("AntiSimulationGuard: Initialized with configuration", this.config);
  }
  
  /**
   * Process a value and check if it appears to be simulated
   */
  public processValue(value: number): boolean {
    // Add to buffer
    this.valueBuffer.push(value);
    if (this.valueBuffer.length > this.config.bufferSize) {
      this.valueBuffer.shift();
    }
    
    // Not enough data to check
    if (this.valueBuffer.length < 10) {
      return false;
    }
    
    const isSimulated = this.detectSimulation();
    
    if (isSimulated) {
      this.detections++;
      this.lastDetectionTime = Date.now();
      console.warn("AntiSimulationGuard: Detected possible simulation attempt", {
        detections: this.detections,
        type: this.lastDetectionType,
        timestamp: new Date().toISOString()
      });
    }
    
    return isSimulated;
  }
  
  /**
   * Reset the guard state
   */
  public reset(): void {
    this.valueBuffer = [];
    console.log("AntiSimulationGuard: Reset");
  }
  
  /**
   * Get detection statistics
   */
  public getStats(): { detections: number, lastTime: number, lastType: string } {
    return {
      detections: this.detections,
      lastTime: this.lastDetectionTime,
      lastType: this.lastDetectionType
    };
  }
  
  /**
   * Run various simulation detection algorithms
   * Changed from private to public to fix access error
   */
  public detectSimulation(): boolean {
    // Check for too many identical consecutive values
    if (this.detectIdenticalValues()) {
      this.lastDetectionType = "identical_values";
      return true;
    }
    
    // Check for too-perfect linear patterns
    if (this.detectLinearPatterns()) {
      this.lastDetectionType = "linear_pattern";
      return true;
    }
    
    // Check for unrealistically low variance
    if (this.detectLowVariance()) {
      this.lastDetectionType = "low_variance";
      return true;
    }
    
    // Check for perfectly periodic patterns
    if (this.detectPeriodicPatterns()) {
      this.lastDetectionType = "periodic_pattern";
      return true;
    }
    
    return false;
  }
  
  /**
   * Check for too many identical values in a row
   */
  private detectIdenticalValues(): boolean {
    let identicalCount = 1;
    let maxIdentical = 1;
    
    // Count consecutive identical values
    for (let i = 1; i < this.valueBuffer.length; i++) {
      if (Math.abs(this.valueBuffer[i] - this.valueBuffer[i-1]) < 0.000001) {
        identicalCount++;
      } else {
        identicalCount = 1;
      }
      maxIdentical = Math.max(maxIdentical, identicalCount);
    }
    
    return maxIdentical >= this.config.maxIdenticalValues;
  }
  
  /**
   * Check for perfect linear patterns (too-perfect to be real)
   */
  private detectLinearPatterns(): boolean {
    if (this.valueBuffer.length < 5) return false;
    
    let linearCount = 1;
    let maxLinear = 1;
    let diff = this.valueBuffer[1] - this.valueBuffer[0];
    
    // Check if consecutive differences are too consistent
    for (let i = 2; i < this.valueBuffer.length; i++) {
      const currentDiff = this.valueBuffer[i] - this.valueBuffer[i-1];
      if (Math.abs(currentDiff - diff) < 0.000001) {
        linearCount++;
        maxLinear = Math.max(maxLinear, linearCount);
      } else {
        linearCount = 1;
        diff = currentDiff;
      }
    }
    
    return maxLinear >= this.config.maxLinearPatterns;
  }
  
  /**
   * Check if signal variance is unrealistically low
   */
  private detectLowVariance(): boolean {
    const mean = this.valueBuffer.reduce((sum, val) => sum + val, 0) / this.valueBuffer.length;
    const variance = this.valueBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.valueBuffer.length;
    
    return variance < this.config.minimumVariance && mean !== 0;
  }
  
  /**
   * Check for perfectly periodic patterns that may indicate simulation
   */
  private detectPeriodicPatterns(): boolean {
    if (this.valueBuffer.length < 10) return false;
    
    // Simplified autocorrelation check
    const values = this.valueBuffer.slice(-10);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const normalized = values.map(val => val - mean);
    
    // Check for periodic patterns with lag 2
    let autocorr = 0;
    for (let i = 0; i < normalized.length - 2; i++) {
      autocorr += normalized[i] * normalized[i + 2];
    }
    
    // Normalize autocorrelation
    const norm = normalized.reduce((sum, val) => sum + val * val, 0);
    
    // Perfect periodicity would be close to 1
    const normalizedAutocorr = norm > 0 ? autocorr / norm : 0;
    
    return normalizedAutocorr > 0.95; // Unrealistically high correlation
  }
}
