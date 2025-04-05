
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
}

export interface HeartbeatProcessor {
  processSignal(value: number): ProcessedHeartbeatSignal;
  configure(options: HeartbeatProcessingOptions): void;
  reset(): void;
}

export interface ProcessedHeartbeatSignal {
  timestamp: number;
  bpm: number;
  isPeak: boolean;
  confidence: number;
  rrInterval: number | null;
  arrhythmiaDetected: boolean;
  rhythmQuality: number;
}

export interface HeartbeatProcessingOptions {
  minHeartRate?: number;
  maxHeartRate?: number;
  peakThreshold?: number;
  minPeakDistance?: number;
  arrhythmiaDetectionSensitivity?: number;
}

export interface OptimizedChannel {
  processValue(value: number): number;
  reset(): void;
}

export const resetFingerDetector = () => {
  console.log('Finger detector reset');
};
