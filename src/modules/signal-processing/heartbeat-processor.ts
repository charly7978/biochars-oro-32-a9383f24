/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalProcessor } from './types';

/**
 * Heartbeat signal processor
 */
export class HeartbeatProcessor implements SignalProcessor {
  private bpm: number = 0;
  private quality: number = 0;
  private isPeak: boolean = false;
  private lastPeakTime: number | null = null;
  private rrIntervals: number[] = [];
  private arrhythmiaCounter: number = 0;
  private signalBuffer: number[] = [];
  private readonly MAX_BUFFER_SIZE = 30;
  private readonly PEAK_THRESHOLD = 0.01;
  private readonly MIN_PEAK_DISTANCE_MS = 300;
  private readonly MIN_VALID_BPM = 40;
  private readonly MAX_VALID_BPM = 200;
  
  /**
   * Process signal
   */
  public processSignal(value: number): any {
    const now = Date.now();
    
    // Add to buffer
    this.signalBuffer.push(value);
    if (this.signalBuffer.length > this.MAX_BUFFER_SIZE) {
      this.signalBuffer.shift();
    }
    
    // Check for peak
    this.isPeak = this.detectPeak(value, now);
    
    // Update BPM if peak detected
    if (this.isPeak && this.lastPeakTime) {
      const interval = now - this.lastPeakTime;
      
      if (interval > this.MIN_PEAK_DISTANCE_MS) {
        // Store RR interval
        this.rrIntervals.push(interval);
        if (this.rrIntervals.length > 10) {
          this.rrIntervals.shift();
        }
        
        // Calculate BPM
        const bpm = 60000 / interval;
        
        // Validate BPM
        if (bpm >= this.MIN_VALID_BPM && bpm <= this.MAX_VALID_BPM) {
          this.bpm = Math.round(bpm);
          this.quality = this.calculateQuality();
          
          // Check for arrhythmia
          if (this.rrIntervals.length >= 3) {
            this.checkArrhythmia();
          }
        }
      }
      
      this.lastPeakTime = now;
    }
    
    return {
      bpm: this.bpm,
      quality: this.quality,
      isPeak: this.isPeak,
      arrhythmiaCount: this.arrhythmiaCounter,
      rrIntervals: this.rrIntervals,
      lastPeakTime: this.lastPeakTime
    };
  }
  
  /**
   * Detect if current value is a peak
   */
  private detectPeak(value: number, currentTime: number): boolean {
    if (this.signalBuffer.length < 5) return false;
    
    // Check if value is above threshold
    if (Math.abs(value) < this.PEAK_THRESHOLD) return false;
    
    // Check if it's higher than previous values
    const recentValues = this.signalBuffer.slice(-5);
    const isHighest = recentValues.every((v, i) => i === recentValues.length - 1 || v < value);
    
    // Check minimum time between peaks
    const timeSinceLastPeak = this.lastPeakTime ? currentTime - this.lastPeakTime : Infinity;
    const hasMinDistance = timeSinceLastPeak >= this.MIN_PEAK_DISTANCE_MS;
    
    return isHighest && hasMinDistance;
  }
  
  /**
   * Calculate signal quality based on consistency
   */
  private calculateQuality(): number {
    if (this.rrIntervals.length < 3) return 50;
    
    // Calculate consistency of intervals
    const avg = this.rrIntervals.reduce((sum, val) => sum + val, 0) / this.rrIntervals.length;
    const variance = this.rrIntervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / this.rrIntervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficient = stdDev / avg;
    
    // Higher consistency = higher quality
    const consistency = Math.max(0, 100 - coefficient * 200);
    
    // Combine with signal amplitude
    const amplitude = Math.max(...this.signalBuffer) - Math.min(...this.signalBuffer);
    const amplitudeQuality = Math.min(100, amplitude * 1000);
    
    return Math.round((consistency + amplitudeQuality) / 2);
  }
  
  /**
   * Check for arrhythmia patterns
   */
  private checkArrhythmia(): void {
    if (this.rrIntervals.length < 3) return;
    
    const recentIntervals = this.rrIntervals.slice(-3);
    const avg = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
    
    // Check for significant variation
    for (const interval of recentIntervals) {
      const variation = Math.abs(interval - avg) / avg;
      
      if (variation > 0.2) {
        this.arrhythmiaCounter++;
        break;
      }
    }
  }
  
  /**
   * Get RR intervals data
   */
  public getRRIntervals() {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Reset processor
   */
  public reset(): void {
    this.bpm = 0;
    this.quality = 0;
    this.isPeak = false;
    this.lastPeakTime = null;
    this.rrIntervals = [];
    this.arrhythmiaCounter = 0;
    this.signalBuffer = [];
    console.log("Reset HeartbeatProcessor");
  }
}
