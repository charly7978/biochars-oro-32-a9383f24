/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Heart beat processor class for real-time detection and processing
 */
export class HeartBeatProcessor {
  private buffer: number[] = [];
  private readonly bufferSize: number = 60;
  private peakPositions: number[] = [];
  private lastPeakTime: number | null = null;
  private rrIntervals: number[] = [];
  private arrhythmiaCounter: number = 0;
  private isMonitoring: boolean = true;
  
  constructor() {
    console.log("HeartBeatProcessor: Initialized");
  }
  
  /**
   * Process a signal value to extract heart beat data
   */
  public processSignal(value: number): { 
    bpm: number; 
    confidence: number; 
    isPeak: boolean;
  } {
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // Check if we have enough data
    if (this.buffer.length < 5) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false
      };
    }
    
    // Detect peak
    const isPeak = this.detectPeak();
    let bpm = 0;
    
    // Calculate BPM from peaks
    if (isPeak) {
      const timestamp = Date.now();
      this.peakPositions.push(timestamp);
      
      // Keep only recent peaks
      if (this.peakPositions.length > 10) {
        this.peakPositions.shift();
      }
      
      // Calculate RR interval
      if (this.lastPeakTime !== null) {
        const rrInterval = timestamp - this.lastPeakTime;
        
        // Only add physiologically plausible intervals (333ms to 1500ms)
        if (rrInterval >= 333 && rrInterval <= 1500) {
          this.rrIntervals.push(rrInterval);
          
          // Keep only recent intervals
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
          }
        }
      }
      
      this.lastPeakTime = timestamp;
    }
    
    // Calculate BPM from RR intervals
    if (this.rrIntervals.length > 0) {
      const avgInterval = this.rrIntervals.reduce((a, b) => a + b, 0) / this.rrIntervals.length;
      bpm = Math.round(60000 / avgInterval);
      
      // Ensure BPM is physiologically plausible
      bpm = Math.max(40, Math.min(180, bpm));
    }
    
    // Calculate confidence
    const confidence = this.calculateConfidence();
    
    return {
      bpm,
      confidence,
      isPeak
    };
  }
  
  /**
   * Detect if the current value is a peak
   */
  private detectPeak(): boolean {
    if (this.buffer.length < 3) return false;
    
    const current = this.buffer[this.buffer.length - 1];
    const previous = this.buffer[this.buffer.length - 2];
    const beforePrevious = this.buffer[this.buffer.length - 3];
    
    // Basic peak detection algorithm
    if (previous > current && previous > beforePrevious && previous > 0.1) {
      // Check if enough time has passed since last peak
      const timestamp = Date.now();
      if (this.lastPeakTime === null || timestamp - this.lastPeakTime >= 333) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate confidence in measurements (0-1)
   */
  private calculateConfidence(): number {
    if (this.buffer.length < 10 || this.peakPositions.length < 2) {
      return 0;
    }
    
    // Calculate consistency in intervals
    if (this.rrIntervals.length < 2) {
      return 0.3; // Base confidence
    }
    
    // Calculate average and std dev of RR intervals
    const avg = this.rrIntervals.reduce((a, b) => a + b, 0) / this.rrIntervals.length;
    let sumSquaredDiffs = 0;
    
    for (const interval of this.rrIntervals) {
      sumSquaredDiffs += Math.pow(interval - avg, 2);
    }
    
    const stdDev = Math.sqrt(sumSquaredDiffs / this.rrIntervals.length);
    const coeffOfVar = stdDev / avg;
    
    // Higher consistency (lower coefficient of variation) means higher confidence
    return Math.max(0.1, Math.min(1, 1 - coeffOfVar));
  }
  
  /**
   * Set monitoring state
   */
  public setMonitoring(value: boolean): void {
    this.isMonitoring = value;
  }
  
  /**
   * Get RR intervals
   */
  public getRRIntervals(): { intervals: number[]; lastPeakTime: number | null } {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.peakPositions = [];
    this.lastPeakTime = null;
    this.rrIntervals = [];
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
}
