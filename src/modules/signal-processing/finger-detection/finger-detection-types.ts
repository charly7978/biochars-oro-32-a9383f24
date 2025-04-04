
/**
 * Tipos para el sistema de detección de dedos unificado
 */

/**
 * Fuentes de detección disponibles
 */
export enum DetectionSource {
  AMPLITUDE = 'amplitude',
  RHYTHM = 'rhythm',
  COMBINED = 'combined'
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
  detected: boolean;
  confidence: number;
  amplitude: SourceDetectionResult;
  rhythm: SourceDetectionResult;
  lastUpdate: number;
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
  INFO = 'info'
}

/**
 * Eventos de diagnóstico
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  message: string;
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
  device?: {
    type: string;
    model?: string;
    capabilities?: string[];
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
  [key: string]: number;
}
