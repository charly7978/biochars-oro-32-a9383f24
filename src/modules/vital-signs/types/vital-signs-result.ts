
/**
 * Type definitions for vital signs processing results
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
  hydration: number; // Required field
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

// Adding an interface for the processor parameters for better type safety
export interface VitalSignsProcessorParams {
  value: number;
  rrData?: {
    intervals: number[];
    lastPeakTime: number | null;
  };
  isWeakSignal?: boolean;
}
