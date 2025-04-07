
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Definiciones de tipos para procesamiento de señal
 */

import { VitalSignType, SignalProcessingOptions, SignalProcessor } from '../../types/signal';

// Export the enhanced VitalSignType for use in other modules
export { VitalSignType };
export { SignalProcessingOptions };
export { SignalProcessor };

/**
 * Resultado del procesamiento de señal PPG
 */
export interface ProcessedPPGSignal {
  // Marca de tiempo de la señal
  timestamp: number;
  
  // Valor sin procesar
  rawValue: number;
  
  // Valor filtrado
  filteredValue: number;
  
  // Valor normalizado
  normalizedValue: number;
  
  // Valor amplificado
  amplifiedValue: number;
  
  // Calidad de la señal (0-100)
  quality: number;
  
  // Indicador de detección de dedo
  fingerDetected: boolean;
  
  // Fuerza de la señal
  signalStrength: number;
}

/**
 * Resultado del procesamiento de señal cardíaca
 */
export interface ProcessedHeartbeatSignal {
  // Marca de tiempo de la señal
  timestamp: number;
  
  // Valor de la señal
  value: number;
  
  // Indicador de detección de pico
  isPeak: boolean;
  
  // Confianza en la detección del pico (0-1)
  peakConfidence: number;
  
  // BPM instantáneo (basado en intervalo RR)
  instantaneousBPM: number | null;
  
  // Intervalo RR en ms
  rrInterval: number | null;
  
  // Variabilidad del ritmo cardíaco
  heartRateVariability: number | null;
  
  // BPM promedio (necesario para la interfaz)
  averageBPM?: number | null;
}

/**
 * Tipos de procesadores disponibles
 */
export enum ProcessorType {
  PPG = 'ppg',
  HEARTBEAT = 'heartbeat'
}

/**
 * Opciones para el sistema de procesamiento completo
 */
export interface ProcessingSystemOptions extends SignalProcessingOptions {
  // Tipo de procesador a utilizar
  processorType?: ProcessorType;
  
  // Frecuencia de muestreo objetivo
  targetSampleRate?: number;
  
  // Funciones de callback
  onResultsReady?: (result: ProcessedPPGSignal | ProcessedHeartbeatSignal) => void;
  onError?: (error: Error) => void;
}

// Definición para el adaptador predictivo
export interface AdaptivePredictor {
  update(time: number, value: number, quality: number): void;
  predict(time?: number): PredictionResult;
  correctAnomaly(time: number, value: number, quality: number): number;
  calculateArtifactProbability(): number;
  getState(): AdaptiveModelState;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

export interface PredictionResult {
  predictedValue: number;
  confidence: number;
}

export interface AdaptiveModelState {
  coefficients?: number[];
  lastValues?: number[];
  lastTimes?: number[];
  lastQualities?: number[];
  confidence?: number;
  adaptationRate?: number;
}

export interface CircularBufferState {
  buffer: number[];
  capacity: number;
  head: number;
}

// Add BayesianOptimizerConfig interface
export interface BayesianOptimizerConfig {
  parameters: Array<{
    name: string;
    min: number;
    max: number;
    current: number;
  }>;
  explorationFactor?: number;
  historySize?: number;
}

// Errores 
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  DEBUG = 'debug'
}
