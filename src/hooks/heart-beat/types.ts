
import { RRAnalysisResult } from '../arrhythmia/types';

export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

export interface RRIntervalItem {
  time: number;
  rrInterval: number;
  isValid: boolean;
}

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  cardiacPeakCount?: number;  // Added for compatibility
  cardiacArrhythmiaCount?: number; // Added for compatibility
  isArrhythmia?: boolean; // Added for compatibility
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  };
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
