/**
 * Type definitions for heart beat processing
 */

export interface DiagnosticData {
  signalStrength?: number;
  signalQuality?: 'weak' | 'moderate' | 'good' | 'excellent';
  detectionStatus?: string;
  lastProcessedTime?: number;
  lastPeakDetected?: number;
  peakStrength?: number;
  lastValidBpmTime?: number;
  bpmReliability?: number;
  confidenceStatus?: 'low' | 'moderate' | 'high';
  usingHistoricalBPM?: boolean;
  historyBPM?: number;
  originalConfidence?: number;
  adjustedConfidence?: number;
  bpmStatus?: 'zero' | 'normal' | 'high' | 'low' | 'using_historical';
  arrhythmiaTracking?: boolean;
  processingStatus?: string;
  rhythmAnalysis?: {
    regularity: number;
    variability: number;
  };
  processPerformance?: {
    avgProcessTime: number;
    avgSignalStrength: number;
    qualityDistribution: any;
    qualityTrend: string;
  };
  rhythmQuality?: string;
  isFingerDetected?: boolean;
  isArrhythmia?: boolean;
  arrhythmiaCount?: number;
}

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  isArrhythmia?: boolean;
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  };
  diagnosticData?: DiagnosticData;
}

export interface HeartBeatProcessor {
  processSignal: (value: number) => HeartBeatResult;
  reset: () => void;
  getRRIntervals: () => { intervals: number[], lastPeakTime: number | null };
  getArrhythmiaCounter: () => number;
  setMonitoring: (value: boolean) => void;
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
  getDiagnostics?: () => any;
}

export interface UseArrhythmiaDetectorReturn {
  processRRIntervals: (intervals: number[]) => boolean;
  reset: () => void;
  getArrhythmiaState: () => ArrhythmiaState;
  heartRateVariabilityRef: React.MutableRefObject<number[]>;
  stabilityCounterRef: React.MutableRefObject<number>;
  lastRRIntervalsRef: React.MutableRefObject<number[]>;
  lastIsArrhythmiaRef: React.MutableRefObject<boolean>;
  currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>;
  detectArrhythmia?: (intervals: number[]) => RRAnalysisResult;
}

export interface ArrhythmiaState {
  isActive: boolean;
  lastDetectionTime: number;
  recoveryTime: number;
  windows: Array<{start: number, end: number}>;
}

export interface RRAnalysisResult {
  rmssd: number;
  rrVariation: number;
  timestamp: number;
  isArrhythmia: boolean;
}

export interface SignalProcessorOptions {
  lowSignalThreshold?: number;
  maxWeakSignalCount?: number;
  amplificationFactor?: number;
  filterStrength?: number;
  useAdaptiveControl?: boolean;
  qualityEnhancedByPrediction?: boolean;
}

export interface SignalProcessorReturn {
  processSignal: (
    value: number,
    currentBPM: number,
    confidence: number,
    processor: any,
    requestImmediateBeep: (value: number) => boolean,
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastRRIntervalsRef: React.MutableRefObject<number[]>,
    currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>
  ) => HeartBeatResult;
  reset: () => void;
  lastPeakTimeRef: React.MutableRefObject<number | null>;
  lastValidBpmRef: React.MutableRefObject<number>;
  lastSignalQualityRef: React.MutableRefObject<number>;
  consecutiveWeakSignalsRef: React.MutableRefObject<number>;
  MAX_CONSECUTIVE_WEAK_SIGNALS: number;
  signalDistributor: any;
  visualizationBuffer?: number[];
  amplificationFactor?: React.MutableRefObject<number>;
}
