
import { RRIntervalData } from '../../types/vital-signs';
import { ArrhythmiaWindow } from '../../types/signal';

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  isArrhythmia?: boolean;
  arrhythmiaCount: number;
  arrhythmiaWindows?: ArrhythmiaWindow[];
  rrData: RRIntervalData;
}

export interface UseHeartBeatReturn {
  currentBPM: number;
  confidence: number;
  isArrhythmia: boolean;
  arrhythmiaWindows?: ArrhythmiaWindow[];
  processSignal: (value: number) => HeartBeatResult;
  reset: () => void;
  requestBeep: (value: number) => boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}
