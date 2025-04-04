
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de diagnóstico para detección de dedos
 * Registra eventos y proporciona estadísticas de rendimiento
 */

import { 
  DetectionSource, 
  DiagnosticEvent, 
  DiagnosticEventType, 
  DiagnosticStats 
} from './finger-detection-types';

// Historial de eventos
let diagnosticEvents: DiagnosticEvent[] = [];
const MAX_EVENTS = 100;

// Contador de detecciones
let totalDetections = 0;
let falsePositives = 0;
let falseNegatives = 0;
let totalConfidence = 0;

/**
 * Reporta un evento de detección de dedo
 */
export function reportFingerDetection(
  source: DetectionSource,
  isDetected: boolean,
  confidence: number,
  data?: any
): void {
  const type = isDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST;
  const message = isDetected 
    ? `Dedo detectado por ${source} con confianza ${confidence.toFixed(2)}`
    : `Dedo perdido por ${source} con confianza ${confidence.toFixed(2)}`;
  
  reportDiagnosticEvent(type, source, message, confidence, data);
  
  // Actualizar contadores
  if (isDetected) {
    totalDetections++;
    totalConfidence += confidence;
  }
}

/**
 * Reporta un evento de diagnóstico general
 */
export function reportDiagnosticEvent(
  type: DiagnosticEventType,
  source: DetectionSource,
  message: string,
  confidence: number = 1.0,
  data?: any
): void {
  const event: DiagnosticEvent = {
    type,
    source,
    message,
    timestamp: Date.now(),
    data
  };
  
  // Agregar evento al historial
  diagnosticEvents.push(event);
  
  // Limitar tamaño del historial
  if (diagnosticEvents.length > MAX_EVENTS) {
    diagnosticEvents.shift();
  }
}

/**
 * Obtiene estadísticas de diagnóstico
 */
export function getDiagnosticStats(): DiagnosticStats {
  const totalEvents = diagnosticEvents.length;
  const detectionRate = totalDetections === 0 ? 0 : 
    (totalDetections - falsePositives) / totalDetections;
  const averageConfidence = totalDetections === 0 ? 0 :
    totalConfidence / totalDetections;
  
  return {
    totalEvents,
    detectionRate,
    falsePositives,
    falseNegatives,
    averageConfidence,
    events: [...diagnosticEvents]
  };
}

/**
 * Limpia eventos de diagnóstico
 */
export function clearDiagnosticEvents(): void {
  diagnosticEvents = [];
  totalDetections = 0;
  falsePositives = 0;
  falseNegatives = 0;
  totalConfidence = 0;
}

// Exportar objeto unificado
export const fingerDiagnostics = {
  reportFingerDetection,
  reportDiagnosticEvent,
  getDiagnosticStats,
  clearDiagnosticEvents,
  getDiagnosticEvents: () => [...diagnosticEvents]
};
