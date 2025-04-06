
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Type definitions for signal processing
 */

/**
 * Options for signal processing
 */
export interface SignalProcessingOptions {
  // Signal amplification factor
  amplificationFactor?: number;
  
  // Filter strength
  filterStrength?: number;
  
  // Quality threshold
  qualityThreshold?: number;
  
  // Finger detection sensitivity
  fingerDetectionSensitivity?: number;
  
  // New parameters for adaptive control
  useAdaptiveControl?: boolean;
  
  // Use prediction to improve quality
  qualityEnhancedByPrediction?: boolean;
  
  // Prediction horizon
  predictionHorizon?: number;
  
  // Adaptation rate
  adaptationRate?: number;
}

/**
 * Processed PPG signal
 */
export interface ProcessedPPGSignal {
  // Signal timestamp
  timestamp: number;
  
  // Raw value
  rawValue: number;
  
  // Filtered value
  filteredValue: number;
  
  // Normalized value
  normalizedValue: number;
  
  // Amplified value
  amplifiedValue: number;
  
  // Signal quality (0-100)
  quality: number;
  
  // Finger detection indicator
  fingerDetected: boolean;
  
  // Signal strength
  signalStrength: number;
}

/**
 * Processed heartbeat signal
 */
export interface ProcessedHeartbeatSignal {
  // Signal timestamp
  timestamp: number;
  
  // Signal value
  value: number;
  
  // Peak detection
  isPeak: boolean;
  
  // Peak confidence (0-1)
  peakConfidence: number;
  
  // Instantaneous BPM
  instantaneousBPM: number | null;
  
  // RR interval in ms
  rrInterval: number | null;
  
  // Heart rate variability
  heartRateVariability: number | null;
}
