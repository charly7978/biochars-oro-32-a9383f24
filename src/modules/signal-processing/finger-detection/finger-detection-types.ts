
/**
 * Tipos para el sistema de detección de dedos unificado
 */

/**
 * Fuentes de detección disponibles
 */
export type DetectionSource = 
  | 'amplitude' 
  | 'rhythm' 
  | 'combined'
  | 'ppg-extractor'
  | 'signal-quality-amplitude'
  | 'signal-quality-pattern'
  | 'signal-quality-state'
  | 'weak-signal-result'
  | 'rhythm-pattern'
  | 'brightness'
  | 'camera-analysis'
  | 'motion-detection'
  | 'unified-detection';

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
  detected: boolean;
  confidence: number;
  isFingerDetected: boolean;
  amplitude: SourceDetectionResult;
  rhythm: SourceDetectionResult;
  sources: Record<string, { detected: boolean, confidence: number }>;
  lastUpdate: number;
  thresholds?: Record<string, number>;
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
 * Eventos de diagnóstico
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  message: string;
  source?: DetectionSource;
  isFingerDetected?: boolean;
  confidence?: number;
  details?: Record<string, any>;
  timestamp: number;
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
    camera?: any;
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
  sensitivityLevel?: number;
  environmentQualityFactor?: number;
  amplitudeThreshold?: number;
  falsePositiveReduction?: number;
  falseNegativeReduction?: number;
  rhythmDetectionThreshold?: number;
  [key: string]: number | undefined;
}
