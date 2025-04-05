
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
  diagnosticData?: {
    signalStrength?: number;
    signalQuality?: string;
    detectionStatus?: string;
    lastProcessedTime?: number;
    lastPeakDetected?: number | null;
    peakStrength?: number;
    lastValidBpmTime?: number;
    bpmReliability?: number;
    confidenceStatus?: string;
    processingStatus?: string;
    isFingerDetected?: boolean;
    rhythmAnalysis?: {
      regularity?: number;
      variability?: number;
    };
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
