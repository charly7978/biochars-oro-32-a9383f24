
import { VitalSignType, ChannelFeedback } from '../../../types/signal';

/**
 * Abstract base class for vital sign processors
 */
export abstract class BaseVitalSignProcessor<T> {
  protected readonly signalType: VitalSignType;
  private lastProcessingTime: number = 0;
  private baselineValue: number = 0;
  private buffer: number[] = [];
  private readonly bufferSize = 10;
  private readonly processingInterval = 100; // ms
  private quality: number = 0;
  
  /**
   * Create a new processor for a specific vital sign
   */
  constructor(signalType: VitalSignType) {
    this.signalType = signalType;
  }
  
  /**
   * Process a value and return the appropriate measurement
   */
  public processValue(value: number): T | null {
    // Buffer values for smoothing
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    
    // Don't process too often
    const now = Date.now();
    if (now - this.lastProcessingTime < this.processingInterval) {
      return null;
    }
    
    // Calculate signal quality
    this.updateQuality();
    
    // Update baseline
    this.updateBaseline();
    
    // Process the actual value
    const result = this.processValueImpl(this.getSmoothedValue());
    
    // Update last processing time
    this.lastProcessingTime = now;
    
    return result;
  }
  
  /**
   * Abstract method that each specific processor must implement
   */
  protected abstract processValueImpl(value: number): T;
  
  /**
   * Calculate smoothed value from buffer
   */
  protected getSmoothedValue(): number {
    if (this.buffer.length === 0) return 0;
    
    return this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
  }
  
  /**
   * Update baseline value
   */
  private updateBaseline(): void {
    if (this.buffer.length < 3) return;
    
    const averageValue = this.getSmoothedValue();
    
    // Slowly adjust baseline
    if (this.baselineValue === 0) {
      this.baselineValue = averageValue;
    } else {
      this.baselineValue = this.baselineValue * 0.95 + averageValue * 0.05;
    }
  }
  
  /**
   * Update signal quality measurement
   */
  private updateQuality(): void {
    if (this.buffer.length < 3) {
      this.quality = 0;
      return;
    }
    
    // Calculate variance
    const mean = this.getSmoothedValue();
    const variance = this.buffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.buffer.length;
    
    // Calculate signal-to-noise ratio (higher is better)
    const signalStrength = Math.abs(mean);
    const noiseLevel = Math.sqrt(variance);
    
    // Avoid division by zero
    if (noiseLevel === 0 || signalStrength === 0) {
      this.quality = 0;
      return;
    }
    
    const snr = signalStrength / noiseLevel;
    
    // Convert to quality percentage (0-100)
    this.quality = Math.min(100, Math.max(0, snr * 20));
  }
  
  /**
   * Get current signal quality (0-100)
   */
  public getQuality(): number {
    return this.quality;
  }
  
  /**
   * Get feedback for the signal processor
   */
  public getFeedback(): ChannelFeedback {
    return {
      quality: this.quality,
      suggestedAdjustments: {
        amplificationFactor: this.quality < 40 ? 1.5 : 1.0,
        filterStrength: this.quality < 30 ? 0.8 : 0.5,
        baselineCorrection: this.baselineValue
      }
    };
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.lastProcessingTime = 0;
    this.baselineValue = 0;
    this.buffer = [];
    this.quality = 0;
  }
}
