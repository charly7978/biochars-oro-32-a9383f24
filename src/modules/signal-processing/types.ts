
/**
 * Type definitions for signal processing
 */

export interface ProcessedPPGSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  quality: number;
  signalStrength: number;
  fingerDetected: boolean;
}

export interface ProcessedHeartbeatSignal {
  timestamp: number;
  value: number;
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
}

export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
}

export interface ISignalProcessor {
  processSignal(value: number): any;
  reset(): void;
  configure(options: SignalProcessingOptions): void;
}

export interface ProcessorFeedback {
  quality: number;
  calibrationStatus: string;
  lastUpdated: number;
}

export interface ChannelFeedback extends ProcessorFeedback {
  channelId: string;
  signalAmplitude: number;
  signalNoise: number;
}
