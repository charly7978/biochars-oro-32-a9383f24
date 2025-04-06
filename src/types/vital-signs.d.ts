
/**
 * Central type definitions for vital signs processing
 * IMPORTANT: All modules should import types from here to prevent duplication
 */

/**
 * Result of vital signs processing
 */
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose: number;
  lipids: {
    totalCholesterol: number;
    triglycerides: number;
  };
  hydration: number; // Added hydration field
  confidence?: {
    glucose: number;
    lipids: number;
    overall: number;
  };
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd: number;
    rrVariation: number;
  } | null;
  calibration?: {
    progress: {
      heartRate: number;
      spo2: number;
      pressure: number;
      arrhythmia: number;
    }
  };
}

/**
 * Options for signal processing
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
}

/**
 * Interface for RR interval data
 */
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

/**
 * Interface for arrhythmia processing result
 */
export interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: { 
    timestamp: number; 
    rmssd: number; 
    rrVariation: number; 
  } | null;
}

/**
 * TimestampedPPGData interface for buffer usage
 */
export interface TimestampedPPGData {
  timestamp: number;
  value: number;
  time?: number; // For compatibility
}

/**
 * SignalProcessor interface
 */
export interface SignalProcessor {
  processSignal(value: number): any;
  reset(): void;
  configure(options: SignalProcessingOptions): void;
}
