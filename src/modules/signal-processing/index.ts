
/**
 * Módulo central para procesamiento de señales
 * Exporta todas las funciones y tipos necesarios para el procesamiento de señales reales
 * SOLO PROCESAMIENTO REAL - NO HAY SIMULACIONES
 */

// Exportar tipos
export * from './finger-detection/finger-detection-types';

// Exportar detector de dedos unificado
export {
  updateDetectionSource,
  getFingerDetectionState,
  resetFingerDetector,
  analyzeSignalForRhythmicPattern,
  isFingerDetected,
  getDetectionConfidence,
  checkSignalStrength,
  unifiedFingerDetector
} from './finger-detection/unified-finger-detector';

// Exportar diagnósticos
export {
  fingerDiagnostics,
  reportFingerDetection,
  reportDiagnosticEvent,
  getDiagnosticStats,
  clearDiagnosticEvents
} from './finger-detection/finger-diagnostics';

// Exportar calibración adaptativa
export {
  updateEnvironmentalState,
  getEnvironmentalState,
  getCalibrationParameters,
  resetCalibration,
  calculateAdaptiveThreshold,
  adaptDetectionThresholds
} from './finger-detection/adaptive-calibration';

// Exportar detector de amplitud
export {
  checkSignalStrength as checkAmplitudeSignalStrength,
  shouldProcessMeasurement,
  resetAmplitudeDetector,
  getLastSignalQuality,
  isFingerDetectedByAmplitude
} from './finger-detection/amplitude-detector';

// Exportar procesador de señales neuronal
export {
  processTensorSignal,
  createNeuralProcessor,
  getNeuralNetworkState,
  resetNeuralNetwork,
  applyAdaptiveCalibration
} from './neural/tensor-processor';

// Exportar modelos tensoriales optimizados para procesamiento en tiempo real
export {
  MixedModel,
  getMixedModel,
  resetMixedModel,
  type MixedModelPrediction,
  type MixedModelConfig
} from './utils/mixed-model';

// Exportar tipos de procesamiento de señales
export type { 
  ProcessedPPGSignal, 
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  SignalProcessorConfig,
  RealTimeProcessingConfig
} from './types';

// Exportar procesadores principales
export { PPGSignalProcessor } from './processors/ppg-processor';
export { HeartbeatProcessor } from './processors/heartbeat-processor';
