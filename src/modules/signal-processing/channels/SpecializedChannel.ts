/**
 * Base class for all specialized signal channels
 * Provides common functionality for signal optimization
 */
import { VitalSignType, OptimizedSignalChannel, ChannelFeedback } from '../../../types/signal';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for a specialized channel
 */
export interface ChannelConfig {
  initialAmplification: number;
  initialFilterStrength: number;
  frequencyBandMin: number;
  frequencyBandMax: number;
}

/**
 * Abstract base class for specialized signal channels
 */
export abstract class SpecializedChannel implements OptimizedSignalChannel {
  // Channel identification
  public readonly id: string;
  public readonly type: VitalSignType;
  
  // Signal processing parameters
  protected amplification: number;
  protected filterStrength: number;
  protected frequencyBandMin: number;
  protected frequencyBandMax: number;
  
  // Signal quality tracking
  protected quality: number = 0;
  protected recentValues: number[] = [];
  protected readonly MAX_RECENT_VALUES = 30;
  
  /**
   * Constructor
   */
  constructor(type: VitalSignType, config: ChannelConfig) {
    this.id = `${type}-channel-${uuidv4().substring(0, 8)}`;
    this.type = type;
    
    // Set initial parameters
    this.amplification = config.initialAmplification;
    this.filterStrength = config.initialFilterStrength;
    this.frequencyBandMin = config.frequencyBandMin;
    this.frequencyBandMax = config.frequencyBandMax;
    
    console.log(`${this.typeToString()} Channel: Initialized with amplification=${this.amplification}, filter=${this.filterStrength}`);
  }
  
  /**
   * Process a value through the channel
   */
  public processValue(value: number): number {
    // Apply general optimizations
    let optimizedValue = value;
    
    // Apply amplification
    optimizedValue *= this.amplification;
    
    // Apply channel-specific optimization
    optimizedValue = this.applyChannelSpecificOptimization(optimizedValue);
    
    // Apply simple low-pass filter based on filter strength
    if (this.recentValues.length > 0) {
      const lastValue = this.recentValues[this.recentValues.length - 1];
      optimizedValue = lastValue * this.filterStrength + optimizedValue * (1 - this.filterStrength);
    }
    
    // Keep track of recent values
    this.recentValues.push(optimizedValue);
    if (this.recentValues.length > this.MAX_RECENT_VALUES) {
      this.recentValues.shift();
    }
    
    // Update quality estimate
    this.updateQuality();
    
    return optimizedValue;
  }
  
  /**
   * Apply channel-specific optimization
   * Must be implemented by subclasses
   */
  protected abstract applyChannelSpecificOptimization(value: number): number;
  
  /**
   * Apply feedback from vital sign algorithm
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Verify this feedback is for this channel
    if (feedback.channelId !== this.id) {
      console.warn(`${this.typeToString()} Channel: Received feedback for wrong channel (${feedback.channelId})`);
      return;
    }
    
    console.log(`${this.typeToString()} Channel: Applying feedback - quality=${feedback.signalQuality.toFixed(2)}`);
    
    // Apply suggested adjustments if provided
    const adjustments = feedback.suggestedAdjustments;
    
    if (adjustments.amplificationFactor !== undefined) {
      this.amplification *= adjustments.amplificationFactor;
      // Ensure amplification stays in reasonable bounds
      this.amplification = Math.max(0.5, Math.min(3.0, this.amplification));
    }
    
    if (adjustments.filterStrength !== undefined) {
      this.filterStrength = adjustments.filterStrength;
      // Ensure filter strength stays in valid range
      this.filterStrength = Math.max(0, Math.min(0.95, this.filterStrength));
    }
    
    if (adjustments.frequencyRangeMin !== undefined) {
      this.frequencyBandMin = adjustments.frequencyRangeMin;
    }
    
    if (adjustments.frequencyRangeMax !== undefined) {
      this.frequencyBandMax = adjustments.frequencyRangeMax;
    }
    
    console.log(`${this.typeToString()} Channel: New parameters - amplification=${this.amplification.toFixed(2)}, filter=${this.filterStrength.toFixed(2)}`);
  }
  
  /**
   * Get the current signal quality (0-1)
   */
  public getQuality(): number {
    return this.quality;
  }
  
  /**
   * Reset the channel state
   */
  public reset(): void {
    this.recentValues = [];
    this.quality = 0;
    console.log(`${this.typeToString()} Channel: Reset`);
  }
  
  /**
   * Update signal quality estimate based on recent values
   * Protected method that can be overridden by subclasses
   */
  protected updateQuality(): void {
    if (this.recentValues.length < 5) {
      this.quality = 0;
      return;
    }
    
    // Calculate statistics on recent values
    const mean = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.recentValues.length;
    
    // Calculate signal-to-noise ratio (simple approximation)
    const snr = mean !== 0 ? Math.abs(mean / Math.sqrt(variance)) : 0;
    
    // Calculate stability (lower variance is more stable)
    const stability = Math.max(0, Math.min(1, 1 / (1 + variance * 10)));
    
    // Combine factors for overall quality
    this.quality = Math.min(0.95, (snr * 0.6 + stability * 0.4));
  }
  
  /**
   * Get channel parameters for diagnostics
   */
  public getParameters(): {
    amplification: number;
    filterStrength: number;
    frequencyBandMin: number;
    frequencyBandMax: number;
    quality: number;
  } {
    return {
      amplification: this.amplification,
      filterStrength: this.filterStrength,
      frequencyBandMin: this.frequencyBandMin,
      frequencyBandMax: this.frequencyBandMax,
      quality: this.quality
    };
  }
  
  /**
   * Convert type to readable string
   */
  protected typeToString(): string {
    return this.type.charAt(0).toUpperCase() + this.type.slice(1);
  }
}

/**
 * Create a specialized channel for a vital sign
 */
export function createSpecializedChannel(type: VitalSignType): OptimizedSignalChannel {
  // Default config for each channel type
  const configs: Record<VitalSignType, ChannelConfig> = {
    [VitalSignType.SPO2]: {
      initialAmplification: 1.2,
      initialFilterStrength: 0.3,
      frequencyBandMin: 0.5,
      frequencyBandMax: 4.0
    },
    [VitalSignType.BLOOD_PRESSURE]: {
      initialAmplification: 1.5,
      initialFilterStrength: 0.4,
      frequencyBandMin: 0.05,
      frequencyBandMax: 2.0
    },
    [VitalSignType.GLUCOSE]: {
      initialAmplification: 2.0,
      initialFilterStrength: 0.5,
      frequencyBandMin: 0.01,
      frequencyBandMax: 1.0
    },
    [VitalSignType.HYDRATION]: {
      initialAmplification: 1.8,
      initialFilterStrength: 0.45,
      frequencyBandMin: 0.02,
      frequencyBandMax: 1.2
    },
    [VitalSignType.CARDIAC]: {
      initialAmplification: 1.0,
      initialFilterStrength: 0.25,
      frequencyBandMin: 0.8,
      frequencyBandMax: 3.5
    },
    [VitalSignType.LIPIDS]: {
      initialAmplification: 1.8,
      initialFilterStrength: 0.45,
      frequencyBandMin: 0.01,
      frequencyBandMax: 0.8
    }
  };
  
  // Create specialized channel based on type
  switch (type) {
    case VitalSignType.HYDRATION:
      return new HydrationChannel(configs[type]);
    default:
      // Generic implementation for other types
      return new GenericChannel(type, configs[type]);
  }
}

/**
 * Generic implementation of specialized channel
 */
class GenericChannel extends SpecializedChannel {
  constructor(type: VitalSignType, config: ChannelConfig) {
    super(type, config);
  }
  
  protected applyChannelSpecificOptimization(value: number): number {
    // Simple passthrough for generic implementation
    return value;
  }
}

/**
 * Specialized channel for hydration measurement
 */
class HydrationChannel extends SpecializedChannel {
  // Hydration-specific parameters
  private readonly hydrationSensitivity: number = 1.5;
  private readonly frequencyBias: number = 0.2;
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.HYDRATION, config);
  }
  
  protected applyChannelSpecificOptimization(value: number): number {
    // Hydration-specific processing
    // Apply non-linear transformation to enhance hydration-correlated features
    const hydrationEnhanced = Math.sign(value) * Math.pow(Math.abs(value), this.hydrationSensitivity);
    
    // Add frequency bias for hydration detection
    return hydrationEnhanced + this.frequencyBias;
  }
  
  protected override updateQuality(): void {
    // Enhanced quality assessment for hydration
    if (this.recentValues.length < 5) {
      this.quality = 0;
      return;
    }
    
    // Base statistics
    const mean = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.recentValues.length;
    
    // Calculate hydration-specific metrics
    const snr = mean !== 0 ? Math.abs(mean / Math.sqrt(variance)) : 0;
    const stability = Math.max(0, Math.min(1, 1 / (1 + variance * 8)));
    
    // For hydration, stability is more important than SNR
    this.quality = Math.min(0.95, (snr * 0.4 + stability * 0.6));
  }
}
