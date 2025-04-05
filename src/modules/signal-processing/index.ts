
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

// Exportar utilidades adaptativas 
export { getAdaptivePredictor } from './utils/adaptive-predictor';
export { unifiedFingerDetector } from './utils/unified-finger-detector';

// Exportar optimizador bayesiano
export { 
  BayesianOptimizer,
  createBayesianOptimizer,
  createDefaultPPGOptimizer,
  createHeartbeatOptimizer,
  DEFAULT_PPG_PARAMETERS,
  DEFAULT_HEARTBEAT_PARAMETERS,
  // Renombramos DataPoint para evitar conflicto
  DataPoint as BayesianDataPoint
} from './utils/bayesian-optimization';

// Exportar sistema adaptativo
export {
  getAdaptiveSystemCoordinator,
  AdaptiveSystemCoordinator,
  MessageType
} from './utils/adaptive-system-coordinator';

// Exportar funciones de creación
export { createPPGSignalProcessor } from './ppg-processor';
export { createHeartbeatProcessor } from './heartbeat-processor';

// Exportar optimizador de parámetros de señal
export {
  SignalParameterOptimizer,
  createSignalParameterOptimizer,
  OptimizationState
} from './utils/parameter-optimization';

// Exportar utilidades de buffer circular optimizado
export { CircularBuffer } from './utils/circular-buffer';
