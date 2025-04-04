
/**
 * Signal processing types
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

export interface SignalProcessor<T = any> {
  processSignal(value: number): T;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

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

export interface OptimizedChannel {
  processValue(value: number): number;
  reset(): void;
  configure?(options: any): void;
  type?: string;
}

export const resetFingerDetector = () => {
  console.log('Finger detector reset');
};

export interface ChannelConfig {
  amplificationFactor: number;
  filterStrength: number;
  qualityThreshold: number;
  enableFeedback?: boolean;
  signalQuality?: number;
}

// Add missing VitalSignsResult interface to ensure compatibility
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose?: number;
  lipids?: {
    totalCholesterol: number;
    triglycerides: number;
  };
  lastArrhythmiaData?: {
    isArrhythmia: boolean;
    confidence: number;
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  calibration?: {
    progress: {
      heartRate?: number;
      spo2?: number;
      pressure?: number;
      arrhythmia?: number;
    }
  };
}

// Add missing RRIntervalData interface to ensure compatibility
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

// Add missing ArrhythmiaProcessingResult interface
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

// Helper function to reset finger detector with a consistent signature
export const resetFingerDetectorFunc = resetFingerDetector;
