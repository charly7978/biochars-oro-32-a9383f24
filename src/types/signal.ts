
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
  HYDRATION = 'HYDRATION'
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
