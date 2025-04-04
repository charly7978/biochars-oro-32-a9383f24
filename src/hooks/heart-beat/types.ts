
/**
 * Type definitions for heart beat related functionality
 */

/**
 * Structure representing a heartbeat result
 */
export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  isArrhythmia: boolean;
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  };
  diagnosticData?: DiagnosticData;
}

/**
 * Structure for diagnostic data
 */
export interface DiagnosticData {
  signalStrength?: number;
  signalQuality?: string;
  isFingerDetected?: boolean;
  isArrhythmia?: boolean;
  arrhythmiaCount?: number;
  lastProcessedTime?: number;
  rhythmAnalysis?: {
    regularity: number;
    variability: number;
  };
  lastPeakDetected?: number;
  peakStrength?: number;
  detectionStatus?: string;
  bpmStatus?: string;
  processingStatus?: string;
  lastValidBpmTime?: number;
  bpmReliability?: number;
  confidenceStatus?: 'low' | 'high' | 'medium' | 'very_low';
  usingHistoricalBPM?: boolean;
  historyBPM?: number;
  originalConfidence?: number;
  adjustedConfidence?: number;
  arrhythmiaTracking?: boolean;
  processPerformance?: {
    avgProcessTime?: number;
    avgSignalStrength?: number;
    qualityDistribution?: any;
    qualityTrend?: string;
  };
}

/**
 * Return type for the useHeartBeat hook
 */
export interface UseHeartBeatReturn {
  currentBPM: number;
  confidence: number;
  processSignal: (value: number) => HeartBeatResult;
  reset: () => void;
  isArrhythmia: boolean;
  requestBeep: (value: number) => boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  getDiagnostics: () => any;
}

/**
 * Structure for heart rate data
 */
export interface HeartRateData {
  bpm: number;
  confidence: number;
  timestamp: number;
  isArrhythmia?: boolean;
  arrhythmiaCount?: number;
}

/**
 * Interface for processor state
 */
export interface ProcessorState {
  active: boolean;
  lastPeakTime: number | null;
  consecutiveBeatsCount: number;
  lastValidBpm: number;
  calibrationCounter: number;
  lastSignalQuality: number;
}

/**
 * Interface for arrhythmia state
 */
export interface ArrhythmiaState {
  isActive: boolean;
  lastDetectionTime: number;
  recoveryTime: number;
  windows: Array<{
    start: number;
    end: number;
  }>;
}

/**
 * Return type for the useArrhythmiaDetector hook
 */
export interface UseArrhythmiaDetectorReturn {
  processRRIntervals: (intervals: number[]) => boolean;
  reset: () => void;
  getArrhythmiaState: () => ArrhythmiaState;
  heartRateVariabilityRef: React.MutableRefObject<number[]>;
  stabilityCounterRef: React.MutableRefObject<number>;
  lastRRIntervalsRef: React.MutableRefObject<number[]>;
  lastIsArrhythmiaRef: React.MutableRefObject<boolean>;
  currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>;
  detectArrhythmia: (intervals: number[]) => RRAnalysisResult;
}

/**
 * Interface for RR interval analysis result
 */
export interface RRAnalysisResult {
  rmssd: number;
  rrVariation: number;
  timestamp: number;
  isArrhythmia: boolean;
}
