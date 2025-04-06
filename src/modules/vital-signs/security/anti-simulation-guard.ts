/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Guard against simulation or fake data inputs
 */
export class AntiSimulationGuard {
  private detectionCount: number = 0;
  private lastValues: number[] = [];
  private readonly BUFFER_SIZE = 20;
  private lastDetectionTime: number = 0;
  private lastDetectionType: string = 'none';
  
  /**
   * Detect simulation patterns in the signal
   */
  public detectSimulation(value: number): boolean {
    // Add value to buffer
    this.lastValues.push(value);
    
    // Keep buffer at fixed size
    if (this.lastValues.length > this.BUFFER_SIZE) {
      this.lastValues.shift();
    }
    
    // Need enough values to detect patterns
    if (this.lastValues.length < 10) {
      return false;
    }
    
    // Check for simulation patterns
    if (this.detectPerfectSine() || this.detectStepPattern() || this.detectConstantValue()) {
      this.detectionCount++;
      this.lastDetectionTime = Date.now();
      console.warn(`AntiSimulationGuard: Simulation pattern detected (${this.detectionCount} occurrences)`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect perfect sine wave patterns
   */
  private detectPerfectSine(): boolean {
    // Sine waves have very consistent intervals between zero crossings
    const zeroCrossings = this.countZeroCrossings();
    const interval = this.lastValues.length / zeroCrossings;
    
    // Perfect sine waves have very regular intervals
    if (zeroCrossings > 2 && Math.abs(interval - Math.round(interval)) < 0.05) {
      this.lastDetectionType = 'sine';
      return true;
    }
    
    return false;
  }
  
  /**
   * Count zero crossings in signal
   */
  private countZeroCrossings(): number {
    let crossings = 0;
    
    for (let i = 1; i < this.lastValues.length; i++) {
      // Zero crossing happens when values change sign
      if ((this.lastValues[i] >= 0 && this.lastValues[i-1] < 0) || 
          (this.lastValues[i] < 0 && this.lastValues[i-1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings;
  }
  
  /**
   * Detect step patterns (sudden jumps)
   */
  private detectStepPattern(): boolean {
    for (let i = 1; i < this.lastValues.length; i++) {
      const diff = Math.abs(this.lastValues[i] - this.lastValues[i-1]);
      
      // Detect unnaturally large jumps
      if (diff > 0.5) {
        this.lastDetectionType = 'step';
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Detect constant values (no variation)
   */
  private detectConstantValue(): boolean {
    const first = this.lastValues[0];
    
    // Check if all values are exactly the same
    const isConstant = this.lastValues.every(val => val === first);
    
    if (isConstant) {
      this.lastDetectionType = 'constant';
    }
    
    return isConstant;
  }
  
  /**
   * Process a value and check for simulation
   * Returns true if simulation is detected
   */
  public processValue(value: number): boolean {
    return this.detectSimulation(value);
  }
  
  /**
   * Reset the guard
   */
  public reset(): void {
    this.lastValues = [];
    this.detectionCount = 0;
    this.lastDetectionTime = 0;
    this.lastDetectionType = 'none';
  }
  
  /**
   * Get detection statistics
   */
  public getDetectionCount(): number {
    return this.detectionCount;
  }
  
  /**
   * Get detailed stats about detections
   */
  public getStats(): { detections: number, lastTime: number, lastType: string } {
    return {
      detections: this.detectionCount,
      lastTime: this.lastDetectionTime,
      lastType: this.lastDetectionType
    };
  }
}
