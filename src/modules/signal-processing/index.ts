
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Punto de entrada del módulo de procesamiento de señales
 * Exporta todas las funcionalidades públicas
 */

// Exportar tipos comunes
export * from './types';

// Exportar procesadores
export * from './ppg-processor';
export * from './heartbeat-processor';

// Exportar sistema de detección de dedos unificado
export {
  unifiedFingerDetector,
  resetFingerDetector,
  getFingerDetectionState,
  updateDetectionSource,
  adaptDetectionThresholds,
  isFingerDetected,
  getDetectionConfidence
} from './finger-detection/unified-finger-detector';

// Usar 'export type' para tipos en lugar de 'export' directo
export type {
  DetectionSource,
  DetectionState,
  DiagnosticEvent,
  DiagnosticEventType,
  AdaptiveCalibrationParams,
  EnvironmentalState
} from './finger-detection/finger-detection-types';

export {
  fingerDiagnostics,
  reportFingerDetection,
  reportDiagnosticEvent,
  getDiagnosticStats,
  clearDiagnosticEvents
} from './finger-detection/finger-diagnostics';

export {
  adaptiveCalibration,
  getCalibrationParameters,
  updateEnvironmentalState,
  resetCalibration
} from './finger-detection/adaptive-calibration';

export {
  analyzeSignalForRhythmicPattern,
  resetRhythmDetector,
  isFingerDetectedByRhythm,
  getConsistentPatternsCount
} from './finger-detection/rhythm-pattern-detector';

export {
  checkSignalStrength,
  shouldProcessMeasurement,
  resetAmplitudeDetector,
  getLastSignalQuality,
  isFingerDetectedByAmplitude
} from './finger-detection/amplitude-detector';

// Exportar utilidades adaptativas 
export { getAdaptivePredictor } from './utils/adaptive-predictor';

// Exportar optimizador bayesiano
export { 
  createBayesianOptimizer,
  createDefaultPPGOptimizer,
  createHeartbeatOptimizer,
  DEFAULT_PPG_PARAMETERS,
  DEFAULT_HEARTBEAT_PARAMETERS,
  OptimizationParameter
} from './utils/bayesian-optimization';

// Use 'export type' for types when isolatedModules is enabled
export type { 
  BayesianOptimizer, 
  BayesianDataPoint,
  BayesianOptimizerConfig,
  GaussianProcess,
  ParameterOptions
} from './utils/bayesian-optimization';

// Exportar sistema adaptativo
export { getAdaptiveSystemCoordinator, MessageType } from './utils/adaptive-system-coordinator';
export type { AdaptiveSystemMessage } from './utils/adaptive-system-coordinator';

// Exportar funciones de creación
export { createPPGSignalProcessor } from './ppg-processor';
export { createHeartbeatProcessor } from './heartbeat-processor';

// Exportar optimizador de parámetros de señal
export {
  SignalParameterOptimizer,
  createSignalParameterOptimizer,
  OptimizationState,
} from './utils/parameter-optimization';

// Exportar tipo de métricas de optimización
export type { OptimizationMetrics } from './utils/parameter-optimization';

// Exportar utilidades de buffer circular optimizado
export { CircularBuffer } from './utils/circular-buffer';
