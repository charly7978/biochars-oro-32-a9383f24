
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
  timestamp: number;  // Made required to match PPGDataPoint
  quality?: number;
}

export interface SignalValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  validatedData?: any;
  diagnosticInfo?: any; // Added for compatibility with existing code
}

// Add ProcessedSignal type for compatibility with other files
export interface ProcessedSignal {
  timestamp: number;
  value: number;
  filteredValue: number;
  quality: number;
  isPeak?: boolean;
  bpm?: number;
  fingerDetected?: boolean;
  signalStrength?: number;
}

// Vital sign types
export enum VitalSignType {
  CARDIAC = 'CARDIAC',
  SPO2 = 'SPO2',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  GLUCOSE = 'GLUCOSE',
  LIPIDS = 'LIPIDS'
}

// Feedback from channels
export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
  channelId?: string; // Added for compatibility
  suggestedAdjustments?: any; // Added for compatibility
}

// Add missing types that are referenced in errors
export interface ProcessingError {
  code: string;
  message: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recoverable?: boolean;
  component?: string;
  suggestions?: string[];
}

export interface ErrorHandlerConfig {
  logErrors: boolean;
  retryOnError: boolean;
  maxRetries: number;
  notifyUser: boolean;
  fallbackToLastGoodValue: boolean;
}

export interface SignalValidationConfig {
  validateTimestamp: boolean;
  validateQuality: boolean;
  minQuality: number;
  maxDataAge: number;
  enforcePositiveValues: boolean;
}

export interface SignalDiagnosticInfo {
  processingStage: string;
  validationPassed: boolean;
  errorCode?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  timestamp?: number;
  // Add missing properties
  signalQualityMetrics?: {
    snr?: number;
    variance?: number;
  };
  fingerDetectionConfidence?: number;
}

// Add SignalProcessor interface for compatibility
export interface SignalProcessor<T = any> {
  processSignal(value: number): T;
  configure(options: any): void;
  reset(): void;
}
