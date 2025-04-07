/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * HeartBeatProcessor class for processing heart beat signals
 * Direct measurement mode only, no simulation
 */
export class HeartBeatProcessor {
  private peaks: number[] = [];
  private values: number[] = [];
  private timestamps: number[] = [];
  private lastPeakTime: number | null = null;
  private bpm: number = 0;
  private confidence: number = 0;
  private arrhythmiaCounter: number = 0;
  private isMonitoring: boolean = false;
  private readonly MAX_VALUES = 100;
  private readonly MIN_PEAK_DISTANCE_MS = 300;

  constructor() {
    // Initialize in safe mode with no simulation
    this.reset();
  }

  /**
   * Process a signal value to extract heart beat information
   */
  public processSignal(value: number): {
    bpm: number;
    confidence: number;
    isPeak: boolean;
    filteredValue?: number;
    arrhythmiaCount: number;
    rrData?: {
      intervals: number[];
      lastPeakTime: number | null;
    };
  } {
    if (!this.isMonitoring) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: this.arrhythmiaCounter
      };
    }

    // Add value to our buffer
    this.values.push(value);
    this.timestamps.push(Date.now());

    // Keep buffer size in check
    if (this.values.length > this.MAX_VALUES) {
      this.values.shift();
      this.timestamps.shift();
    }

    // We need minimum data to process
    if (this.values.length < 10) {
      return {
        bpm: this.bpm,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: this.arrhythmiaCounter
      };
    }

    // Detect peaks - simple peak detection for now
    const isPeak = this.detectPeak(value);
    
    // If peak detected, calculate intervals and BPM
    if (isPeak) {
      this.calculateBpm();
    }

    // Return current state
    return {
      bpm: this.bpm,
      confidence: this.calculateConfidence(),
      isPeak,
      filteredValue: value,
      arrhythmiaCount: this.arrhythmiaCounter,
      rrData: {
        intervals: this.calculateRRIntervals(),
        lastPeakTime: this.lastPeakTime
      }
    };
  }

  /**
   * Set monitoring state
   */
  public setMonitoring(monitoring: boolean): void {
    this.isMonitoring = monitoring;
    if (!monitoring) {
      this.reset();
    }
  }

  /**
   * Reset the processor
   */
  public reset(): void {
    this.peaks = [];
    this.values = [];
    this.timestamps = [];
    this.lastPeakTime = null;
    this.bpm = 0;
    this.confidence = 0;
    // Don't reset arrhythmia counter as that persists between sessions
  }

  /**
   * Get RR intervals for arrhythmia detection
   */
  public getRRIntervals(): { intervals: number[], lastPeakTime: number | null } {
    return {
      intervals: this.calculateRRIntervals(),
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
   * Simple peak detection algorithm
   * Returns true if a peak is detected
   */
  private detectPeak(value: number): boolean {
    // Need at least some history
    if (this.values.length < 5) return false;

    const now = Date.now();
    
    // Enforce minimum time between peaks to avoid noise
    if (this.lastPeakTime !== null && now - this.lastPeakTime < this.MIN_PEAK_DISTANCE_MS) {
      return false;
    }
    
    // Get the last few values
    const recentValues = this.values.slice(-5);
    
    // Current value must be the largest in the window
    const isPeak = value > Math.max(...recentValues.slice(0, 4)) && 
                   value > 0.6; // Minimum threshold for a peak
    
    if (isPeak) {
      this.peaks.push(now);
      this.lastPeakTime = now;
      
      // Keep peaks buffer in check
      if (this.peaks.length > 20) {
        this.peaks.shift();
      }
    }
    
    return isPeak;
  }

  /**
   * Calculate BPM based on peak intervals
   */
  private calculateBpm(): void {
    if (this.peaks.length < 2) {
      this.bpm = 0;
      this.confidence = 0;
      return;
    }
    
    // Calculate intervals between peaks
    const intervals: number[] = [];
    for (let i = 1; i < this.peaks.length; i++) {
      intervals.push(this.peaks[i] - this.peaks[i-1]);
    }
    
    // Filter out unreasonable intervals (too short or too long)
    const validIntervals = intervals.filter(
      interval => interval >= 300 && interval <= 2000
    );
    
    if (validIntervals.length < 1) {
      return;
    }
    
    // Calculate average interval
    const avgInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
    
    // Convert to BPM
    const newBpm = Math.round(60000 / avgInterval);
    
    // Validate BPM is in reasonable range
    if (newBpm >= 40 && newBpm <= 200) {
      // Smooth BPM changes with some damping
      this.bpm = this.bpm === 0 ? newBpm : Math.round(0.7 * this.bpm + 0.3 * newBpm);
      this.confidence = Math.min(1, validIntervals.length / 5); // Confidence based on valid measurements
    }
  }

  /**
   * Calculate intervals between consecutive heart beats
   */
  private calculateRRIntervals(): number[] {
    if (this.peaks.length < 2) {
      return [];
    }
    
    const intervals: number[] = [];
    for (let i = 1; i < this.peaks.length; i++) {
      intervals.push(this.peaks[i] - this.peaks[i-1]);
    }
    
    return intervals;
  }

  /**
   * Calculate confidence in the current BPM measurement
   */
  private calculateConfidence(): number {
    // No confidence if we don't have enough data
    if (this.values.length < 10 || this.peaks.length < 3) {
      return 0;
    }
    
    // Calculate signal quality factors
    const recentValues = this.values.slice(-10);
    const amplitude = Math.max(...recentValues) - Math.min(...recentValues);
    const amplitudeConfidence = Math.min(1, amplitude / 0.5);
    
    // Consistent intervals increase confidence
    const peakIntervals = this.calculateRRIntervals();
    let intervalConsistency = 0;
    
    if (peakIntervals.length >= 3) {
      const avgInterval = peakIntervals.reduce((sum, val) => sum + val, 0) / peakIntervals.length;
      
      // Calculate variation from average
      const variations = peakIntervals.map(interval => Math.abs(interval - avgInterval) / avgInterval);
      const avgVariation = variations.reduce((sum, val) => sum + val, 0) / variations.length;
      
      // Convert variation to consistency (lower variation = higher score)
      intervalConsistency = Math.max(0, 1 - avgVariation * 5);
    }
    
    // Combine factors
    return Math.min(1, (amplitudeConfidence * 0.4 + intervalConsistency * 0.6));
  }
}
