
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de diagnósticos para la detección de dedos
 * 
 * IMPORTANTE: Este sistema registra y analiza eventos de detección
 * para facilitar el diagnóstico de problemas y mejora continua.
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { DiagnosticEvent, DiagnosticEventType, DetectionSource } from './finger-detection-types';

/**
 * Clase para gestionar diagnósticos de detección de dedos
 */
class FingerDiagnostics {
  private events: DiagnosticEvent[] = [];
  private maxEvents: number = 100;
  
  /**
   * Registra un evento diagnóstico
   */
  public logEvent(event: DiagnosticEvent): void {
    // Añadir timestamp si no existe
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    // Agregar al inicio para tener los más recientes primero
    this.events.unshift(event);
    
    // Limitar número de eventos
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
    
    // Registrar eventos importantes
    if ([DiagnosticEventType.FINGER_DETECTED, DiagnosticEventType.FINGER_LOST, DiagnosticEventType.DETECTOR_RESET].includes(event.type)) {
      logError(
        `FingerDiagnostics: ${event.type} from ${event.source} with confidence ${event.confidence}`,
        ErrorLevel.INFO,
        "FingerDetection"
      );
    }
  }
  
  /**
   * Obtiene los eventos más recientes
   */
  public getRecentEvents(count: number = 10): DiagnosticEvent[] {
    return this.events.slice(0, count);
  }
  
  /**
   * Obtiene estadísticas de diagnóstico
   */
  public getStatistics(): Record<string, any> {
    // Contar eventos por tipo
    const eventCounts: Record<string, number> = {};
    
    this.events.forEach(event => {
      if (!eventCounts[event.type]) {
        eventCounts[event.type] = 0;
      }
      eventCounts[event.type]++;
    });
    
    // Calcular confianza promedio
    const confidenceSum = this.events.reduce((sum, event) => sum + (event.confidence || 0), 0);
    const avgConfidence = this.events.length > 0 ? confidenceSum / this.events.length : 0;
    
    return {
      totalEvents: this.events.length,
      eventCounts,
      avgConfidence,
      lastEvent: this.events[0],
      events: this.events.slice(0, 10) // Include the 10 most recent events
    };
  }
  
  /**
   * Limpia todos los eventos
   */
  public clearEvents(): void {
    this.events = [];
  }
}

// Instancia singleton para diagnósticos
export const fingerDiagnostics = new FingerDiagnostics();

/**
 * Reporta detección de dedo
 */
export function reportFingerDetection(
  isDetected: boolean, 
  confidence: number, 
  source: DetectionSource, 
  details?: Record<string, any>
): void {
  fingerDiagnostics.logEvent({
    type: isDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST,
    message: isDetected ? "Finger detected" : "Finger lost",
    source,
    isFingerDetected: isDetected,
    confidence,
    details,
    timestamp: Date.now()
  });
}

/**
 * Reporta un evento de diagnóstico genérico
 */
export function reportDiagnosticEvent(
  type: DiagnosticEventType,
  source: DetectionSource,
  isFingerDetected: boolean,
  confidence: number,
  details?: Record<string, any>
): void {
  const eventMessage = `Event ${type} from source ${source}`;
  
  fingerDiagnostics.logEvent({
    type,
    message: eventMessage,
    source,
    isFingerDetected,
    confidence,
    details,
    timestamp: Date.now()
  });
}

/**
 * Obtiene estadísticas recientes de diagnóstico
 */
export function getDiagnosticStats(): Record<string, any> {
  return fingerDiagnostics.getStatistics();
}

/**
 * Limpia los eventos de diagnóstico
 */
export function clearDiagnosticEvents(): void {
  fingerDiagnostics.clearEvents();
}
