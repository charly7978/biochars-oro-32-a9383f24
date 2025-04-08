
/**
 * Type definitions for vital signs visualization
 */

/**
 * Defines a time window for arrhythmia visualization
 */
export interface ArrhythmiaWindow {
  start: number;
  end: number;
}

/**
 * RR interval data for cardiac measurements
 */
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

/**
 * Heartbeat result interface
 */
export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  rrData: RRIntervalData;
  isArrhythmia?: boolean;
}
