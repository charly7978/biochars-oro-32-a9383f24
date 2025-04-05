
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
  rr?: number | null;
  // Additional properties needed by implementations
  peakConfidence?: number;
  instantaneousBPM?: number | null;
  rrInterval?: number | null;
  heartRateVariability?: number | null;
  value?: number; // Added to fix build errors
}

/**
 * Signal processing options
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  // Additional options needed by implementations
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

/**
 * Signal processor interface
 */
export interface ISignalProcessor<T = any> {
  processSignal(value: number): T;
  reset(): void;
}

/**
 * Enhanced signal processor interface with additional methods
 * This interface extends ISignalProcessor to maintain compatibility
 */
export interface SignalProcessor<T = any> extends ISignalProcessor<T> {
  processSignal(value: number): T;
  reset(): void;
  configure?(options: SignalProcessingOptions): void;
  getPPGValues?(): number[];
  applySMAFilter?(value: number, values?: number[]): number;
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  name: string;
  type: ProcessorType;
  bufferSize?: number;
  filterStrength?: number;
  initialAmplification?: number;
  frequencyBandMin?: number;
  frequencyBandMax?: number;
}

/**
 * Neural network model type for signal processing
 */
export interface NeuralModelSpec {
  id: string;
  type: "transformer" | "cnn" | "lstm" | "hybrid";
  inputSize: number;
  outputSize: number;
  quantized: boolean;
  optimizedForMobile: boolean;
}

/**
 * Adaptive preprocessing configuration
 */
export interface AdaptivePreprocessingConfig {
  normalizeInput: boolean;
  adaptiveThresholds: boolean;
  filterType: "sma" | "ema" | "wavelet" | "kalman";
  baselineRemoval: boolean;
}

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  smoothingFactor: number;
  outlierRemoval: boolean;
  confidenceThreshold: number;
  ensembleResults: boolean;
}

/**
 * Calibration status
 */
export enum CalibrationStatus {
  UNCALIBRATED = "uncalibrated",
  CALIBRATING = "calibrating",
  CALIBRATED = "calibrated",
  INVALID = "invalid"
}
