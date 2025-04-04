
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
  };
  // Datos de diagnóstico para visualización mejorada
  diagnosticData?: {
    amplifiedValue: number;
    timestamp: number;
    signalQuality: number;
    thresholdValue: number;
    isPeakRealTime: boolean;
  };
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
  lastHeartBeatResult: HeartBeatResult | null; // Added missing property
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
  // Nuevas opciones para visualización mejorada
  visualizationAmplification?: number;
  showDiagnosticOverlay?: boolean;
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

export interface CardiacVisualizationData {
  timestamp: number;
  value: number;
  amplifiedValue: number;
  isPeak: boolean;
  bpm: number;
  isArrhythmia: boolean;
  signalQuality: number;
}

export interface ArrhythmiaVisualizationConfig {
  showDetails: boolean;
  colorMode: 'standard' | 'enhanced';
  indicatorSize: 'small' | 'medium' | 'large';
  showLabels: boolean;
}
