
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
    if ((event.type === DiagnosticEventType.FINGER_DETECTED) || 
        (event.type === DiagnosticEventType.FINGER_LOST) || 
        (event.type === DiagnosticEventType.DETECTOR_RESET)) {
      logError(
        `FingerDiagnostics: ${event.type} from ${event.source || 'unknown'} with confidence ${event.confidence || 0}`,
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
   * Alias para mantener compatibilidad con código existente
   */
  public getDiagnosticEvents(count: number = 10): DiagnosticEvent[] {
    return this.getRecentEvents(count);
  }
  
  /**
   * Obtiene estadísticas de diagnóstico
   */
  public getStatistics(): Record<string, any> {
    // Contar eventos por tipo
    const eventCounts: Record<string, number> = {};
    
    this.events.forEach(event => {
      const type = event.type;
      if (!eventCounts[type]) {
        eventCounts[type] = 0;
      }
      eventCounts[type]++;
    });
    
    // Calcular confianza promedio
    const confidenceSum = this.events.reduce((sum, event) => sum + (event.confidence || 0), 0);
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
    type: isDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST,
    message: isDetected ? 'Dedo detectado' : 'Dedo perdido',
    isFingerDetected: isDetected,
    confidence,
    source,
    details,
    timestamp: Date.now()
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
    type: eventType,
    message: `Evento de diagnóstico: ${eventType}`,
    isFingerDetected,
    confidence,
    source,
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
