
/**
 * Specialized signal processing channel implementations
 */
import { OptimizedChannel, ChannelConfig } from '../types-unified';

/**
 * Optimized signal channel with improved processing capabilities
 */
export class OptimizedSignalChannel implements OptimizedChannel {
  private config: ChannelConfig;
  private lastValues: number[] = [];
  private readonly MAX_BUFFER_SIZE = 50;

  constructor(config: Partial<ChannelConfig> = {}) {
    // Default configuration with sensible defaults
    this.config = {
      amplificationFactor: config.amplificationFactor || 1.5,
      filterStrength: config.filterStrength || 0.3,
      qualityThreshold: config.qualityThreshold || 0.5,
      enableFeedback: config.enableFeedback || false,
      signalQuality: config.signalQuality || 1.0
    };
  }

  /**
   * Process a single value through the channel
   */
  processValue(value: number): number {
    // Apply filter based on filter strength
    const filteredValue = this.applyFilter(value);
    
    // Apply amplification
    const amplifiedValue = filteredValue * this.config.amplificationFactor;
    
    // Store in buffer
    this.lastValues.push(amplifiedValue);
    if (this.lastValues.length > this.MAX_BUFFER_SIZE) {
      this.lastValues.shift();
    }
    
    return amplifiedValue;
  }
  
  /**
   * Apply filtering to smooth the signal
   */
  private applyFilter(value: number): number {
    if (this.lastValues.length === 0) {
      return value;
    }
    
    // Simple exponential moving average filter
    const lastValue = this.lastValues[this.lastValues.length - 1];
    return value * this.config.filterStrength + lastValue * (1 - this.config.filterStrength);
  }
  
  /**
   * Reset the channel
   */
  reset(): void {
    this.lastValues = [];
  }
  
  /**
   * Configure the channel
   */
  configure(options: Partial<ChannelConfig>): void {
    // Update only provided options
    if (options.amplificationFactor !== undefined) {
      this.config.amplificationFactor = options.amplificationFactor;
    }
    
    if (options.filterStrength !== undefined) {
      this.config.filterStrength = options.filterStrength;
    }
    
    if (options.qualityThreshold !== undefined) {
      this.config.qualityThreshold = options.qualityThreshold;
    }
    
    if (options.enableFeedback !== undefined) {
      this.config.enableFeedback = options.enableFeedback;
    }
    
    if (options.signalQuality !== undefined) {
      this.config.signalQuality = options.signalQuality;
    }
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): ChannelConfig {
    return { ...this.config };
  }
  
  /**
   * Get last processed values
   */
  getLastValues(): number[] {
    return [...this.lastValues];
  }
}
