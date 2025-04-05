
/**
 * Signal processing types
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
  rr?: number;
}

/**
 * Signal processing options
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
}

/**
 * Signal processor interface
 */
export interface ISignalProcessor<T = any> {
  processSignal(value: number): T;
  reset(): void;
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  name: string;
  type: ProcessorType;
  bufferSize?: number;
  filterStrength?: number;
}
