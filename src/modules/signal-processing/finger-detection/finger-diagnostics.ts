
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de diagnóstico para la detección de dedos
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { 
  DetectionSource, 
  DiagnosticEvent,
  DiagnosticEventType 
} from './finger-detection-types';

/**
 * Clase para gestionar eventos de diagnóstico
 */
class FingerDiagnostics {
  private events: DiagnosticEvent[] = [];
  private maxEvents: number = 100;
  
  /**
   * Reporta un evento de detección de dedo
   */
  public reportFingerDetection(isDetected: boolean, confidence: number, source: DetectionSource, details?: Record<string, any>): void {
    const eventType = isDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST;
    const message = isDetected 
      ? `Dedo detectado por fuente '${source}' con confianza ${confidence.toFixed(2)}`
      : `Dedo perdido por fuente '${source}' con confianza ${confidence.toFixed(2)}`;
    
    this.addEvent({
      type: eventType,
      message,
      source,
      isFingerDetected: isDetected,
      confidence,
      details,
      timestamp: Date.now()
    });
    
    logError(
      message,
      isDetected ? ErrorLevel.INFO : ErrorLevel.WARNING,
      "FingerDiagnostics"
    );
  }
  
  /**
   * Reporta un evento de diagnóstico general
   */
  public reportDiagnosticEvent(
    type: DiagnosticEventType,
    source: DetectionSource,
    fingerDetected: boolean,
    confidence: number,
    details?: Record<string, any>
  ): void {
    let message: string;
    
    switch (type) {
      case DiagnosticEventType.DETECTION_CHANGE:
        message = `Cambio de detección en '${source}'`;
        break;
      case DiagnosticEventType.THRESHOLD_ADAPTATION:
        message = `Adaptación de umbral en '${source}'`;
        break;
      case DiagnosticEventType.CALIBRATION_UPDATE:
        message = `Actualización de calibración en '${source}'`;
        break;
      case DiagnosticEventType.ENVIRONMENTAL_CHANGE:
        message = `Cambio ambiental detectado por '${source}'`;
        break;
      case DiagnosticEventType.SIGNAL_QUALITY:
        message = `Calidad de señal actualizada por '${source}'`;
        break;
      case DiagnosticEventType.ERROR:
        message = `Error en '${source}'`;
        break;
      case DiagnosticEventType.INFO:
        message = `Información de '${source}'`;
        break;
      case DiagnosticEventType.PATTERN_DETECTED:
        message = `Patrón rítmico detectado por '${source}'`;
        break;
      case DiagnosticEventType.PATTERN_LOST:
        message = `Patrón rítmico perdido por '${source}'`;
        break;
      case DiagnosticEventType.PATTERN_TIMEOUT:
        message = `Tiempo de espera agotado para patrón en '${source}'`;
        break;
      case DiagnosticEventType.DETECTOR_RESET:
        message = `Detector '${source}' reiniciado`;
        break;
      default:
        message = `Evento de diagnóstico en '${source}'`;
    }
    
    if (details && details.customMessage) {
      message = details.customMessage;
    }
    
    this.addEvent({
      type,
      message,
      source,
      isFingerDetected: fingerDetected,
      confidence,
      details,
      timestamp: Date.now()
    });
    
    logError(
      message,
      type === DiagnosticEventType.ERROR ? ErrorLevel.ERROR : ErrorLevel.INFO,
      "FingerDiagnostics"
    );
  }
  
  /**
   * Añade un evento a la lista
   */
  private addEvent(event: DiagnosticEvent): void {
    this.events.push(event);
    
    // Limitar tamaño del historial
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
  
  /**
   * Obtiene estadísticas de diagnóstico
   */
  public getStats(): {
    events: DiagnosticEvent[],
    counters: Record<DiagnosticEventType, number>,
    sources: Record<string, number>
  } {
    const counters: Record<DiagnosticEventType, number> = {} as Record<DiagnosticEventType, number>;
    const sources: Record<string, number> = {};
    
    // Inicializar contadores
    Object.values(DiagnosticEventType).forEach(type => {
      counters[type] = 0;
    });
    
    // Contar eventos
    this.events.forEach(event => {
      counters[event.type]++;
      
      if (event.source) {
        sources[event.source] = (sources[event.source] || 0) + 1;
      }
    });
    
    return {
      events: this.events,
      counters,
      sources
    };
  }
  
  /**
   * Limpia eventos de diagnóstico
   */
  public clearEvents(): void {
    this.events = [];
    logError(
      "Eventos de diagnóstico limpiados",
      ErrorLevel.INFO,
      "FingerDiagnostics"
    );
  }
  
  /**
   * Configura el tamaño máximo del historial
   */
  public setMaxEvents(max: number): void {
    this.maxEvents = Math.max(10, max);
    
    // Aplicar nuevo límite
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}

// Singleton
export const fingerDiagnostics = new FingerDiagnostics();

// Funciones de utilidad
export const reportFingerDetection = fingerDiagnostics.reportFingerDetection.bind(fingerDiagnostics);
export const reportDiagnosticEvent = fingerDiagnostics.reportDiagnosticEvent.bind(fingerDiagnostics);
export const getDiagnosticStats = fingerDiagnostics.getStats.bind(fingerDiagnostics);
export const clearDiagnosticEvents = fingerDiagnostics.clearEvents.bind(fingerDiagnostics);
