
/**
 * Type definitions for signal processing
 * Central type file - all signal-related types should be imported from here
 */

import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';

/**
 * Represents a processed PPG signal
 */
export interface ProcessedSignal {
  timestamp: number;        // Time stamp of the signal
  rawValue: number;         // Raw sensor value
  filteredValue: number;    // Filtered value for analysis
  quality: number;          // Signal quality (0-100)
  fingerDetected: boolean;  // Whether finger is detected on sensor
  roi: {                    // Region of interest in image
    x: number;
    y: number;
    width: number;
    height: number;
  };
  perfusionIndex?: number;  // Optional perfusion index
}

/**
 * Processing error structure
 */
export interface ProcessingError {
  code: string;             // Error code
  message: string;          // Descriptive message
  timestamp: number;        // Error timestamp
  severity?: 'low' | 'medium' | 'high' | 'critical'; // Error severity
  recoverable?: boolean;    // Whether system can recover
  component?: string;       // Component where error occurred
  suggestions?: string[];   // Remediation suggestions
}

/**
 * Interface for signal processors
 */
export interface SignalProcessor {
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
  calibrate?: () => Promise<boolean>;
  onSignalReady?: (signal: ProcessedSignal) => void;
  onError?: (error: ProcessingError) => void;
  processFrame?: (imageData: ImageData) => void;
  validateSignal?: (signal: any) => { isValid: boolean, errorCode?: string, errorMessage?: string };
  getDiagnosticInfo?: () => { processingStage: string, validationPassed: boolean, timestamp?: number };
}

/**
 * Data point for PPG signal
 */
export interface PPGDataPoint {
  value: number;
  time: number;
}

/**
 * PPG data with optional timestamp
 */
export interface TimestampedPPGData {
  value: number;
  time?: number;
}

/**
 * Signal validation result
 */
export interface SignalValidationResult {
  isValid: boolean;
  reason?: string;
  validationId?: string;
  timestamp?: number;
}

/**
 * Signal validation configuration
 */
export interface SignalValidationConfig {
  minAmplitude: number;
  maxAmplitude?: number;
  minVariance?: number;
  maxVariance?: number;
  requiredSampleSize?: number;
  maxTimeGap?: number;
}

/**
 * Signal diagnostic info
 */
export interface SignalDiagnosticInfo {
  timestamp: number;
  processingStage: string;
  validationPassed: boolean;
  signalQualityMetrics?: {
    snr?: number;
    amplitude?: number;
    variance?: number;
  };
  fingerDetectionConfidence?: number;
  errorCode?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  throwOnCritical: boolean;
  retryOnError?: boolean;
  fallbackToLastGoodValue?: boolean;
  maxRetries?: number;
}

/**
 * Signal processing options
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  predictionHorizon?: number;
  adaptationRate?: number;
}

/**
 * Hybrid processing options
 */
export interface HybridProcessingOptions {
  useAdvancedFiltering: boolean;
  amplification: number;
  sensitivity: number;
  useNeuralModels?: boolean;
  neuralWeight?: number;
}

/**
 * Vital sign types
 */
export enum VitalSignType {
  SPO2 = 'spo2',
  BLOOD_PRESSURE = 'bloodPressure',
  GLUCOSE = 'glucose',
  LIPIDS = 'lipids',
  CARDIAC = 'cardiac',
  HYDRATION = 'hydration'
}

/**
 * Channel feedback for optimization
 */
export interface ChannelFeedback {
  channelId: string;
  signalQuality: number;
  suggestedAdjustments?: {
    amplificationFactor?: number;
    filterStrength?: number;
    frequencyRangeMin?: number;
    frequencyRangeMax?: number;
  };
  timestamp: number;
  success: boolean;
}

/**
 * Interface for optimized signal channels
 */
export interface OptimizedSignalChannel {
  id: string;
  processValue(value: number): number;
  applyFeedback(feedback: ChannelFeedback): void;
  getQuality(): number;
  reset(): void;
  getAmplification(): number;
  getFilterStrength(): number;
}

/**
 * Configuration for signal distributor
 */
export interface SignalDistributorConfig {
  enableFeedback: boolean;
  adaptChannels: boolean;
  optimizationInterval: number;
}

/**
 * Extend global window interface for heartbeat processor
 */
declare global {
  interface Window {
    heartBeatProcessor: HeartBeatProcessor;
  }
}
