/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de diagnóstico para la detección de dedo
 * Proporciona herramientas avanzadas para monitorear y analizar la detección
 */

import { unifiedFingerDetector } from './unified-finger-detector';

// Interfaz para eventos de diagnóstico
export interface DiagnosticEvent {
  timestamp: number;
  eventType: string;
  source: string;
  isFingerDetected: boolean;
  confidence: number;
  signalValue?: number;
  signalQuality?: number;
  details?: any;
}

// Interfaz para sesión de diagnóstico
export interface DiagnosticSession {
  id: string;
  startTime: number;
  endTime: number | null;
  events: DiagnosticEvent[];
  summary: {
    totalEvents: number;
    detectionChanges: number;
    avgConfidence: number;
    maxConfidence: number;
    minConfidence: number;
    falsePositives: number;
    falseNegatives: number;
  };
}

// Clase para el sistema de diagnóstico
class FingerDetectionDiagnostics {
  private sessions: DiagnosticSession[] = [];
  private currentSession: DiagnosticSession | null = null;
  private isRecording: boolean = false;
  private maxEventsPerSession: number = 1000;
  private maxSessions: number = 5;
  private readonly REPLAY_INTERVAL_MS = 100; // Intervalo para reproducir eventos
  
  constructor() {
    console.log('FingerDetectionDiagnostics: Sistema de diagnóstico inicializado');
  }
  
  /**
   * Inicia una nueva sesión de diagnóstico
   */
  public startSession(sessionId: string = Date.now().toString()): string {
    // Finalizar sesión actual si existe
    if (this.currentSession) {
      this.endSession();
    }
    
    // Crear nueva sesión
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      events: [],
      summary: {
        totalEvents: 0,
        detectionChanges: 0,
        avgConfidence: 0,
        maxConfidence: 0,
        minConfidence: 1, // Iniciar con el máximo valor
        falsePositives: 0,
        falseNegatives: 0
      }
    };
    
    this.isRecording = true;
    console.log(`FingerDetectionDiagnostics: Sesión iniciada (ID: ${sessionId})`);
    
    return sessionId;
  }
  
  /**
   * Finaliza la sesión actual y calcula resumen
   */
  public endSession(): DiagnosticSession | null {
    if (!this.currentSession) {
      console.warn('FingerDetectionDiagnostics: No hay sesión activa para finalizar');
      return null;
    }
    
    this.isRecording = false;
    this.currentSession.endTime = Date.now();
    
    // Calcular resumen
    this.calculateSessionSummary();
    
    // Añadir a lista de sesiones
    this.sessions.push(this.currentSession);
    
    // Mantener límite de sesiones
    if (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }
    
    const completedSession = {...this.currentSession};
    this.currentSession = null;
    
    console.log(`FingerDetectionDiagnostics: Sesión finalizada (ID: ${completedSession.id})`);
    console.log('Resumen:', completedSession.summary);
    
    return completedSession;
  }
  
  /**
   * Registra un evento de diagnóstico
   */
  public logEvent(event: Omit<DiagnosticEvent, 'timestamp'>): void {
    if (!this.isRecording || !this.currentSession) return;
    
    const fullEvent: DiagnosticEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    this.currentSession.events.push(fullEvent);
    
    // Limitar eventos para evitar consumo excesivo de memoria
    if (this.currentSession.events.length > this.maxEventsPerSession) {
      this.currentSession.events.shift();
    }
    
    // Actualizar contador de eventos en el resumen
    this.currentSession.summary.totalEvents++;
    
    // Actualizar min/max confidence
    this.currentSession.summary.maxConfidence = Math.max(
      this.currentSession.summary.maxConfidence, 
      fullEvent.confidence
    );
    
    this.currentSession.summary.minConfidence = Math.min(
      this.currentSession.summary.minConfidence, 
      fullEvent.confidence
    );
  }
  
  /**
   * Registra una transición en el estado de detección
   */
  public logDetectionTransition(
    isDetected: boolean, 
    confidence: number, 
    source: string, 
    details?: any
  ): void {
    if (!this.isRecording || !this.currentSession) return;
    
    // Verificar si es un cambio genuino (evitar registros duplicados)
    const lastEvent = this.currentSession.events[this.currentSession.events.length - 1];
    if (lastEvent && lastEvent.isFingerDetected === isDetected) {
      return;
    }
    
    this.logEvent({
      eventType: isDetected ? 'DETECTION_START' : 'DETECTION_END',
      source,
      isFingerDetected: isDetected,
      confidence,
      details
    });
    
    // Incrementar contador de cambios
    this.currentSession.summary.detectionChanges++;
    
    // Notificar al detector unificado
    console.log("[finger-diagnostics]", {
      eventType: event.eventType,
      source: event.source,
      isFingerDetected: event.isFingerDetected,
      confidence: event.confidence,
      details: event.details
    });
  }
  
  /**
   * Marca un falso positivo (detección incorrecta)
   */
  public markFalsePositive(source: string, details?: any): void {
    if (!this.isRecording || !this.currentSession) return;
    
    this.logEvent({
      eventType: 'FALSE_POSITIVE',
      source,
      isFingerDetected: true,
      confidence: 0,
      details
    });
    
    this.currentSession.summary.falsePositives++;
  }
  
  /**
   * Marca un falso negativo (no detección incorrecta)
   */
  public markFalseNegative(source: string, details?: any): void {
    if (!this.isRecording || !this.currentSession) return;
    
    this.logEvent({
      eventType: 'FALSE_NEGATIVE',
      source,
      isFingerDetected: false,
      confidence: 0,
      details
    });
    
    this.currentSession.summary.falseNegatives++;
  }
  
  /**
   * Calcula el resumen de la sesión actual
   */
  private calculateSessionSummary(): void {
    if (!this.currentSession) return;
    
    // Calcular confianza promedio
    const confSum = this.currentSession.events.reduce(
      (sum, event) => sum + event.confidence, 
      0
    );
    
    this.currentSession.summary.avgConfidence = 
      this.currentSession.events.length > 0 
        ? confSum / this.currentSession.events.length 
        : 0;
  }
  
  /**
   * Guarda la sesión actual en formato JSON para análisis
   */
  public exportSessionData(sessionId?: string): string {
    const session = sessionId 
      ? this.sessions.find(s => s.id === sessionId) || this.currentSession
      : this.currentSession;
    
    if (!session) {
      console.warn('FingerDetectionDiagnostics: No hay sesión para exportar');
      return '{}';
    }
    
    return JSON.stringify(session, null, 2);
  }
  
  /**
   * Obtiene la lista de sesiones disponibles
   */
  public getSessionsList(): Array<{id: string, startTime: number, endTime: number | null}> {
    const list = this.sessions.map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime
    }));
    
    if (this.currentSession) {
      list.push({
        id: this.currentSession.id,
        startTime: this.currentSession.startTime,
        endTime: null
      });
    }
    
    return list;
  }
  
  /**
   * Obtiene la sesión actual o una sesión específica
   */
  public getSession(sessionId?: string): DiagnosticSession | null {
    if (sessionId) {
      return this.sessions.find(s => s.id === sessionId) || 
        (this.currentSession?.id === sessionId ? this.currentSession : null);
    }
    
    return this.currentSession;
  }
  
  /**
   * Reproduce una sesión contra el detector (para recrear condiciones)
   * @param sessionId ID de la sesión a reproducir
   * @param onProgress Callback de progreso
   * @returns Promise que se resuelve cuando termina la reproducción
   */
  public async replaySession(
    sessionId: string,
    onProgress?: (progress: number, event: DiagnosticEvent) => void
  ): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      console.error(`FingerDetectionDiagnostics: Sesión no encontrada: ${sessionId}`);
      return;
    }
    
    console.log(`FingerDetectionDiagnostics: Reproduciendo sesión ${sessionId}`);
    
    // Reiniciar detector
    unifiedFingerDetector.reset();
    
    // Ordenar eventos por timestamp
    const events = [...session.events].sort((a, b) => a.timestamp - b.timestamp);
    
    // Reproducir eventos secuencialmente
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Determinar fuente para el detector unificado
      let detectorSource: any = 'manual-override';
      
      if (event.source.includes('rhythm')) {
        detectorSource = 'rhythm-pattern';
      } else if (event.source.includes('quality')) {
        detectorSource = 'signal-quality-pattern';
      } else if (event.source.includes('camera')) {
        detectorSource = 'camera-analysis';
      } else if (event.source.includes('ppg')) {
        detectorSource = 'ppg-extractor';
      }
      
      // Actualizar detector con el evento
      unifiedFingerDetector.updateSource(
        detectorSource,
        event.isFingerDetected,
        event.confidence
      );
      
      // Notificar progreso
      if (onProgress) {
        onProgress(i / events.length, event);
      }
      
      // Esperar intervalo para simular flujo de tiempo
      await new Promise(resolve => setTimeout(resolve, this.REPLAY_INTERVAL_MS));
    }
    
    console.log(`FingerDetectionDiagnostics: Reproducción finalizada (${events.length} eventos)`);
  }
  
  /**
   * Obtiene el estado de diagnóstico actual
   */
  public getDiagnosticsState(): {
    isRecording: boolean;
    currentSessionId: string | null;
    totalSessions: number;
    currentSessionEvents: number;
  } {
    return {
      isRecording: this.isRecording,
      currentSessionId: this.currentSession?.id || null,
      totalSessions: this.sessions.length,
      currentSessionEvents: this.currentSession?.events.length || 0
    };
  }
  
  /**
   * Establece la configuración para los diagnósticos
   */
  public configure(options: {
    maxEventsPerSession?: number;
    maxSessions?: number;
  }): void {
    if (options.maxEventsPerSession !== undefined) {
      this.maxEventsPerSession = options.maxEventsPerSession;
    }
    
    if (options.maxSessions !== undefined) {
      this.maxSessions = options.maxSessions;
    }
    
    console.log('FingerDetectionDiagnostics: Configuración actualizada', {
      maxEventsPerSession: this.maxEventsPerSession,
      maxSessions: this.maxSessions
    });
  }
}

// Instancia única para toda la aplicación
export const fingerDiagnostics = new FingerDetectionDiagnostics();

// Funciones de ayuda para facilitar el uso
export const startDiagnosticsSession = (sessionId?: string) => 
  fingerDiagnostics.startSession(sessionId);

export const endDiagnosticsSession = () => 
  fingerDiagnostics.endSession();

export const logFingerDetection = (
  isDetected: boolean, 
  confidence: number, 
  source: string, 
  details?: any
) => fingerDiagnostics.logDetectionTransition(isDetected, confidence, source, details);

export const getFingerDiagnostics = () => 
  fingerDiagnostics.getDiagnosticsState();

export const exportDiagnosticsData = (sessionId?: string) => 
  fingerDiagnostics.exportSessionData(sessionId);
