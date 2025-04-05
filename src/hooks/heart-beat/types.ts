
/**
 * Type definitions for heart beat processing
 */

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
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
