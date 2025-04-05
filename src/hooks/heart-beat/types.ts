
/**
 * Heart beat signal processing result
 */
export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  isArrhythmia?: boolean;
  filteredValue?: number;
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  };
}

/**
 * Arrhythmia data structure
 */
export interface ArrhythmiaData {
  isArrhythmic: boolean;
  rmssd: number;
  rrVariation: number;
  timestamp: number;
}
