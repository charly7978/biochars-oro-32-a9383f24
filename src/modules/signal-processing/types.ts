
/**
 * Signal processing types
 */

export interface ProcessedPPGSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
}

export interface SignalProcessor<T = any> {
  processSignal(value: number): T;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  // Add missing properties used in other files
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

export interface HeartbeatProcessor {
  processSignal(value: number): ProcessedHeartbeatSignal;
  configure(options: HeartbeatProcessingOptions): void;
  reset(): void;
}

export interface ProcessedHeartbeatSignal {
  isPeak: boolean;
  confidence: number;
  value: number;
  bpm: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
  // Add timestamp for compatibility
  timestamp?: number;
}

export interface HeartbeatProcessingOptions {
  minHeartRate?: number;
  maxHeartRate?: number;
  peakThreshold?: number;
  minPeakDistance?: number;
  arrhythmiaDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

export interface OptimizedChannel {
  processValue(value: number): number;
  reset(): void;
  // Add missing methods
  configure?(options: any): void;
  type?: string;
}

export const resetFingerDetector = () => {
  console.log('Finger detector reset');
};

// Add ChannelConfig interface for components that need it
export interface ChannelConfig {
  amplificationFactor: number;
  filterStrength: number;
  qualityThreshold: number;
  enableFeedback?: boolean;
  signalQuality?: number;
}
