
/**
 * Standardized definitions of types for signal processing
 */

/**
 * Options for configuring signal processors
 */
export interface SignalProcessingOptions {
  // Factor of amplification of signal
  amplificationFactor?: number;
  
  // Strength of filtering
  filterStrength?: number;
  
  // Signal quality threshold
  qualityThreshold?: number;
  
  // Finger detection sensitivity
  fingerDetectionSensitivity?: number;
  
  // Parameters for adaptive control
  useAdaptiveControl?: boolean;
  
  // Use prediction to improve quality
  qualityEnhancedByPrediction?: boolean;
  
  // Prediction horizon
  predictionHorizon?: number;
  
  // Adaptation rate
  adaptationRate?: number;
}

/**
 * Common interface for all signal processors
 */
export interface ISignalProcessor<T> {
  // Process a signal value and return a result
  processSignal(value: number): T;
  
  // Configure the processor
  configure(options: SignalProcessingOptions): void;
  
  // Reset the processor
  reset(): void;
}

/**
 * Result of PPG signal processing
 */
export interface ProcessedPPGSignal {
  // Signal timestamp
  timestamp: number;
  
  // Raw value
  rawValue: number;
  
  // Filtered value
  filteredValue: number;
  
  // Normalized value
  normalizedValue: number;
  
  // Amplified value
  amplifiedValue: number;
  
  // Signal quality (0-100)
  quality: number;
  
  // Finger detection indicator
  fingerDetected: boolean;
  
  // Signal strength
  signalStrength: number;
}

/**
 * Result of heartbeat signal processing
 */
export interface ProcessedHeartbeatSignal {
  // Signal timestamp
  timestamp: number;
  
  // Signal value
  value: number;
  
  // Peak detection indicator
  isPeak: boolean;
  
  // Peak detection confidence (0-1)
  peakConfidence: number;
  
  // Instantaneous BPM (based on RR interval)
  instantaneousBPM: number | null;
  
  // RR interval in ms
  rrInterval: number | null;
  
  // Heart rate variability
  heartRateVariability: number | null;
}

/**
 * Available processor types
 */
export enum ProcessorType {
  PPG = 'ppg',
  HEARTBEAT = 'heartbeat'
}

/**
 * Options for the complete processing system
 */
export interface ProcessingSystemOptions extends SignalProcessingOptions {
  // Processor type to use
  processorType?: ProcessorType;
  
  // Target sample rate
  targetSampleRate?: number;
  
  // Callback functions
  onResultsReady?: (result: ProcessedPPGSignal | ProcessedHeartbeatSignal) => void;
  onError?: (error: Error) => void;
}
