
/**
 * Sistema de diagnóstico para detección de dedos
 * Provee telemetría y análisis para mejorar la detección
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';

export type DiagnosticEvent = {
  eventType: 'DETECTION_QUALITY' | 'PROCESSING_ERROR' | 'INTEGRATION_ERROR' | 'USER_FEEDBACK';
  source: string;
  isFingerDetected: boolean;
  confidence: number;
  signalQuality?: number;
  details?: any;
  timestamp?: number;
};

class FingerDiagnostics {
  private sessionId: string | null = null;
  private events: DiagnosticEvent[] = [];
  private maxEvents: number = 1000;
  private isEnabled: boolean = true;
  
  /**
   * Inicia una nueva sesión de diagnóstico
   */
  public startSession(id: string): void {
    this.sessionId = id;
    this.events = [];
    
    logError(
      `Finger diagnostics session started: ${id}`, 
      ErrorLevel.INFO, 
      'FingerDiagnostics'
    );
  }
  
  /**
   * Finaliza la sesión actual
   */
  public endSession(): void {
    if (this.sessionId) {
      logError(
        `Finger diagnostics session ended: ${this.sessionId} (${this.events.length} events)`, 
        ErrorLevel.INFO, 
        'FingerDiagnostics'
      );
      
      this.sessionId = null;
    }
  }
  
  /**
   * Registra un evento de diagnóstico
   */
  public logEvent(event: DiagnosticEvent): void {
    if (!this.isEnabled) return;
    
    const fullEvent: DiagnosticEvent = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };
    
    this.events.push(fullEvent);
    
    // Limitar tamaño del buffer
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Log eventos importantes
    if (event.eventType === 'PROCESSING_ERROR' || event.eventType === 'INTEGRATION_ERROR') {
      logError(
        `Finger diagnostic error: ${event.source} - ${event.details?.errorMessage || 'Unknown error'}`, 
        ErrorLevel.ERROR, 
        'FingerDiagnostics',
        event.details
      );
    }
  }
  
  /**
   * Habilita o deshabilita el sistema
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logError(
      `Finger diagnostics ${enabled ? 'enabled' : 'disabled'}`, 
      ErrorLevel.INFO, 
      'FingerDiagnostics'
    );
  }
  
  /**
   * Obtiene todos los eventos de la sesión actual
   */
  public getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }
  
  /**
   * Obtiene un resumen de la sesión actual
   */
  public getSessionSummary(): {
    sessionId: string | null;
    eventCount: number;
    errorCount: number;
    detectionStats: {
      detected: number;
      notDetected: number;
      averageConfidence: number;
    };
  } {
    const errors = this.events.filter(
      e => e.eventType === 'PROCESSING_ERROR' || e.eventType === 'INTEGRATION_ERROR'
    );
    
    const detectionEvents = this.events.filter(e => e.eventType === 'DETECTION_QUALITY');
    const detectedCount = detectionEvents.filter(e => e.isFingerDetected).length;
    const notDetectedCount = detectionEvents.length - detectedCount;
    
    const confidenceSum = detectionEvents.reduce((sum, event) => sum + event.confidence, 0);
    const averageConfidence = detectionEvents.length > 0 
      ? confidenceSum / detectionEvents.length 
      : 0;
    
    return {
      sessionId: this.sessionId,
      eventCount: this.events.length,
      errorCount: errors.length,
      detectionStats: {
        detected: detectedCount,
        notDetected: notDetectedCount,
        averageConfidence: averageConfidence
      }
    };
  }
}

// Singleton para compartir en toda la aplicación
export const fingerDiagnostics = new FingerDiagnostics();
