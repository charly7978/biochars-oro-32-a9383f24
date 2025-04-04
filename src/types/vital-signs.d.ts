
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
  confidence?: {
    glucose: number;
    lipids: number;
    overall: number;
  };
  lastArrhythmiaData?: {
    isArrhythmia: boolean; // Changed from original to match expected structure
    confidence: number;    // Changed from original to match expected structure
    timestamp: number;
    rmssd?: number;        // Made optional to allow both formats
    rrVariation?: number;  // Made optional to allow both formats
  } | null;
}

/**
 * Options for signal processing
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  useAdaptiveControl?: boolean; // Added for compatibility
  qualityEnhancedByPrediction?: boolean; // Added for compatibility
  adaptationRate?: number; // Added for compatibility
  predictionHorizon?: number; // Added for compatibility
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
    isArrhythmia: boolean; // Added for compatibility
    confidence: number;    // Added for compatibility
    timestamp: number; 
    rmssd: number; 
    rrVariation: number; 
  } | null;
}
