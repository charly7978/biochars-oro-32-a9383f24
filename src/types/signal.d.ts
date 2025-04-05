
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Tipos base para el procesamiento de señales
 */

/**
 * Tipos de señales vitales
 */
export enum VitalSignType {
  SPO2 = 'spo2',
  CARDIAC = 'cardiac',
  BLOOD_PRESSURE = 'blood_pressure',
  GLUCOSE = 'glucose',
  LIPIDS = 'lipids'
}

/**
 * Configuración para distribuidor de señales
 */
export interface SignalDistributorConfig {
  bufferSize?: number;
  channelCount?: number;
}

/**
 * Interface for channel feedback
 */
export interface ChannelFeedback {
  channelId: string;
  signalQuality?: number;
  suggestedAdjustments?: {
    [param: string]: number;
  };
}

/**
 * Interfaz para procesador de señal
 */
export interface SignalProcessor {
  processSignal(value: number): ProcessedSignal;
}

/**
 * Resultado de procesamiento de señal
 */
export interface ProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  perfusionIndex: number;
}

/**
 * Error de procesamiento
 */
export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
}
