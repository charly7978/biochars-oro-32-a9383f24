
/**
 * Types for arrhythmia detection and processing
 */

/**
 * Result of arrhythmia processing
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
 * Configuration for arrhythmia detection
 */
export interface ArrhythmiaDetectionConfig {
  minRRIntervals: number;
  thresholdFactor: number;
  stabilityThreshold: number;
  minTimeBetweenArrhythmias: number;
}

/**
 * Pattern detection result
 */
export interface PatternDetectionResult {
  isArrhythmia: boolean;
  confidence: number;
  pattern: string | null;
}
