
// Define the missing SignalProcessor interface
export interface SignalProcessor {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  processSignal(value: number): any;
}

// Define other types needed for the processors
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

export interface ProcessedHeartbeatSignal {
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

// Export reset function for finger detector
export function resetFingerDetector(): void {
  console.log('Resetting finger detector');
}
