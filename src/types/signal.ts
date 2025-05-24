
/**
 * Vital signs signal types
 */
export enum VitalSignType {
  SPO2 = 'spo2',
  BLOOD_PRESSURE = 'blood_pressure',
  HEARTBEAT = 'heartbeat',
  GLUCOSE = 'glucose',
  LIPIDS = 'lipids',
  HYDRATION = 'hydration',
  CARDIAC = 'cardiac'
}

/**
 * Channel feedback interface
 */
export interface ChannelFeedback {
  signalQuality?: number;
  suggestedAdjustments?: {
    amplificationFactor?: number;
    filterStrength?: number;
    [key: string]: any;
  };
  success?: boolean;
  mlFeedback?: {
    isArrhythmia?: boolean;
    confidence?: number;
  };
  [key: string]: any;
}

/**
 * Processed signal interface
 */
export interface ProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  perfusionIndex: number;
  roi: { x: number; y: number; width: number; height: number; };
}

/**
 * Signal distributor configuration
 */
export interface SignalDistributorConfig {
  enableAdaptiveFiltering?: boolean;
  channels?: VitalSignType[];
  enableFeedback?: boolean;
  adaptChannels?: boolean;
  optimizationInterval?: number;
}

/**
 * PPG Data Point
 */
export interface PPGDataPoint {
  value: number;
  timestamp: number;
  quality: number;
}

/**
 * Timestamped PPG Data
 */
export interface TimestampedPPGData {
  timestamp: number;
  value: number;
  filtered: number;
  quality: number;
}

/**
 * Signal Validation Result
 */
export interface SignalValidationResult {
  isValid: boolean;
  quality: number;
  reason?: string;
}

/**
 * Signal Diagnostic Info
 */
export interface SignalDiagnosticInfo {
  processingTime: number;
  signalStrength: number;
  quality: number;
  timestamp: number;
}

/**
 * Processing Error
 */
export interface ProcessingError {
  message: string;
  code: string;
  timestamp: number;
}

/**
 * Optimized Signal Channel
 */
export interface OptimizedSignalChannel {
  id: string;
  type: VitalSignType;
  quality: number;
  isActive: boolean;
}

/**
 * Signal Processor Interface
 */
export interface SignalProcessor {
  processSignal(value: number): ProcessedSignal;
  reset(): void;
  getState(): any;
}
