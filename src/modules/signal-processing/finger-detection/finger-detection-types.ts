
/**
 * Tipos para el sistema de detección de dedos unificado
 */

/**
 * Fuentes de detección disponibles
 */
export enum DetectionSource {
  AMPLITUDE = 'amplitude',
  RHYTHM = 'rhythm',
  COMBINED = 'combined',
  SIGNAL_QUALITY = 'signal-quality',
  BRIGHTNESS = 'brightness',
  PPG_EXTRACTOR = 'ppg-extractor',
  SIGNAL_QUALITY_AMPLITUDE = 'signal-quality-amplitude',
  SIGNAL_QUALITY_STATE = 'signal-quality-state',
  WEAK_SIGNAL_RESULT = 'weak-signal-result',
  RHYTHM_PATTERN = 'rhythm-pattern',
  UNIFIED_DETECTION = 'unified-detection'
}

/**
 * Tipos de eventos de diagnóstico
 */
export enum DiagnosticEventType {
  DETECTION_CHANGE = 'detection_change',
  THRESHOLD_ADAPTATION = 'threshold_adaptation',
  CALIBRATION_UPDATE = 'calibration_update',
  ENVIRONMENTAL_CHANGE = 'environmental_change',
  SIGNAL_QUALITY = 'signal_quality',
  ERROR = 'error',
  INFO = 'info',
  FINGER_DETECTED = 'FINGER_DETECTED',
  FINGER_LOST = 'FINGER_LOST',
  DETECTOR_RESET = 'DETECTOR_RESET',
  PATTERN_DETECTED = 'PATTERN_DETECTED',
  PATTERN_LOST = 'PATTERN_LOST',
  PATTERN_TIMEOUT = 'PATTERN_TIMEOUT'
}

/**
 * Resultados de detección por fuente
 */
export interface SourceDetectionResult {
  detected: boolean;
  confidence: number;
  timestamp?: number;
}

/**
 * Estado de detección completo
 */
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<string, SourceDetectionResult>;
  amplitude: SourceDetectionResult;
  rhythm: SourceDetectionResult;
  lastUpdate: number;
}

/**
 * Eventos de diagnóstico
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  eventType?: string;
  source?: string;
  isFingerDetected?: boolean;
  confidence?: number;
}

/**
 * Estado ambiental para calibración adaptativa
 */
export interface EnvironmentalState {
  noise: number;
  lighting: number;
  motion: number;
  brightness?: number;
  movement?: number;
  signalToNoiseRatio?: number;
  device?: {
    type: string;
    model?: string;
    capabilities?: string[];
    camera?: {
      type?: string;
      resolution?: string;
      fps?: number;
      capabilities?: string[];
    };
  };
  lastUpdate?: number;
}

/**
 * Parámetros de calibración adaptativa
 */
export interface AdaptiveCalibrationParams {
  baseThreshold: number;
  noiseMultiplier: number;
  lightingCompensation: number;
  motionCompensation: number;
  adaptationRate: number;
  stabilityFactor: number;
  [key: string]: number | EnvironmentalState;
}

/**
 * Opciones de configuración para detección de dedos
 */
export interface FingerDetectionOptions {
  amplitudeSensitivity?: number;
  rhythmSensitivity?: number;
}
