
/**
 * Signal processing module exports
 */

// Export types and interfaces
export type ProcessedPPGSignal = {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
};

export type ProcessedHeartbeatSignal = {
  timestamp: number;
  value: number;
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
};

export type SignalProcessingOptions = {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  predictionHorizon?: number;
  adaptationRate?: number;
};

// Export processors
export { SignalProcessor as PPGSignalProcessor } from '../vital-signs/signal-processor';
export { HeartBeatProcessor as HeartbeatProcessor } from './HeartBeatProcessor';

// Export utility functions
export const resetFingerDetector = () => {
  console.log("Resetting finger detector");
  // Implementation would go here
};

// Export other components
export * from './channels/SpecializedChannel';
