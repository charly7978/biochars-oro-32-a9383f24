
/**
 * Type definitions for vital signs
 */

export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  lastArrhythmiaData?: any;
}

export interface ArrhythmiaData {
  count: number;
  detected: boolean;
  rrIntervals: number[];
  variability: number;
}

export interface BloodPressure {
  systolic: number;
  diastolic: number;
}
