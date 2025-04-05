
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Definiciones de tipos para procesamiento de señal
 */

/**
 * Opciones de configuración para procesadores de señal
 */
export interface SignalProcessingOptions {
  // Factor de amplificación de señal
  amplificationFactor?: number;
  
  // Fuerza de filtrado
  filterStrength?: number;
  
  // Umbral de calidad de señal
  qualityThreshold?: number;
  
  // Sensibilidad de detección de dedo
  fingerDetectionSensitivity?: number;
  
  // Nuevos parámetros para control adaptativo
  useAdaptiveControl?: boolean;
  
  // Usar predicción para mejorar calidad
  qualityEnhancedByPrediction?: boolean;
  
  // Horizonte de predicción
  predictionHorizon?: number;
  
  // Tasa de adaptación
  adaptationRate?: number;
  
  // Enable WebGPU acceleration if available
  useWebGPU?: boolean;
}

/**
 * Basic interface for all signal processors
 */
export interface ISignalProcessor {
  processSignal(value: number): any;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

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
  
  // Added for compatibility with existing code
  rr?: any;
}

/**
 * Feedback from processor to adjust parameters
 */
export interface ProcessorFeedback {
  quality: number;
  calibrationStatus: 'none' | 'in_progress' | 'completed' | 'failed';
  lastUpdated: number;
}

/**
 * Tipos de procesadores disponibles
 */
export enum ProcessorType {
  PPG = 'ppg',
  HEARTBEAT = 'heartbeat'
}
