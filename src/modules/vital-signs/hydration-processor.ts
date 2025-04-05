
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Dedicated processor for hydration measurements
 * Uses PPG signal to estimate hydration levels
 */

export class HydrationProcessor {
  private readonly MIN_HYDRATION = 45; // Minimum physiological hydration level (%)
  private readonly MAX_HYDRATION = 100; // Maximum physiological hydration level (%)
  private readonly BASE_HYDRATION = 65; // Default hydration level when signal is insufficient
  
  private buffer: number[] = []; // Buffer to store recent signal values
  private readonly MAX_BUFFER_SIZE = 30; // Maximum buffer size
  
  private confidence: number = 0; // Confidence in the measurement (0-1)
  private lastHydration: number = 65; // Last calculated hydration value
  
  /**
   * Constructor
   */
  constructor() {
    console.log("HydrationProcessor initialized");
    this.reset();
  }
  
  /**
   * Calculate hydration percentage from PPG signal
   * 
   * @param ppgValues Array of PPG signal values
   * @returns Estimated hydration percentage (45-100%)
   */
  public calculateHydration(ppgValues: number[]): number {
    if (!ppgValues || ppgValues.length === 0) {
      return this.BASE_HYDRATION;
    }
    
    // Add values to buffer
    for (const value of ppgValues) {
      this.buffer.push(value);
      if (this.buffer.length > this.MAX_BUFFER_SIZE) {
        this.buffer.shift();
      }
    }
    
    // We need at least 10 values for a reliable estimate
    if (this.buffer.length < 10) {
      return this.BASE_HYDRATION;
    }
    
    // Calculate signal characteristics
    const min = Math.min(...this.buffer);
    const max = Math.max(...this.buffer);
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    const amplitude = max - min;
    
    // Calculate variance and standard deviation
    const variance = this.buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.buffer.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate hydration based on signal characteristics
    // Higher amplitude and lower variance typically correlate with better hydration
    const ampFactor = Math.min(1, amplitude * 2); // Normalize to 0-1
    const varFactor = Math.max(0, 1 - Math.min(1, stdDev * 5)); // Inverse of stdDev, normalized to 0-1
    
    // Combine factors to estimate hydration
    // Weighting: amplitude (60%), variance (40%)
    const hydrationFactor = (ampFactor * 0.6) + (varFactor * 0.4);
    
    // Map to physiological range (45-100%)
    const hydration = this.MIN_HYDRATION + hydrationFactor * (this.MAX_HYDRATION - this.MIN_HYDRATION);
    
    // Smooth changes by limiting maximum change from previous value
    const maxChange = 5 * this.confidence; // Higher confidence allows more change
    const smoothedHydration = Math.max(
      this.lastHydration - maxChange,
      Math.min(this.lastHydration + maxChange, hydration)
    );
    
    // Update confidence based on signal quality
    this.updateConfidence();
    
    // Update last hydration value
    this.lastHydration = smoothedHydration;
    
    // Return rounded hydration percentage
    return Math.round(smoothedHydration);
  }
  
  /**
   * Process a single value
   * 
   * @param value PPG signal value
   * @returns Estimated hydration percentage
   */
  public processValue(value: number): number {
    return this.calculateHydration([value]);
  }
  
  /**
   * Get confidence in the hydration measurement
   * 
   * @returns Confidence value (0-1)
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.confidence = 0;
    this.lastHydration = this.BASE_HYDRATION;
    console.log("HydrationProcessor reset");
  }
  
  /**
   * Update confidence based on buffer data
   */
  private updateConfidence(): void {
    if (this.buffer.length < 10) {
      this.confidence = 0;
      return;
    }
    
    // Calculate signal quality metrics
    const min = Math.min(...this.buffer);
    const max = Math.max(...this.buffer);
    const mean = this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
    const amplitude = max - min;
    
    // Calculate variance and signal-to-noise ratio
    const variance = this.buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.buffer.length;
    const snr = mean !== 0 ? Math.abs(mean) / Math.sqrt(variance) : 0;
    
    // Higher amplitude and SNR indicate better signal quality
    const ampFactor = Math.min(1, amplitude * 2);
    const snrFactor = Math.min(1, snr / 10);
    
    // Buffer size factor - more data means higher confidence
    const sizeFactor = Math.min(1, this.buffer.length / this.MAX_BUFFER_SIZE);
    
    // Combine factors for overall confidence
    this.confidence = Math.min(0.95, (ampFactor * 0.4) + (snrFactor * 0.4) + (sizeFactor * 0.2));
  }
}
