
/**
 * Adaptive Signal Processor
 * Advanced signal processing with adaptive filtering and neural enhancement
 */

import { SignalProcessor, SignalProcessingOptions } from './types';
import { getTransformerCNNModel } from '../ai/transformer-cnn-model';
import { tensorflowService } from '../ai/tensorflow-service';

/**
 * Configuration for adaptive processing
 */
export interface AdaptiveProcessorOptions extends SignalProcessingOptions {
  useNeuralEnhancement?: boolean;
  adaptiveFilteringStrength?: number;
  denoisingEnabled?: boolean;
  predictionHorizon?: number;
  signalBufferSize?: number;
}

/**
 * Adaptive signal processor with real-time enhancement
 */
export class AdaptiveSignalProcessor implements SignalProcessor<number> {
  private values: number[] = [];
  private filteredValues: number[] = [];
  private readonly bufferSize: number;
  private amplification: number;
  private filterStrength: number;
  private useNeuralEnhancement: boolean;
  private denoisingEnabled: boolean;
  private adaptiveFilteringStrength: number;
  private lastTimestamp: number = 0;
  private lastPrediction: number | null = null;
  
  constructor(options: AdaptiveProcessorOptions = {}) {
    // Initialize configuration
    this.bufferSize = options.signalBufferSize || 100;
    this.amplification = options.amplificationFactor || 1.5;
    this.filterStrength = options.filterStrength || 0.3;
    this.useNeuralEnhancement = options.useNeuralEnhancement || false;
    this.denoisingEnabled = options.denoisingEnabled || false;
    this.adaptiveFilteringStrength = options.adaptiveFilteringStrength || 0.2;
    
    console.log("AdaptiveSignalProcessor: Initialized with options", {
      bufferSize: this.bufferSize,
      amplification: this.amplification,
      useNeuralEnhancement: this.useNeuralEnhancement
    });
    
    // Initialize TensorFlow for neural enhancement if enabled
    if (this.useNeuralEnhancement) {
      this.initializeNeuralEnhancement();
    }
  }
  
  /**
   * Initialize neural enhancement components
   */
  private async initializeNeuralEnhancement(): Promise<void> {
    try {
      // Check if WebGPU is available
      const webGPUAvailable = await tensorflowService.isWebGPUAvailable();
      console.log(`AdaptiveSignalProcessor: WebGPU ${webGPUAvailable ? 'is' : 'is not'} available`);
      
      // Initialize transformer-CNN model
      const model = getTransformerCNNModel({
        inputLength: this.bufferSize,
        outputLength: 1,
        inputChannels: 1,
        embeddingDim: 32,
        numHeads: 4,
        numTransformerLayers: 2,
        numConvLayers: 2,
        learningRate: 0.001,
        dropoutRate: 0.1,
        quantized: true,
        optimizeForMobile: true,
        useWebGPU: webGPUAvailable
      });
      
      // Pre-build the model to reduce latency on first use
      await model.buildModel();
      
    } catch (error) {
      console.error("AdaptiveSignalProcessor: Failed to initialize neural enhancement", error);
      this.useNeuralEnhancement = false;
    }
  }
  
  /**
   * Process a signal value with adaptive filtering
   */
  public processSignal(value: number): number {
    // Add raw value to buffer
    this.values.push(value);
    if (this.values.length > this.bufferSize) {
      this.values.shift();
    }
    
    // Apply adaptive filtering
    let filteredValue = this.applyAdaptiveFiltering(value);
    
    // Apply neural enhancement if enabled and we have enough data
    if (this.useNeuralEnhancement && this.values.length >= this.bufferSize / 2) {
      this.enhanceWithNeuralModel(filteredValue).catch(err => {
        console.error("Error in neural enhancement:", err);
      });
      
      // Use prediction if available
      if (this.lastPrediction !== null) {
        // Blend filtered value with prediction
        filteredValue = 0.7 * filteredValue + 0.3 * this.lastPrediction;
      }
    }
    
    // Apply denoising if enabled
    if (this.denoisingEnabled && this.filteredValues.length > 3) {
      filteredValue = this.applyDenoising(filteredValue);
    }
    
    // Apply amplification
    filteredValue = filteredValue * this.amplification;
    
    // Store filtered value
    this.filteredValues.push(filteredValue);
    if (this.filteredValues.length > this.bufferSize) {
      this.filteredValues.shift();
    }
    
    // Update timestamp
    this.lastTimestamp = Date.now();
    
    return filteredValue;
  }
  
  /**
   * Apply adaptive filtering based on signal quality
   */
  private applyAdaptiveFiltering(value: number): number {
    // Get signal quality estimate
    const signalQuality = this.estimateSignalQuality();
    
    // Adjust filter strength based on signal quality
    // Lower quality -> stronger filtering
    let adaptiveStrength = this.filterStrength;
    if (signalQuality < 0.5) {
      adaptiveStrength = Math.min(0.8, this.filterStrength * (1 + this.adaptiveFilteringStrength * (1 - signalQuality)));
    } else {
      adaptiveStrength = Math.max(0.1, this.filterStrength * (1 - this.adaptiveFilteringStrength * (signalQuality - 0.5)));
    }
    
    // Apply either SMA or EMA based on signal characteristics
    if (this.detectSharpTransitions()) {
      // Use SMA for smooth transitions during sharp changes
      return this.applySMAFilter(value);
    } else {
      // Use EMA for regular filtering
      return this.applyEMAFilter(value, adaptiveStrength);
    }
  }
  
  /**
   * Apply Simple Moving Average filter
   */
  public applySMAFilter(value: number, values?: number[]): number {
    const valuesToUse = values || this.filteredValues;
    if (valuesToUse.length === 0) return value;
    
    const windowSize = Math.min(5, valuesToUse.length);
    const recentValues = valuesToUse.slice(-windowSize);
    return [...recentValues, value].reduce((a, b) => a + b, 0) / (windowSize + 1);
  }
  
  /**
   * Apply Exponential Moving Average filter
   */
  private applyEMAFilter(value: number, strength: number): number {
    if (this.filteredValues.length === 0) return value;
    
    const lastValue = this.filteredValues[this.filteredValues.length - 1];
    return strength * value + (1 - strength) * lastValue;
  }
  
  /**
   * Apply denoising algorithm based on outlier detection
   */
  private applyDenoising(value: number): number {
    const recentValues = this.filteredValues.slice(-3);
    
    // Calculate mean and standard deviation of recent values
    const mean = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentValues.length
    );
    
    // Check if value is an outlier (more than 2 standard deviations from mean)
    if (Math.abs(value - mean) > 2 * stdDev) {
      // Replace outlier with mean
      return mean;
    }
    
    return value;
  }
  
  /**
   * Enhance signal using neural model
   */
  private async enhanceWithNeuralModel(value: number): Promise<void> {
    if (this.values.length < this.bufferSize) {
      return;
    }
    
    try {
      // Get the model
      const model = getTransformerCNNModel();
      
      // Make prediction
      const result = await model.predict(this.values);
      
      // Update last prediction if confidence is high enough
      if (result.confidence > 0.5) {
        this.lastPrediction = result.values[0];
      }
    } catch (error) {
      console.error("Error in neural enhancement:", error);
    }
  }
  
  /**
   * Estimate signal quality based on various metrics
   */
  private estimateSignalQuality(): number {
    if (this.values.length < 10) return 0.5;
    
    // Calculate signal-to-noise ratio
    const recentValues = this.values.slice(-10);
    const mean = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentValues.length;
    
    // Calculate amplitude
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Calculate quality score (0-1)
    const amplitudeScore = Math.min(1, amplitude / 0.5);
    const varianceScore = Math.min(1, 0.05 / (variance + 0.001));
    
    // Combine scores
    return (amplitudeScore * 0.6 + varianceScore * 0.4);
  }
  
  /**
   * Detect sharp transitions in the signal
   */
  private detectSharpTransitions(): boolean {
    if (this.values.length < 5) return false;
    
    const recentValues = this.values.slice(-5);
    const diffs = [];
    
    for (let i = 1; i < recentValues.length; i++) {
      diffs.push(Math.abs(recentValues[i] - recentValues[i-1]));
    }
    
    const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    
    // If average difference is large, we have sharp transitions
    return avgDiff > 0.05;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.values = [];
    this.filteredValues = [];
    this.lastPrediction = null;
    console.log("AdaptiveSignalProcessor: Reset");
  }
  
  /**
   * Configure processor parameters
   */
  public configure(options: AdaptiveProcessorOptions): void {
    if (options.amplificationFactor !== undefined) {
      this.amplification = options.amplificationFactor;
    }
    
    if (options.filterStrength !== undefined) {
      this.filterStrength = options.filterStrength;
    }
    
    if (options.useNeuralEnhancement !== undefined) {
      const changed = this.useNeuralEnhancement !== options.useNeuralEnhancement;
      this.useNeuralEnhancement = options.useNeuralEnhancement;
      
      if (changed && this.useNeuralEnhancement) {
        // Initialize neural enhancement if newly enabled
        this.initializeNeuralEnhancement();
      }
    }
    
    if (options.denoisingEnabled !== undefined) {
      this.denoisingEnabled = options.denoisingEnabled;
    }
    
    if (options.adaptiveFilteringStrength !== undefined) {
      this.adaptiveFilteringStrength = options.adaptiveFilteringStrength;
    }
    
    console.log("AdaptiveSignalProcessor: Reconfigured with options", {
      amplification: this.amplification,
      filterStrength: this.filterStrength,
      useNeuralEnhancement: this.useNeuralEnhancement,
      denoisingEnabled: this.denoisingEnabled
    });
  }
  
  /**
   * Get PPG values
   */
  public getPPGValues(): number[] {
    return [...this.values];
  }
}
