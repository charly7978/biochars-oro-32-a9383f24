
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema unificado de detección de dedos - Definiciones de tipos
 * 
 * IMPORTANTE: Este archivo centraliza todas las definiciones de tipos para el sistema
 * de detección de dedos. Evitar crear tipos duplicados en otros archivos.
 */

/**
 * Fuentes de detección válidas para el sistema unificado
 */
export type DetectionSource = 
  'ppg-extractor' |             // Extractor PPG principal
  'signal-quality-amplitude' |   // Detector basado en amplitud de señal
  'signal-quality-pattern' |     // Detector basado en patrones de señal
  'signal-quality-state' |       // Estado general de calidad de señal
  'weak-signal-result' |         // Resultado de análisis de señal débil
  'rhythm-pattern' |             // Detección por patrones rítmicos
  'brightness' |                 // Análisis de brillo de la cámara
  'camera-analysis' |            // Análisis general de imagen de cámara
  'motion-detection' |           // Detector de movimiento
  'unified-detection';           // Salida del sistema unificado

/**
 * Estado de detección para el detector unificado
 */
export interface DetectionState {
  // Estado general de detección
  isFingerDetected: boolean;   // Si se detecta un dedo
  confidence: number;          // Confianza en la detección (0-1)
  
  // Fuentes de detección
  sources: Record<DetectionSource, { 
    detected: boolean,         // Si esta fuente detecta un dedo
    confidence: number         // Confianza de esta fuente (0-1)
  }>;
  
  // Umbrales configurables
  thresholds: {
    sensitivityLevel: number;        // Nivel de sensibilidad (0-1)
    qualityFactor: number;           // Factor de calidad (0-1)
    environmentFactor: number;       // Factor ambiental (0-1)
    adaptationRate: number;          // Tasa de adaptación (0-1)
    amplitudeThreshold: number;      // Umbral de amplitud (0-1)
    falsePositiveReduction: number;  // Reducción de falsos positivos (0-1)
    falseNegativeReduction: number;  // Reducción de falsos negativos (0-1)
  };
}

/**
 * Tipos de eventos de diagnóstico
 */
export type DiagnosticEventType = 
  'PATTERN_DETECTED' |   // Se detectó un patrón rítmico
  'PATTERN_LOST' |       // Se perdió un patrón rítmico
  'LOW_AMPLITUDE' |      // Amplitud de señal muy baja
  'PATTERN_TIMEOUT' |    // Timeout de detección de patrón
  'DETECTOR_RESET' |     // Reseteo del detector
  'FINGER_DETECTED' |    // Dedo detectado
  'FINGER_LOST';         // Dedo perdido

/**
 * Evento de diagnóstico para el sistema de detección
 */
export interface DiagnosticEvent {
  eventType: DiagnosticEventType;      // Tipo de evento
  source: DetectionSource;             // Fuente que generó el evento
  isFingerDetected: boolean;           // Estado de detección
  confidence: number;                  // Confianza (0-1)
  timestamp?: number;                  // Timestamp del evento
  signalValue?: number;                // Valor de señal asociado
  details?: Record<string, any>;       // Detalles adicionales
}

/**
 * Interfaz para la calibración adaptativa del detector
 */
export interface AdaptiveCalibrationParams {
  sensitivityLevel: number;            // Sensibilidad general (0-1)
  rhythmDetectionThreshold: number;    // Umbral para detección de ritmos (0-1)
  amplitudeThreshold: number;          // Umbral de amplitud mínima (0-1)
  falsePositiveReduction: number;      // Factor de reducción de falsos positivos (0-1)
  falseNegativeReduction: number;      // Factor de reducción de falsos negativos (0-1)
  environmentQualityFactor: number;    // Factor de calidad ambiental (0-1)
}

/**
 * Estado ambiental para calibración
 */
export interface EnvironmentalState {
  signalToNoiseRatio?: number;         // Relación señal-ruido (0-1)
  brightness?: number;                 // Brillo ambiental (0-255)
  movement?: number;                   // Nivel de movimiento (0-1)
  temperature?: number;                // Temperatura ambiente (opcional)
  batteryLevel?: number;               // Nivel de batería (0-100)
}
