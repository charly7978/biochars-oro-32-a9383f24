
/**
 * Signal processing types
 * Optimized and consolidated type definitions
 */

/**
 * Processor type enum
 */
export enum ProcessorType {
  PPG = "ppg",
  HEARTBEAT = "heartbeat",
  SPO2 = "spo2",
  PRESSURE = "pressure",
  GLUCOSE = "glucose",
  LIPIDS = "lipids",
  HYDRATION = "hydration"
}

/**
 * Processed PPG signal
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

/**
 * Processed heartbeat signal
 */
export interface ProcessedHeartbeatSignal {
  timestamp: number;
  bpm: number;
  confidence: number;
  isPeak: boolean;
  // Additional properties
  peakConfidence?: number;
  instantaneousBPM?: number | null;
  rrInterval?: number | null;
  heartRateVariability?: number | null;
}

/**
 * Signal processing options
 */
export interface SignalProcessingOptions {
  filterStrength?: number;
  sensitivity?: number;
  adaptiveThreshold?: boolean;
  useLowPassFilter?: boolean;
  useHighPassFilter?: boolean;
  smoothingFactor?: number;
}

// Export interface for the HeartBeatProcessor for type checking
export interface IHeartBeatProcessor {
  options: ProcessorOptions;
  peaks: number[];
  confidence: number;
  MAX_VALUES: number;
  processSignal(value: number): ProcessedHeartbeatSignal;
  reset(): void;
}

// Common processor options
export interface ProcessorOptions {
  sensitivity?: number;
  adaptiveThreshold?: boolean;
  smoothingFactor?: number;
}

// Interface for general signal processor
export interface ISignalProcessor {
  processSignal(value: number): number;
  reset(): void;
  configure?(options: SignalProcessingOptions): void;
}
