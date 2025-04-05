
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
    if (['FINGER_DETECTED', 'FINGER_LOST', 'DETECTOR_RESET'].includes(event.eventType)) {
      logError(
        `FingerDiagnostics: ${event.eventType} from ${event.source} with confidence ${event.confidence}`,
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
      if (!eventCounts[event.eventType]) {
        eventCounts[event.eventType] = 0;
      }
      eventCounts[event.eventType]++;
    });
    
    // Calcular confianza promedio
    const confidenceSum = this.events.reduce((sum, event) => sum + event.confidence, 0);
    const avgConfidence = this.events.length > 0 ? confidenceSum / this.events.length : 0;
    
    return {
      totalEvents: this.events.length,
      eventCounts,
      avgConfidence,
      lastEvent: this.events[0]
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
    eventType: isDetected ? 'FINGER_DETECTED' : 'FINGER_LOST',
    source,
    isFingerDetected: isDetected,
    confidence,
    details
  });
}

/**
 * Reporta un evento de diagnóstico genérico
 */
export function reportDiagnosticEvent(
  eventType: DiagnosticEventType,
  source: DetectionSource,
  isFingerDetected: boolean,
  confidence: number,
  details?: Record<string, any>
): void {
  fingerDiagnostics.logEvent({
    eventType,
    source,
    isFingerDetected,
    confidence,
    details
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
