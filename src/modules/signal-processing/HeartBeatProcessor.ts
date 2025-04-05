
/**
 * Heart beat processor for analyzing PPG signal
 * Detects heart beats and calculates heart rate
 */
import { 
  ISignalProcessor, 
  ProcessedHeartbeatSignal,
  SignalProcessingOptions
} from './types';

export class HeartBeatProcessor implements ISignalProcessor<ProcessedHeartbeatSignal> {
  // Configuration
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.2,
    filterStrength: 0.3,
    qualityThreshold: 0.6,
    fingerDetectionSensitivity: 0.7
  };

  // State
  private values: number[] = [];
  private peaks: number[] = [];
  private peakTimes: number[] = [];
  private lastPeakTime: number | null = null;
  private rrIntervals: number[] = [];
  private averageBPM: number = 0;
  private confidence: number = 0;

  // Constants
  private readonly MAX_VALUES = 100;
  private readonly MAX_PEAKS = 20;
  private readonly MAX_RR_INTERVALS = 10;

  /**
   * Create new heart beat processor
   */
  constructor(options?: SignalProcessingOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * Process a PPG signal value to detect heart beats
   */
  public processSignal(value: number): ProcessedHeartbeatSignal {
    // Add value to buffer
    this.values.push(value);
    if (this.values.length > this.MAX_VALUES) {
      this.values.shift();
    }

    // Check if we have enough data
    if (this.values.length < 3) {
      return {
        timestamp: Date.now(),
        bpm: 0,
        confidence: 0,
        isPeak: false,
        rr: null
      };
    }

    // Detect peaks in signal
    const isPeak = this.detectPeak();
    const timestamp = Date.now();

    // Calculate heart rate and confidence
    const bpm = this.calculateHeartRate();
    this.confidence = this.calculateConfidence();

    // Return processed result
    return {
      timestamp,
      bpm,
      confidence: this.confidence,
      isPeak,
      rr: this.rrIntervals.length > 0 ? this.rrIntervals[this.rrIntervals.length - 1] : null
    };
  }

  /**
   * Reset the processor state
   */
  public reset(): void {
    this.values = [];
    this.peaks = [];
    this.peakTimes = [];
    this.lastPeakTime = null;
    this.rrIntervals = [];
    this.averageBPM = 0;
    this.confidence = 0;
  }

  /**
   * Detect peaks in the signal
   * @returns true if a peak was detected in the current value
   */
  private detectPeak(): boolean {
    // Need at least 3 values for peak detection
    if (this.values.length < 3) return false;

    const len = this.values.length;
    const v1 = this.values[len - 3];
    const v2 = this.values[len - 2];
    const v3 = this.values[len - 1];

    // A peak is when middle value is higher than neighbors
    if (v2 > v1 && v2 > v3 && v2 > 0.2) {
      // We found a peak
      this.peaks.push(v2);
      const now = Date.now();
      this.peakTimes.push(now);

      if (this.lastPeakTime) {
        // Calculate RR interval
        const rrInterval = now - this.lastPeakTime;

        // Only accept physiologically plausible intervals (30-200 bpm)
        if (rrInterval >= 300 && rrInterval <= 2000) {
          this.rrIntervals.push(rrInterval);
          if (this.rrIntervals.length > this.MAX_RR_INTERVALS) {
            this.rrIntervals.shift();
          }
        }
      }

      // Update last peak time
      this.lastPeakTime = now;

      // Trim arrays if needed
      if (this.peaks.length > this.MAX_PEAKS) {
        this.peaks.shift();
        this.peakTimes.shift();
      }

      return true;
    }

    return false;
  }

  /**
   * Calculate heart rate from RR intervals
   */
  private calculateHeartRate(): number {
    if (this.rrIntervals.length < 2) {
      return this.averageBPM; // Return last calculated value if not enough data
    }

    // Calculate average RR interval
    const sum = this.rrIntervals.reduce((a, b) => a + b, 0);
    const avgRR = sum / this.rrIntervals.length;

    // Convert to BPM: 60000 ms / RR interval (ms) = BPM
    const bpm = 60000 / avgRR;

    // Update average BPM with smoothing
    this.averageBPM = this.averageBPM === 0 ? 
      bpm : 
      0.7 * this.averageBPM + 0.3 * bpm;

    return Math.round(this.averageBPM);
  }

  /**
   * Calculate confidence level for heart rate measurement
   */
  private calculateConfidence(): number {
    // Factors that affect confidence:
    // 1. Number of detected peaks
    // 2. Consistency of RR intervals
    // 3. Signal amplitude

    // Not enough data
    if (this.peaks.length < 3 || this.rrIntervals.length < 2) {
      return 0.1;
    }

    // Calculate peak amplitude consistency
    const avgPeak = this.peaks.reduce((a, b) => a + b, 0) / this.peaks.length;
    const peakVariance = this.peaks.reduce((a, b) => a + Math.pow(b - avgPeak, 2), 0) / this.peaks.length;
    const amplitudeFactor = Math.min(1, 1 / (1 + peakVariance * 10));

    // Calculate RR interval consistency
    const avgRR = this.rrIntervals.reduce((a, b) => a + b, 0) / this.rrIntervals.length;
    const rrVariance = this.rrIntervals.reduce((a, b) => a + Math.pow(b - avgRR, 2), 0) / this.rrIntervals.length;
    const rrFactor = Math.min(1, 1 / (1 + rrVariance * 0.0001));

    // Calculate data amount factor
    const dataFactor = Math.min(1, this.peaks.length / 10);

    // Combine factors
    return Math.min(1, (amplitudeFactor * 0.3 + rrFactor * 0.5 + dataFactor * 0.2));
  }

  /**
   * Get the average BPM
   */
  public getAverageBPM(): number {
    return Math.round(this.averageBPM);
  }

  /**
   * Get the heart rate variability
   */
  public getHeartRateVariability(): number {
    if (this.rrIntervals.length < 3) return 0;

    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let sumSquaredDiff = 0;
    for (let i = 1; i < this.rrIntervals.length; i++) {
      sumSquaredDiff += Math.pow(this.rrIntervals[i] - this.rrIntervals[i-1], 2);
    }
    
    return Math.sqrt(sumSquaredDiff / (this.rrIntervals.length - 1));
  }

  /**
   * Get RR intervals data
   */
  public getRRIntervals(): { intervals: number[], lastPeakTime: number | null } {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }

  /**
   * Get current options
   */
  public getOptions(): SignalProcessingOptions {
    return { ...this.options };
  }

  /**
   * Update processing options
   */
  public setOptions(options: Partial<SignalProcessingOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
