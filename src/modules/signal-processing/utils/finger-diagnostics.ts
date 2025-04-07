
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Diagnostic tools for finger detection
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { DetectionSource } from './unified-finger-detector';

// Finger detection event interface
export interface FingerDetectionEvent extends Event {
  eventType: string;
  source: DetectionSource;
  isFingerDetected: boolean;
  confidence: number;
  details?: any;
}

// Create a custom event for finger detection events
export class FingerDetectedEvent extends Event implements FingerDetectionEvent {
  eventType: string;
  source: DetectionSource;
  isFingerDetected: boolean;
  confidence: number;
  details?: any;
  
  constructor(
    source: DetectionSource, 
    isFingerDetected: boolean,
    confidence: number,
    details?: any
  ) {
    super('fingerDetection');
    this.eventType = 'fingerDetection';
    this.source = source;
    this.isFingerDetected = isFingerDetected;
    this.confidence = confidence;
    this.details = details;
  }
}

// Singleton for event listening
export class FingerDiagnosticsManager {
  private static instance: FingerDiagnosticsManager;
  private eventTarget: EventTarget = new EventTarget();
  private detectionEvents: FingerDetectionEvent[] = [];
  private maxEvents: number = 100;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): FingerDiagnosticsManager {
    if (!FingerDiagnosticsManager.instance) {
      FingerDiagnosticsManager.instance = new FingerDiagnosticsManager();
    }
    return FingerDiagnosticsManager.instance;
  }
  
  public addEventListener(
    callback: (event: FingerDetectionEvent) => void
  ): () => void {
    const wrappedCallback = (event: Event) => {
      const fingerEvent = event as FingerDetectionEvent;
      callback(fingerEvent);
    };
    
    this.eventTarget.addEventListener('fingerDetection', wrappedCallback);
    
    return () => {
      this.eventTarget.removeEventListener('fingerDetection', wrappedCallback);
    };
  }
  
  public dispatchEvent(
    source: DetectionSource, 
    isFingerDetected: boolean,
    confidence: number,
    details?: any
  ): void {
    const event = new FingerDetectedEvent(
      source,
      isFingerDetected,
      confidence,
      details
    );
    
    this.eventTarget.dispatchEvent(event);
    
    // Also store for history
    this.detectionEvents.push(event);
    if (this.detectionEvents.length > this.maxEvents) {
      this.detectionEvents.shift();
    }
    
    // Log to console for debugging
    if (isFingerDetected) {
      logError(
        `Finger detected by ${source} with confidence ${confidence.toFixed(2)}`,
        ErrorLevel.INFO,
        'FingerDetection',
        details
      );
    }
  }
  
  public getDetectionHistory(): FingerDetectionEvent[] {
    return [...this.detectionEvents];
  }
  
  public clearHistory(): void {
    this.detectionEvents = [];
  }
  
  public getDetectionStats(): {
    totalEvents: number;
    detectedCount: number;
    sourceBreakdown: Record<string, { total: number; detected: number }>;
    averageConfidence: number;
  } {
    const stats = {
      totalEvents: this.detectionEvents.length,
      detectedCount: 0,
      sourceBreakdown: {} as Record<string, { total: number; detected: number }>,
      averageConfidence: 0
    };
    
    let totalConfidence = 0;
    
    this.detectionEvents.forEach((event) => {
      if (event.isFingerDetected) {
        stats.detectedCount++;
      }
      
      totalConfidence += event.confidence;
      
      // Update source breakdown
      if (!stats.sourceBreakdown[event.source]) {
        stats.sourceBreakdown[event.source] = { total: 0, detected: 0 };
      }
      
      stats.sourceBreakdown[event.source].total++;
      if (event.isFingerDetected) {
        stats.sourceBreakdown[event.source].detected++;
      }
    });
    
    if (stats.totalEvents > 0) {
      stats.averageConfidence = totalConfidence / stats.totalEvents;
    }
    
    return stats;
  }
}

// Helper function to get the diagnostics manager
export function getFingerDiagnosticsManager(): FingerDiagnosticsManager {
  return FingerDiagnosticsManager.getInstance();
}

// Helper function to report a finger detection event
export function reportFingerDetection(
  source: DetectionSource, 
  isFingerDetected: boolean,
  confidence: number,
  details?: any
): void {
  const manager = getFingerDiagnosticsManager();
  manager.dispatchEvent(source, isFingerDetected, confidence, details);
}

// Helper function to add a detection listener
export function addFingerDetectionListener(
  callback: (event: FingerDetectionEvent) => void
): () => void {
  const manager = getFingerDiagnosticsManager();
  return manager.addEventListener(callback);
}
