
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
  sources: Record<DetectionSource, { detected: boolean, confidence: number }>;
  lastUpdate: number;
}

/**
 * Tipos de eventos de diagnóstico
 */
export type DiagnosticEventType =
  | 'detection_change'
  | 'threshold_adaptation'
  | 'calibration_update'
  | 'environmental_change'
  | 'signal_quality'
  | 'error'
  | 'info'
  | 'FINGER_DETECTED'
  | 'FINGER_LOST'
  | 'DETECTOR_RESET'
  | 'PATTERN_DETECTED'
  | 'PATTERN_LOST'
  | 'PATTERN_TIMEOUT';

/**
 * Eventos de diagnóstico
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  eventType?: DiagnosticEventType; // For backward compatibility
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
  brightness?: number; // For backward compatibility
  movement?: number; // For backward compatibility
  signalToNoiseRatio?: number; // For backward compatibility
  device?: {
    type: string;
    model?: string;
    capabilities?: string[];
    camera?: any; // For backward compatibility
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
  environmentalState?: EnvironmentalState;
  [key: string]: number | EnvironmentalState | undefined;
}
