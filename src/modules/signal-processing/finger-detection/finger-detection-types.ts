
/**
 * TIPOS PARA DETECCIÓN DE DEDOS Y DIAGNÓSTICOS
 * Sistema completo de tipos para monitoreo y diagnóstico
 */

/**
 * Fuentes de detección posibles
 */
export type DetectionSource = 
  | 'camera-quality'
  | 'ppg-extractor'
  | 'signal-quality-amplitude'
  | 'rhythm-detector'
  | 'environment-lighting'
  | 'motion-detector'
  | 'adaptive-threshold'
  | 'neural-network'
  | 'tensorflow-model'
  | 'combined-sources'
  | 'calibration-system'
  | 'signal-processor'
  | 'amplitude'
  | 'rhythm'
  | 'brightness'
  | 'camera-analysis'
  | 'signal-quality-state'
  | 'weak-signal-result';

/**
 * Tipos de eventos de diagnóstico
 */
export enum DiagnosticEventType {
  FINGER_DETECTED = 'finger_detected',
  FINGER_LOST = 'finger_lost',
  DETECTION_CHANGE = 'detection_change',
  THRESHOLD_ADAPTATION = 'threshold_adaptation',
  CALIBRATION_UPDATE = 'calibration_update',
  ENVIRONMENTAL_CHANGE = 'environmental_change',
  SIGNAL_QUALITY = 'signal_quality',
  ERROR = 'error',
  INFO = 'info',
  PATTERN_DETECTED = 'pattern_detected',
  PATTERN_LOST = 'pattern_lost',
  PATTERN_TIMEOUT = 'pattern_timeout',
  DETECTOR_RESET = 'detector_reset'
}

/**
 * Estructura de evento de diagnóstico
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  message: string;
  source: DetectionSource;
  isFingerDetected: boolean;
  confidence: number;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * Resultado de detección de fuente
 */
export interface SourceDetectionResult {
  source: DetectionSource;
  detected: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Estado ambiental para calibración
 */
export interface EnvironmentalState {
  noise: number;
  lighting: number;
  motion: number;
  brightness?: number;
  signalToNoiseRatio?: number;
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
  environmentalState?: EnvironmentalState;
  amplitudeThreshold?: number;
  rhythmDetectionThreshold?: number;
  sensitivityLevel?: number;
  environmentQualityFactor?: number;
}

/**
 * Estado interno del detector
 */
export interface DetectionState {
  detected: boolean;
  confidence: number;
  isFingerDetected: boolean;
  amplitude: {
    detected: boolean;
    confidence: number;
  };
  rhythm: {
    detected: boolean;
    confidence: number;
  };
  sources: Partial<Record<DetectionSource, {
    detected: boolean;
    confidence: number;
    lastUpdate: number;
  }>>;
  lastUpdate: number;
  thresholds?: {
    amplitude: number;
    rhythm: number;
    combined: number;
  };
}

/**
 * Estado de calibración del sistema
 */
export interface CalibrationState {
  baseThreshold: number;
  noiseLevel: number;
  lightingLevel: number;
  motionLevel: number;
  adaptationRate: number;
  lastCalibrationTime: number;
  device?: {
    type: string;
    model?: string;
    capabilities?: string[];
  };
}

/**
 * Información sobre hardware disponible
 */
export interface HardwareCapabilities {
  type: string;
  model?: string;
  capabilities?: string[];
  camera?: {
    quality: number;
    frameRate: number;
  };
}

/**
 * Estado de los módulos de procesamiento
 */
export interface ProcessingModuleState {
  name: string;
  active: boolean;
  status: 'ok' | 'warning' | 'error';
  performance: number;
  lastUpdate: number;
  metrics: Record<string, number>;
}

/**
 * Estado de la red neuronal
 */
export interface NeuralNetworkState {
  active: boolean;
  modelLoaded: boolean;
  modelName: string;
  confidence: number;
  inferenceTime: number;
  lastUpdate: number;
}

/**
 * Resultados de análisis de patrones rítmicos
 */
export interface RhythmAnalysisResult {
  isRhythmic: boolean;
  confidence: number;
  period: number | null;
  consistentPatterns: number;
  totalPatterns: number;
}
