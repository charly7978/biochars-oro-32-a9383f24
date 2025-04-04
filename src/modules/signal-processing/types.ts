
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Tipos para el procesamiento de señales
 * Define interfaces comunes para diferentes procesadores
 */

/**
 * Opciones de procesamiento de señal
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number; // Factor de amplificación de señal
  filterStrength?: number; // Fuerza del filtrado
  sampleRate?: number; // Tasa de muestreo en muestras por segundo
  qualityThreshold?: number; // Umbral de calidad de señal (0-100)
  fingerDetectionSensitivity?: number; // Sensibilidad para detección de dedos (0-1)
  peakDetectionSensitivity?: number; // Sensibilidad para detección de picos (0-1)
  adaptationRate?: number; // Tasa de adaptación para filtros adaptativos (0-1)
  signalQualityThreshold?: number; // Umbral de calidad para procesamiento (0-100)
  useAdaptiveControl?: boolean; // Si se debe usar control adaptativo
  qualityEnhancedByPrediction?: boolean; // Si se mejora la calidad mediante predicción
  confidenceThreshold?: number; // Umbral de confianza para actualización de modelo (0-1)
  maxMemoryUsage?: number; // Uso máximo de memoria en MB
  optimizePerformance?: boolean; // Si se deben aplicar optimizaciones de rendimiento
  preferGPUAcceleration?: boolean; // Si se debe preferir aceleración por GPU
}

/**
 * Procesador de señal genérico
 */
export interface SignalProcessor<T> {
  processSignal(value: number): T;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

/**
 * Señal PPG procesada
 */
export interface ProcessedPPGSignal {
  timestamp: number; // Timestamp en milisegundos
  rawValue: number; // Valor crudo
  filteredValue: number; // Valor filtrado
  normalizedValue: number; // Valor normalizado
  amplifiedValue: number; // Valor amplificado
  quality: number; // Calidad de señal (0-100)
  fingerDetected: boolean; // Si se detecta dedo
  signalStrength: number; // Fuerza de señal (0-100)
}

/**
 * Señal de latido cardíaco procesada
 */
export interface ProcessedHeartbeatSignal {
  timestamp: number; // Timestamp en milisegundos
  value: number; // Valor de latido procesado
  isPeak: boolean; // Si es un pico cardíaco
  peakConfidence: number; // Confianza en la detección del pico
  instantaneousBPM: number | null; // BPM instantáneo
  rrInterval: number | null; // Intervalo R-R (ms)
  heartRateVariability: number | null; // Variabilidad del ritmo cardíaco
}

/**
 * Punto de datos para optimización
 */
export interface DataPoint {
  input: number[];
  output: number;
  quality?: number;
  timestamp?: number;
}

/**
 * Resultado de optimización
 */
export interface OptimizationResult {
  bestParams: number[];
  expectedImprovement: number;
  confidence: number;
}

/**
 * Punto de datos para optimización bayesiana 
 */
export interface BayesianDataPoint {
  params: Record<string, number>;
  value: number;
  metadata?: {
    timestamp?: number;
    quality?: number;
    source?: string;
  };
}

/**
 * Estado de memoria
 */
export interface MemoryState {
  usedMemory: number;
  totalMemory: number;
  usagePercentage: number;
  isMemoryLimited: boolean;
}

/**
 * Estado de calibración
 */
export interface CalibrationState {
  isCalibrated: boolean;
  lastCalibrationTime: number;
  calibrationQuality: number;
  parameters: Record<string, number>;
}

/**
 * Estado de optimización
 */
export interface OptimizationState {
  isOptimized: boolean;
  lastOptimizationTime: number;
  performanceScore: number;
  parameters: Record<string, number>;
  memoryUsage: MemoryState;
}

/**
 * Mensaje para comunicación entre componentes del sistema adaptativo
 */
export interface AdaptiveSystemMessage {
  source: string;
  destination: string;
  type: string;
  payload: any;
  timestamp?: number;
  priority?: 'high' | 'medium' | 'low';
  id?: string;
}

/**
 * Parámetro de optimización
 */
export interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  step?: number;
  default: number;
  initialValue?: number;
  description?: string;
  weight?: number;
}

/**
 * Configuración del sistema adaptativo
 */
export interface AdaptiveSystemConfig {
  enableOptimization: boolean;
  optimizationInterval: number;
  adaptationRate: number;
  fingerDetectionThreshold: number;
  qualityThreshold: number;
  memoryManagement: {
    maxObservations: number;
    gcInterval: number;
    maxBufferSize: number;
  };
  diagnostics: {
    enableDetailedLogs: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    collectMetrics: boolean;
  };
}

/**
 * Resultado de predicción adaptativa
 */
export interface PredictionResult {
  predictedValue: number;
  confidence: number;
  predictedTimestamp?: number;
}

/**
 * Estado del buffer de memoria circular
 */
export interface CircularBufferState {
  size: number;
  capacity: number;
  memoryUsage: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
}
