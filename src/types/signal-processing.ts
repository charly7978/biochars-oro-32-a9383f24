
/**
 * Sistema de tipos unificado para procesamiento de señales
 * Consolida definiciones de tipos de múltiples archivos mientras mantiene toda la funcionalidad
 * Simplificado para enfocarse en SPO2
 */

// Re-exportamos tipos existentes para mantener compatibilidad
export * from './signal';
export * from './vital-signs';

// Tipos centralizados para procesamiento de señal
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  useAdaptiveControl?: boolean;
}

// Interfaz común para todos los procesadores
export interface SignalProcessor<T> {
  processSignal(value: number): T;
  configure(options: SignalProcessingOptions): void;
  reset(): void;
}

// Resultados del procesamiento de señal
export interface ProcessedSignalResult {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
  
  // Adding these properties for compatibility
  isPeak?: boolean;
  rrInterval?: number | null;
  averageBPM?: number;
  heartRate?: number;
}

// Resultado del análisis de intervalo RR
export interface RRIntervalAnalysis {
  intervals: number[];
  lastPeakTime: number | null;
}

// Interfaz unificada para resultados de signos vitales
export interface UnifiedVitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose: number;
  lipids: {
    totalCholesterol: number;
    triglycerides: number;
  };
  confidence?: {
    glucose: number;
    lipids: number;
    overall: number;
  };
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd: number;
    rrVariation: number;
  } | null;
  
  // Adding heartRate for compatibility
  heartRate?: number;
}
