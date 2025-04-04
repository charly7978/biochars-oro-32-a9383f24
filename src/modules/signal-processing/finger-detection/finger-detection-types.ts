
/**
 * Tipos para la detección de dedos
 */

// Fuentes de detección válidas
export enum DetectionSource {
  AMPLITUDE = 'amplitude',
  RHYTHM = 'rhythm',
  PPG_EXTRACTOR = 'ppg-extractor',
  SIGNAL_QUALITY_AMPLITUDE = 'signal-quality-amplitude',
  SIGNAL_QUALITY_STATE = 'signal-quality-state',
  BRIGHTNESS = 'brightness',
  WEAK_SIGNAL_RESULT = 'weak-signal-result',
  RHYTHM_PATTERN = 'rhythm-pattern',
  CAMERA_ANALYSIS = 'camera-analysis',
  UNIFIED_DETECTION = 'unified-detection',
  COMBINED = 'combined'
}

// Tipos de eventos diagnósticos
export enum DiagnosticEventType {
  FINGER_DETECTED = 'finger-detected',
  FINGER_LOST = 'finger-lost',
  DETECTOR_RESET = 'detector-reset',
  CALIBRATION_CHANGED = 'calibration-changed',
  SIGNAL_QUALITY_CHANGE = 'signal-quality-change',
  PATTERN_DETECTED = 'pattern-detected',
  PATTERN_LOST = 'pattern-lost',
  PATTERN_TIMEOUT = 'pattern-timeout'
}

// Resultado de detección para una fuente específica
export interface SourceDetectionResult {
  detected: boolean;
  confidence: number;
  timestamp: number;
}

// Estado global de detección
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<string, SourceDetectionResult>;
  amplitude: SourceDetectionResult;
  rhythm: SourceDetectionResult;
  lastUpdate: number;
}

// Evento de diagnóstico
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  source: DetectionSource;
  message: string;
  timestamp: number;
  data?: any;
}

// Estadísticas de diagnóstico
export interface DiagnosticStats {
  totalEvents: number;
  detectionRate: number;
  falsePositives: number;
  falseNegatives: number;
  averageConfidence: number;
  events: DiagnosticEvent[];
}

// Parámetros de calibración adaptativa
export interface AdaptiveCalibrationParams {
  baseThreshold: number;
  noiseMultiplier: number;
  lightingCompensation: number;
  motionCompensation: number;
  adaptationRate: number;
  stabilityFactor: number;
  amplitudeThreshold: number;
  environmentQualityFactor: number;
  environmentalState: EnvironmentalState;
}

// Estado ambiental para calibración
export interface EnvironmentalState {
  noise?: number;
  lighting?: number;
  motion?: number;
  brightness?: number;
  deviceInfo?: {
    type?: string;
    resolution?: string;
    fps?: number;
    capabilities?: string[];
    quality?: number;
  };
}
