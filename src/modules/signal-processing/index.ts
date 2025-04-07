
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal processing module exports
 */

// Export processors
export { createPPGSignalProcessor } from './ppg-processor';
export { createHeartbeatProcessor } from './heartbeat-processor';

// Export adaptive utilities
export { getAdaptivePredictor } from './utils/adaptive-predictor';

// Export finger detector
export { 
  unifiedFingerDetector, 
  resetFingerDetector 
} from './utils/unified-finger-detector';

// Export circular buffer
export { CircularBuffer } from './utils/circular-buffer';

// Export type definitions
export type {
  ProcessedPPGSignal,
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  SignalProcessor,
  AdaptivePredictor,
  DetectionState,
  CircularBufferState
} from './types';
