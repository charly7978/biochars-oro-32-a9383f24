
/**
 * Unified type definitions for signal processing
 * This file consolidates all type definitions to ensure consistency across the codebase
 */

// Basic signal data points
export interface PPGDataPoint {
  value: number;
  timestamp: number;
  quality?: number;
}

export interface TimestampedPPGData extends PPGDataPoint {
  time: number;
}

// Processed signal types
export interface ProcessedPPGSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue?: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
  isPeak?: boolean;
  bpm?: number;
}

export interface ProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  perfusionIndex?: number;
  spectrumData?: {
    frequencies: number[];
    amplitudes: number[];
    dominantFrequency: number;
  };
  diagnosticInfo?: SignalDiagnosticInfo;
}

// Signal processor interfaces
export interface SignalProcessor<T = any> {
  processSignal(value: number): T;
  configure?(options: SignalProcessingOptions): void;
  reset(): void;
  initialize?(): Promise<void>;
  start?(): void;
  stop?(): void;
  calibrate?(): Promise<boolean>;
  onSignalReady?(signal: ProcessedSignal): void;
  onError?(error: ProcessingError): void;
  processFrame?(imageData: ImageData): void;
  validateSignal?(signal: any): SignalValidationResult;
  getDiagnosticInfo?(): SignalDiagnosticInfo;
}

// Configuration and options
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

// Heartbeat processing types
export interface HeartbeatProcessor {
  processSignal(value: number): ProcessedHeartbeatSignal;
  configure(options: HeartbeatProcessingOptions): void;
  reset(): void;
}

export interface ProcessedHeartbeatSignal {
  isPeak: boolean;
  confidence: number;
  value: number;
  bpm: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
  timestamp?: number;
}

export interface HeartbeatProcessingOptions {
  minHeartRate?: number;
  maxHeartRate?: number;
  peakThreshold?: number;
  minPeakDistance?: number;
  arrhythmiaDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

// Channel interfaces
export interface OptimizedChannel {
  processValue(value: number): number;
  reset(): void;
  configure?(options: any): void;
  type?: string;
}

export interface ChannelConfig {
  amplificationFactor: number;
  filterStrength: number;
  qualityThreshold: number;
  enableFeedback?: boolean;
  signalQuality?: number;
}

// Error handling
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

// Signal validation
export interface SignalValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  validatedData?: any;
  diagnosticInfo?: any;
}

export interface SignalValidationConfig {
  validateTimestamp: boolean;
  validateQuality: boolean;
  minQuality: number;
  maxDataAge: number;
  enforcePositiveValues: boolean;
}

// Diagnostics
export interface SignalDiagnosticInfo {
  processingStage: string;
  validationPassed: boolean;
  errorCode?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  timestamp?: number;
  signalQualityMetrics?: {
    snr?: number;
    variance?: number;
  };
  fingerDetectionConfidence?: number;
}

// RR Interval data
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

export interface RRIntervalItem {
  time: number;
  rrInterval: number;
  isValid: boolean;
}

// Arrhythmia processing result
export interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: {
    isArrhythmia?: boolean;
    confidence?: number;
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
}

// Vital Signs Result unified definition
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose?: number;
  lipids?: {
    totalCholesterol: number;
    triglycerides: number;
  };
  confidence?: {
    glucose?: number;
    lipids?: number;
    overall?: number;
  };
  lastArrhythmiaData?: {
    isArrhythmia?: boolean;
    confidence?: number;
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  calibration?: {
    progress?: {
      heartRate?: number;
      spo2?: number;
      pressure?: number;
      arrhythmia?: number;
    }
  };
}

// Helper functions
export const resetFingerDetector = () => {
  console.log('Finger detector reset');
};

export const resetFingerDetectorFunc = resetFingerDetector;

// Channel feedback
export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
  channelId?: string;
  suggestedAdjustments?: any;
  signalQuality?: number;
}

// Arrhythmia window type
export interface ArrhythmiaWindow {
  start: number;
  end: number;
}

// Type for Vital Sign Types
export enum VitalSignType {
  CARDIAC = 'CARDIAC',
  SPO2 = 'SPO2',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  GLUCOSE = 'GLUCOSE',
  LIPIDS = 'LIPIDS'
}
