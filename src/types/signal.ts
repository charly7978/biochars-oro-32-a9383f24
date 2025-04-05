
/**
 * Type definitions for signal processing
 */

export enum VitalSignType {
  SPO2 = "spo2",
  BLOOD_PRESSURE = "blood_pressure",
  GLUCOSE = "glucose",
  HYDRATION = "hydration",
  HEARTBEAT = "heartbeat",
  CARDIAC = "cardiac",
  LIPIDS = "lipids" // Keep for backward compatibility
}

export interface ProcessedSignal {
  timestamp: number;
  filteredValue: number;
  rawValue: number;
  quality: number;
  fingerDetected: boolean;
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  perfusionIndex?: number;
}

export interface OptimizedSignalChannel {
  id: string;
  processValue(value: number): number;
  applyFeedback(feedback: ChannelFeedback): void;
  reset(): void;
  getAmplification(): number;
  getFilterStrength(): number;
}

export interface ChannelFeedback {
  channelId: string;
  signalAmplitude: number;
  signalNoise: number;
  quality: number;
  signalQuality?: number; // Added for backward compatibility
  calibrationStatus: string;
  lastUpdated: number;
  suggestedAdjustments?: {
    amplification?: number;
    filterStrength?: number;
  };
}

// PPG Data Point interfaces
export interface PPGDataPoint {
  value: number;
  time?: number;
}

export interface TimestampedPPGData extends PPGDataPoint {
  timestamp: number;
}

// Signal validation interfaces
export interface SignalValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface SignalValidationConfig {
  minAmplitude: number;
  minDataPoints: number;
  maxNoiseRatio?: number;
}

// Error handling interfaces
export interface ProcessingError {
  code: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  component?: string;
  suggestions?: string[];
  data?: any;
}

export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelay: number;
  useFallback: boolean;
  logErrors: boolean;
}

// Diagnostics interfaces
export interface SignalDiagnosticInfo {
  processingStage: string;
  validationPassed: boolean;
  errorCode?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  timestamp?: number;
}
