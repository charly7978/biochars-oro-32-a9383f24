
/**
 * Base class for specialized signal processing channels
 * Each channel is optimized for a specific vital sign
 */
import { ProcessorType, ChannelConfig } from '../types';

/**
 * Base channel interface
 */
export interface BaseChannel<T> {
  processValue(value: number): T;
  reset(): void;
  getType(): ProcessorType;
  getName(): string;
  getQuality(): number;
  id?: string;
}

/**
 * Channel feedback interface
 */
export interface ChannelFeedback {
  channelId: string;
  signalQuality: number;
  suggestedAdjustments: {
    amplificationFactor?: number;
    filterStrength?: number;
    baselineCorrection?: number;
    frequencyRangeMin?: number;
    frequencyRangeMax?: number;
  };
  timestamp: number;
  success: boolean;
}

/**
 * Abstract base class for specialized channels
 */
export abstract class SpecializedChannel<T> implements BaseChannel<T> {
  protected type: ProcessorType;
  protected name: string;
  protected quality: number = 0;
  protected recentValues: number[] = [];
  protected readonly MAX_BUFFER_SIZE: number;
  protected filterStrength: number;
  public id?: string;
  
  constructor(config: ChannelConfig) {
    this.type = config.type;
    this.name = config.name;
    this.MAX_BUFFER_SIZE = config.bufferSize || 50;
    this.filterStrength = config.filterStrength || 0.3;
    // Generate a unique ID for the channel based on type and name
    this.id = `${this.type}-${this.name}-${Date.now().toString(36)}`;
  }
  
  /**
   * Process a signal value
   */
  abstract processValue(value: number): T;
  
  /**
   * Reset the channel state
   */
  reset(): void {
    this.recentValues = [];
    this.quality = 0;
  }
  
  /**
   * Get the channel type
   */
  getType(): ProcessorType {
    return this.type;
  }
  
  /**
   * Get the channel name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the current signal quality
   */
  getQuality(): number {
    return this.quality;
  }
  
  /**
   * Apply feedback to adjust channel parameters
   */
  applyFeedback(feedback: ChannelFeedback): void {
    if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
      // Apply suggested amplification factor
    }
    
    if (feedback.suggestedAdjustments.filterStrength !== undefined) {
      this.filterStrength = feedback.suggestedAdjustments.filterStrength;
    }
    
    // Additional feedback parameters can be applied here
  }
  
  /**
   * Add a value to the buffer
   */
  protected addToBuffer(value: number): void {
    this.recentValues.push(value);
    if (this.recentValues.length > this.MAX_BUFFER_SIZE) {
      this.recentValues.shift();
    }
  }
  
  /**
   * Apply an SMA filter to the signal
   */
  protected applySMAFilter(value: number): number {
    if (this.recentValues.length === 0) return value;
    
    const windowSize = Math.min(5, this.recentValues.length);
    const values = this.recentValues.slice(-windowSize);
    return [...values, value].reduce((a, b) => a + b, 0) / (windowSize + 1);
  }
  
  /**
   * Apply an EMA filter to the signal
   */
  protected applyEMAFilter(value: number): number {
    if (this.recentValues.length === 0) return value;
    
    const lastValue = this.recentValues[this.recentValues.length - 1];
    return this.filterStrength * value + (1 - this.filterStrength) * lastValue;
  }
  
  /**
   * Calculate signal quality based on signal properties
   */
  protected calculateSignalQuality(): number {
    if (this.recentValues.length < 10) return 0;
    
    // Get recent values for analysis
    const recentValues = this.recentValues.slice(-10);
    
    // Calculate signal amplitude (min to max) - real data only
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Calculate average and standard deviation - real data only
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentValues.length
    );
    
    // Calculate noise to signal ratio
    const noiseToSignalRatio = stdDev / (amplitude + 0.001);
    
    // Calculate consistency of peak spacing - real data only
    let peakConsistency = 0;
    let lastPeakIndex = -1;
    let peakSpacings = [];
    
    for (let i = 1; i < recentValues.length - 1; i++) {
      if (recentValues[i] > recentValues[i-1] && recentValues[i] > recentValues[i+1]) {
        if (lastPeakIndex !== -1) {
          peakSpacings.push(i - lastPeakIndex);
        }
        lastPeakIndex = i;
      }
    }
    
    if (peakSpacings.length >= 2) {
      const avgSpacing = peakSpacings.reduce((sum, val) => sum + val, 0) / peakSpacings.length;
      const spacingVariance = peakSpacings.reduce((sum, val) => sum + Math.pow(val - avgSpacing, 2), 0) / peakSpacings.length;
      const spacingCoeffOfVar = Math.sqrt(spacingVariance) / avgSpacing;
      peakConsistency = Math.max(0, 1 - spacingCoeffOfVar);
    }
    
    // Calculate overall quality score with weighted components - real data only
    const amplitudeScore = Math.min(1, amplitude / 0.5);  // Normalize amplitude
    const stdDevScore = Math.min(1, Math.max(0, 1 - noiseToSignalRatio));  // Lower noise is better
    
    // Weight the factors to get overall quality
    const weightedScore = (
      amplitudeScore * 0.4 +          // 40% amplitude
      stdDevScore * 0.4 +             // 40% signal-to-noise
      peakConsistency * 0.2           // 20% peak consistency
    );
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, weightedScore));
  }
}
