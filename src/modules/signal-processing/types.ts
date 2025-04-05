
/**
 * Tipos para el procesamiento de señales
 * SOLO PROCESAMIENTO REAL - NO SIMULACIONES
 */

// Configuración del procesador de señales
export interface SignalProcessorConfig {
  sampleRate: number;
  bufferSize: number;
  adaptiveThreshold: boolean;
  calibration: {
    threshold: number;
    baseline: number;
    adaptation: number;
  };
  filter: {
    lowPass: boolean;
    highPass: boolean;
    notch: boolean;
    movingAverage: number;
  };
}

// Resultado del procesamiento PPG
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

// Resultado del procesamiento de latidos
export interface ProcessedHeartbeatSignal {
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
}

// Opciones para configuración del procesamiento de señales
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  adaptationRate?: number;
  amplitudeThreshold?: number;
  noiseLevel?: number;
  motionCompensation?: number;
  filterStrength?: number;
  peakThreshold?: number;
  fingerDetectionSensitivity?: number;
}

// Configuración para procesamiento en tiempo real
export interface RealTimeProcessingConfig {
  sampleRate: number;
  bufferSize: number;
  windowSize: number;
  overlapSize: number;
  adaptiveThreshold: boolean;
  neuralProcessing: boolean;
  tensorBackend: 'webgl' | 'cpu' | 'wasm';
  priorityMode: 'quality' | 'performance' | 'balanced';
}

// Tipos para integración de redes neuronales
export interface NeuralProcessingStats {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusion: number[][];
  processedSamples: number;
  averageConfidence: number;
}

// Configuración para calibración del sistema
export interface CalibrationSettings {
  lastCalibrationDate?: Date;
  perfusionIndex: number;
  qualityThreshold: number;
  stabilityThreshold: number;
  redThresholdMin: number;
  redThresholdMax: number;
  referenceValues: {
    systolic?: number;
    diastolic?: number;
    spo2?: number;
    glucose?: number;
  };
}
