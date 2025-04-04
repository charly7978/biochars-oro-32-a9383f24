import { OptimizedChannel, ChannelConfig } from '../types';
import { VitalSignType } from '../../../types/signal';

export class CardiacChannel implements OptimizedChannel {
  private amplificationFactor: number;
  private filterStrength: number;
  private qualityThreshold: number;
  private lastValue: number = 0;
  private lastTimestamp: number = 0;
  private recentValues: number[] = [];
  
  constructor(config: ChannelConfig = {
    amplificationFactor: 2.0,
    filterStrength: 0.5,
    qualityThreshold: 0.6
  }) {
    this.amplificationFactor = config.amplificationFactor;
    this.filterStrength = config.filterStrength;
    this.qualityThreshold = config.qualityThreshold;
    this.recentValues = [];
  }
  
  processValue(value: number): number {
    // Store the raw value in recent values array
    this.recentValues.push(value);
    
    // Keep only the last 50 values
    if (this.recentValues.length > 50) {
      this.recentValues.shift();
    }
    
    // Calculate the filtered value
    const filteredValue = this.applyFilter(value);
    
    // Apply amplification
    const amplifiedValue = filteredValue * this.amplificationFactor;
    
    // Store the processed value
    this.lastValue = amplifiedValue;
    this.lastTimestamp = Date.now();
    
    return amplifiedValue;
  }
  
  private applyFilter(value: number): number {
    if (this.recentValues.length < 3) {
      return value;
    }
    
    // Calculate a simple weighted moving average
    const alpha = this.filterStrength; // Smoothing factor
    const recentMean = this.calculateMean(this.recentValues.slice(-3));
    
    return (alpha * value) + ((1 - alpha) * recentMean);
  }
  
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
  
  getLastValue(): number {
    return this.lastValue;
  }
  
  getLastTimestamp(): number {
    return this.lastTimestamp;
  }
  
  calculateQuality(): number {
    if (this.recentValues.length < 5) {
      return 0;
    }
    
    // Calculate signal variance as a quality metric
    const mean = this.calculateMean(this.recentValues);
    const variance = this.recentValues.reduce((acc, val) => {
      const diff = val - mean;
      return acc + (diff * diff);
    }, 0) / this.recentValues.length;
    
    // Normalize variance to a 0-1 quality score
    // Higher variance (more movement) means lower quality
    const qualityScore = Math.max(0, Math.min(1, 1 - (variance / 10000)));
    
    return qualityScore;
  }
  
  reset(): void {
    this.lastValue = 0;
    this.lastTimestamp = 0;
    this.recentValues = [];
  }
  
  configure(config: Partial<ChannelConfig>): void {
    if (config.amplificationFactor !== undefined) {
      this.amplificationFactor = config.amplificationFactor;
    }
    
    if (config.filterStrength !== undefined) {
      this.filterStrength = config.filterStrength;
    }
    
    if (config.qualityThreshold !== undefined) {
      this.qualityThreshold = config.qualityThreshold;
    }
  }
  
  // Add a type property for compatibility
  get type(): string {
    return VitalSignType.CARDIAC;
  }
}
