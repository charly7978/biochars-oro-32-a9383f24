
/**
 * Type definitions for PPG signal processing
 */

import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';

/**
 * Representa una señal PPG procesada
 */
export interface ProcessedSignal {
  timestamp: number;        // Marca de tiempo de la señal
  rawValue: number;         // Valor crudo del sensor
  filteredValue: number;    // Valor filtrado para análisis
  quality: number;          // Calidad de la señal (0-100)
  fingerDetected: boolean;  // Si se detecta un dedo sobre el sensor
  roi: {                    // Región de interés en la imagen
    x: number;
    y: number;
    width: number;
    height: number;
  };
  perfusionIndex?: number;  // Índice de perfusión opcional
  spectrumData?: {          // Datos del espectro de frecuencia
    frequencies: number[];
    amplitudes: number[];
    dominantFrequency: number;
  };
  diagnosticInfo?: {
    processingStage: string;
    validationPassed: boolean;
    errorCode?: string;
    errorMessage?: string;
    processingTimeMs?: number;
    timestamp?: number;
  };
}

/**
 * Estructura de error de procesamiento
 */
export interface ProcessingError {
  code: string;             // Código de error
  message: string;          // Mensaje descriptivo
  timestamp: number;        // Marca de tiempo del error
  severity: 'low' | 'medium' | 'high' | 'critical'; // Severidad del error
  recoverable: boolean;     // Si el sistema puede recuperarse
  component?: string;       // Componente donde ocurrió el error
  suggestions?: string[];   // Sugerencias de remediación
}

/**
 * Interfaz que deben implementar todos los procesadores de señal
 */
export interface SignalProcessor {
  initialize: () => Promise<void>;                      // Inicialización
  start: () => void;                                    // Iniciar procesamiento
  stop: () => void;                                     // Detener procesamiento
  calibrate?: () => Promise<boolean>;                   // Calibrar el procesador
  onSignalReady?: (signal: ProcessedSignal) => void;    // Callback de señal lista
  onError?: (error: ProcessingError) => void;           // Callback de error
  processFrame?: (imageData: ImageData) => void;        // Procesar frame de imagen
  validateSignal?: (signal: any) => { isValid: boolean, errorCode?: string, errorMessage?: string };
  getDiagnosticInfo?: () => { processingStage: string, validationPassed: boolean, timestamp?: number };
}

/**
 * Extensión global para acceso al procesador de latidos
 */
declare global {
  interface Window {
    heartBeatProcessor: HeartBeatProcessor;
  }
}
