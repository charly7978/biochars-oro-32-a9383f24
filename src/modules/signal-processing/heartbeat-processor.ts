/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { SignalProcessor, SignalProcessingOptions } from './types';

/**
 * Heartbeat processor for real-time beat detection and BPM calculation
 */
export class HeartbeatProcessor implements SignalProcessor {
  private buffer: number[] = [];
  private readonly bufferSize: number = 60;
  private readonly minBpm: number = 40;
  private readonly maxBpm: number = 180;
  private peakPositions: number[] = [];
  private lastPeakTime: number | null = null;
  private rrIntervals: number[] = [];
  private quality: number = 0;
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.5,
    filterStrength: 0.5,
    qualityThreshold: 40
  };
  
  constructor(options?: SignalProcessingOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }
  
  /**
   * Process a signal value for heartbeat detection
   */
  public processSignal(value: number): any {
    const timestamp = Date.now();
    
    // Add to buffer
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // Check if we have enough data
    if (this.buffer.length < 10) {
      return {
        timestamp,
        value,
        isPeak: false,
        peakConfidence: 0,
        instantaneousBPM: null,
        rrInterval: null,
        heartRateVariability: null
      };
    }
    
    // Detect peak
    const isPeak = this.detectPeak();
    let instantaneousBPM: number | null = null;
    let rrInterval: number | null = null;
    
    // Calculate instantaneous BPM and RR interval
    if (isPeak) {
      this.peakPositions.push(timestamp);
      
      // Keep only recent peaks
      if (this.peakPositions.length > 10) {
        this.peakPositions.shift();
      }
      
      // Calculate RR interval
      if (this.lastPeakTime !== null) {
        rrInterval = timestamp - this.lastPeakTime;
        
        // Only add physiologically plausible intervals
        if (rrInterval >= 333 && rrInterval <= 1500) {
          this.rrIntervals.push(rrInterval);
          
          // Keep only recent intervals
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
          }
          
          // Calculate instantaneous BPM
          instantaneousBPM = 60000 / rrInterval;
          
          // Ensure BPM is physiologically plausible
          instantaneousBPM = Math.max(this.minBpm, Math.min(this.maxBpm, instantaneousBPM));
        }
      }
      
      this.lastPeakTime = timestamp;
    }
    
    // Calculate heart rate variability if we have enough intervals
    let heartRateVariability: number | null = null;
    if (this.rrIntervals.length >= 3) {
      // RMSSD calculation
      let sumSquaredDiffs = 0;
      for (let i = 1; i < this.rrIntervals.length; i++) {
        const diff = this.rrIntervals[i] - this.rrIntervals[i-1];
        sumSquaredDiffs += diff * diff;
      }
      heartRateVariability = Math.sqrt(sumSquaredDiffs / (this.rrIntervals.length - 1));
    }
    
    // Calculate peak confidence
    const peakConfidence = this.calculatePeakConfidence();
    
    // Update quality
    this.quality = this.calculateQuality();
    
    return {
      timestamp,
      value,
      isPeak,
      peakConfidence,
      instantaneousBPM,
      rrInterval,
      heartRateVariability
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
      // Check if enough time has passed since last peak (333ms = 180 bpm)
      const timestamp = Date.now();
      if (this.lastPeakTime === null || timestamp - this.lastPeakTime >= 333) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate confidence in peak detection (0-1)
   */
  private calculatePeakConfidence(): number {
    if (this.buffer.length < 10 || this.peakPositions.length < 2) {
      return 0;
    }
    
    // Calculate average peak-to-peak interval
    let sumIntervals = 0;
    const intervals = [];
    
    for (let i = 1; i < this.peakPositions.length; i++) {
      const interval = this.peakPositions[i] - this.peakPositions[i-1];
      intervals.push(interval);
      sumIntervals += interval;
    }
    
    const avgInterval = sumIntervals / intervals.length;
    
    // Calculate standard deviation of intervals
    let sumSquaredDiffs = 0;
    for (const interval of intervals) {
      sumSquaredDiffs += Math.pow(interval - avgInterval, 2);
    }
    
    const stdDev = Math.sqrt(sumSquaredDiffs / intervals.length);
    const coeffOfVar = stdDev / avgInterval;
    
    // Higher consistency (lower coefficient of variation) means higher confidence
    return Math.max(0, Math.min(1, 1 - coeffOfVar));
  }
  
  /**
   * Calculate signal quality (0-100)
   */
  private calculateQuality(): number {
    if (this.buffer.length < 10) return 0;
    
    // Calculate signal variance
    const mean = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    const variance = this.buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.buffer.length;
    
    // Calculate signal-to-noise ratio
    const signalPower = Math.pow(mean, 2);
    const noisePower = variance;
    
    // Convert to quality score (0-100)
    const snr = signalPower / (noisePower + 0.0001);
    return Math.min(100, Math.max(0, snr * 20));
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.buffer = [];
    this.peakPositions = [];
    this.lastPeakTime = null;
    this.rrIntervals = [];
    this.quality = 0;
  }
  
  /**
   * Configure the processor
   */
  public configure(options: SignalProcessingOptions): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Get RR intervals
   */
  public getRRIntervals(): { intervals: number[], lastPeakTime: number | null } {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }
  
  /**
   * Get arrhythmia counter
   * In this implementation, we don't generate fake arrhythmia counts,
   * this is just a placeholder method for API compatibility
   */
  public getArrhythmiaCounter(): number {
    return 0;
  }
}
