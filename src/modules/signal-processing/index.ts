
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Módulo central para procesamiento de señales
 * Exporta todas las funciones y tipos necesarios para el procesamiento de señales reales
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
