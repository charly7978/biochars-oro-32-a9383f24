
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal processing types
 */

/**
 * Signal processing options
 */
export interface SignalProcessingOptions {
  windowSize?: number;
  sampleRate?: number;
  filterCutoff?: number;
  amplification?: number;
  useAdaptiveControl?: boolean;
  adaptationRate?: number;
  predictionHorizon?: number;
}

/**
 * Processed PPG Signal
 */
export interface ProcessedPPGSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
}

/**
 * Processed Heartbeat Signal
 */
export interface ProcessedHeartbeatSignal {
  timestamp: number;
  value: number;
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  averageBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
}

/**
 * Detection state from the detector
 */
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  sources: Record<string, { detected: boolean, confidence: number }>;
}
