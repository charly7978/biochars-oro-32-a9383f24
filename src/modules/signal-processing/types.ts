
/**
 * Types for signal processing
 */

export interface ProcessedPPGSignal {
  timestamp: number;
  value: number;
  quality: number;
  isPeak: boolean;
  rawValue?: number;
  filteredValue?: number;
  normalizedValue?: number;
  amplifiedValue?: number;
  fingerDetected?: boolean;
  signalStrength?: number;
}

export interface SignalProcessor {
  processSignal: (value: number) => any;
  reset: () => void;
  initialize?: () => Promise<void>;
}

export interface ProcessedHeartbeatSignal {
  timestamp: number;
  isPeak: boolean;
  value: number;
  confidence: number;
  peakConfidence?: number;
  instantaneousBPM?: number | null;
  rrInterval?: number | null;
  heartRateVariability?: number | null;
}

export interface SignalProcessingOptions {
  sampleRate?: number;
  filterStrength?: number;
  minPeakHeight?: number;
  minPeakDistance?: number;
  windowSize?: number;
  threshold?: number;
}
