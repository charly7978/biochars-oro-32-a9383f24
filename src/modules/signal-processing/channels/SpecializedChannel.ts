import { OptimizedSignalChannel, ChannelFeedback, VitalSignType } from '../../../types/signal';

/**
 * Base class for specialized signal processing channels
 * Each vital sign has unique processing requirements
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  public id: string;
  public type: VitalSignType;
  protected recentValues: number[] = [];
  protected readonly MAX_HISTORY = 50;
  protected amplification: number;
  protected filterStrength: number;
  protected frequencyBandMin: number;
  protected frequencyBandMax: number;
  private qualityMetric: number = 0.5;
  
  constructor(
    type: VitalSignType,
    config: {
      initialAmplification: number;
      initialFilterStrength: number;
      frequencyBandMin: number;
      frequencyBandMax: number;
    }
  ) {
    this.id = `${type}-channel-${Date.now().toString(36)}`;
    this.type = type;
    this.amplification = config.initialAmplification;
    this.filterStrength = config.initialFilterStrength;
    this.frequencyBandMin = config.frequencyBandMin;
    this.frequencyBandMax = config.frequencyBandMax;
  }
  
  /**
   * Process a value through this channel
   */
  public processValue(value: number): number {
    // Store value in history
    this.recentValues.push(value);
    if (this.recentValues.length > this.MAX_HISTORY) {
      this.recentValues.shift();
    }
    
    // Apply channel-specific processing
    const processedValue = this.applyChannelProcessing(value);
    
    // Update quality metric based on signal characteristics
    this.updateQualityMetric(processedValue);
    
    return processedValue;
  }
  
  /**
   * Apply channel processing (can be overridden by subclasses)
   */
  protected applyChannelProcessing(value: number): number {
    // Apply base filtering and amplification
    const filtered = this.applyFilter(value);
    const amplified = filtered * this.amplification;
    return amplified;
  }
  
  /**
   * Apply filtering based on channel configuration
   */
  protected applyFilter(value: number): number {
    if (this.recentValues.length <= 1) {
      return value;
    }
    
    // Simple exponential moving average filter
    const lastValue = this.recentValues[this.recentValues.length - 2];
    return lastValue * (1 - this.filterStrength) + value * this.filterStrength;
  }
  
  /**
   * Update quality metric based on signal characteristics
   */
  private updateQualityMetric(value: number): void {
    if (this.recentValues.length < 10) {
      return;
    }
    
    // Calculate signal variance (more variance = more information = higher quality)
    const recentValues = this.recentValues.slice(-10);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    
    // Calculate quality based on variance (with a normalized scale)
    // We want some variance, but not too much (too much = noise)
    const normalizedVariance = Math.min(variance * 100, 1.0);
    
    // Weighted update of quality metric (smoothing)
    this.qualityMetric = this.qualityMetric * 0.8 + normalizedVariance * 0.2;
  }
  
  /**
   * Apply feedback from optimization
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Only apply feedback if it's for this channel
    if (feedback.channelId !== this.id) {
      return;
    }
    
    // Apply suggested adjustments if provided
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this.amplification = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
      
      if (feedback.suggestedAdjustments.frequencyRangeMin !== undefined) {
        this.frequencyBandMin = feedback.suggestedAdjustments.frequencyRangeMin;
      }
      
      if (feedback.suggestedAdjustments.frequencyRangeMax !== undefined) {
        this.frequencyBandMax = feedback.suggestedAdjustments.frequencyRangeMax;
      }
    }
  }
  
  /**
   * Get current quality metric
   */
  public getQuality(): number {
    return this.qualityMetric;
  }

  /**
   * Get current amplification factor
   */
  public getAmplification(): number {
    return this.amplification;
  }

  /**
   * Get current filter strength
   */
  public getFilterStrength(): number {
    return this.filterStrength;
  }
  
  /**
   * Reset channel state
   */
  public reset(): void {
    this.recentValues = [];
    this.qualityMetric = 0.5;
    // Keep configuration parameters intact
  }
}
