
/**
 * Signal type definitions for the application
 */

// Vital sign type enum
export enum VitalSignType {
  HEARTBEAT = 'HEARTBEAT',
  SPO2 = 'SPO2',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  GLUCOSE = 'GLUCOSE',
  LIPIDS = 'LIPIDS',
  HYDRATION = 'HYDRATION',
  CARDIAC = 'CARDIAC'
}

// Feedback channel for signal optimization
export interface ChannelFeedback {
  quality: number;
  suggestedAdjustments?: {
    amplificationFactor?: number;
    filterStrength?: number;
    baselineCorrection?: number;
  };
}

// Signal channel interface
export interface OptimizedSignalChannel {
  processSignal: (value: number) => number;
  reset: () => void;
  getQuality: () => number;
  getFeedback: () => ChannelFeedback;
  applyFeedback: (feedback: ChannelFeedback) => void;
}

// Signal distributor configuration
export interface SignalDistributorConfig {
  initialAmplification?: number;
  filterStrength?: number;
  useAdaptiveControl?: boolean;
}

// Processed signal interface
export interface ProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  isPeak?: boolean;
  arrhythmiaDetected?: boolean;
}

// Processing error interface
export interface ProcessingError {
  code: string;
  message: string;
  timestamp: number;
  data?: any;
}

// Signal processor interface
export interface SignalProcessor {
  processSignal: (value: number) => any;
  reset: () => void;
}

// Signal validation interfaces
export interface SignalValidationResult {
  isValid: boolean;
  quality: number;
  fingerDetected: boolean;
  errorCode?: string;
}

export interface SignalValidationConfig {
  minQuality: number;
  minAmplitude: number;
  maxNoiseRatio: number;
}

// PPG data point interfaces
export interface PPGDataPoint {
  timestamp: number;
  value: number;
  time: number;
}

export interface TimestampedPPGData {
  timestamp: number;
  value: number;
  time?: number;
}

// Arrhythmia window for visualization
export interface ArrhythmiaWindow {
  start: number;
  end: number;
}
