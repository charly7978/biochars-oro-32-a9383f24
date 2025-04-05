
/**
 * Signal processing and vital signs types
 */

export interface PPGDataPoint {
  value: number;
  timestamp: number;
  quality?: number;
}

export interface TimestampedPPGData {
  value: number;
  time: number;
  timestamp?: number;
  quality?: number;
}

export interface SignalValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  validatedData?: any;
}

// Vital sign types
export type VitalSignType = 
  | 'CARDIAC'
  | 'SPO2'
  | 'BLOOD_PRESSURE'
  | 'GLUCOSE'
  | 'LIPIDS';

// Feedback from channels
export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
}
