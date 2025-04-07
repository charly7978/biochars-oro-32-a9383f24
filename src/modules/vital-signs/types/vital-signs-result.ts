
/**
 * Types for vital signs processing results
 */

import { RRIntervalData } from "../../../hooks/vital-signs/types";

/**
 * Parameters for vital signs processing
 */
export interface VitalSignsProcessorParams {
  value: number;
  rrData?: RRIntervalData;
}

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
  hydration: number;
  confidence?: {
    glucose?: number;
    lipids?: number;
    overall?: number;
  };
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
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
 * Extended result with precision metrics
 */
export interface PrecisionVitalSignsResult extends VitalSignsResult {
  isCalibrated: boolean;
  correlationValidated: boolean;
  environmentallyAdjusted: boolean;
  precisionMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}
