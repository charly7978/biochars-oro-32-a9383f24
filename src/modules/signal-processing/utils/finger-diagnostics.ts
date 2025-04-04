
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Diagnósticos de detección de dedos
 * Sistema para registrar y analizar eventos de detección
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { DetectionSource } from './unified-finger-detector';

export type DiagnosticEventType = 
  'PATTERN_DETECTED' | 
  'PATTERN_LOST' | 
  'LOW_AMPLITUDE' | 
  'PATTERN_TIMEOUT' | 
  'DETECTOR_RESET' | 
  'FINGER_DETECTED' | 
  'FINGER_LOST';

export interface DiagnosticEvent {
  eventType: DiagnosticEventType;
  source: DetectionSource;
  isFingerDetected: boolean;
  confidence: number;
  timestamp?: number;
  signalValue?: number;
  details?: Record<string, any>;
}

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

// Singleton instance
export const fingerDiagnostics = new FingerDiagnostics();

/**
 * Reporta detección de dedo (equivalente a logFingerDetection mencionado en el error)
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
