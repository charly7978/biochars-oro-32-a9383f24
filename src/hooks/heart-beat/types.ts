
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

// Add this interface to fix type errors with arrhythmia-detector
export interface UseArrhythmiaDetectorReturn {
  processRRIntervals: (intervals: number[]) => boolean;
  reset: () => void;
  getArrhythmiaState: () => ArrhythmiaState;
  heartRateVariabilityRef: React.MutableRefObject<number[]>;
  stabilityCounterRef: React.MutableRefObject<number>;
  lastRRIntervalsRef: React.MutableRefObject<number[]>;
  lastIsArrhythmiaRef: React.MutableRefObject<boolean>;
  currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>;
}

// Add ArrhythmiaState interface here since it's used above
export interface ArrhythmiaState {
  isActive: boolean;
  lastDetectionTime: number;
  recoveryTime: number;
  windows: Array<{start: number, end: number}>;
}
