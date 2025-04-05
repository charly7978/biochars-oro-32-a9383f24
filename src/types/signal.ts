
/**
 * Interface for PPG data point with timestamp
 */
export interface PPGDataPoint {
  timestamp: number;
  value: number;
  time: number; // Required for backward compatibility
  [key: string]: any;
}

/**
 * Interface for standardized PPG data across the system
 */
export interface TimestampedPPGData {
  timestamp: number;
  value: number;
  time: number; // Changed from optional to required to match PPGDataPoint
  [key: string]: any;
}

// Export the processed signal interface from the .d.ts file
export type { ProcessedSignal, ProcessingError, SignalProcessor } from './signal.d';
