
/**
 * Type definitions for heart beat processing
 */

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  isArrhythmia?: boolean;
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  }
}

export interface HeartBeatProcessor {
  processSignal: (value: number) => HeartBeatResult;
  reset: () => void;
  getRRIntervals: () => { intervals: number[], lastPeakTime: number | null };
  getArrhythmiaCounter: () => number;
}

export interface UseHeartBeatReturn {
  currentBPM: number;
  confidence: number;
  processSignal: (value: number) => HeartBeatResult;
  reset: () => void;
  isArrhythmia: boolean;
  requestBeep: (value: number) => boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}
