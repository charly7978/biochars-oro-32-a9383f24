
/**
 * Type definitions for arrhythmia detection
 */
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

export interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: { 
    timestamp: number; 
    rmssd?: number; 
    rrVariation?: number; 
  } | null;
}

/**
 * Arrhythmia detection sensitivity configuration
 */
export interface ArrhythmiaDetectionConfig {
  minRRVariationPercent: number;
  consecutiveAbnormalThreshold: number;
  minTimeInterval: number; // Milliseconds between detections
}
