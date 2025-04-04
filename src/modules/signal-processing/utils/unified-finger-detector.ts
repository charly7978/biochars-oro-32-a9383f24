
/**
 * Sistema unificado de detección de dedo
 * Combina múltiples fuentes de información para determinar si hay un dedo presente
 */

export type DetectionSource = 'camera' | 'brightness' | 'ppg' | 'signal-quality' | 'camera-analysis' | 'environment' | 'user-interaction';

interface SourceEntry {
  isDetected: boolean;
  confidence: number;
  lastUpdated: number;
}

interface DiagnosticData {
  status: string;
  eventsCount: number;
  detectionEvents: number;
  errorEvents: number;
}

/**
 * Detector unificado que combina varias fuentes para determinar 
 * si hay un dedo presente con alta confianza
 */
class UnifiedFingerDetector {
  private sources: Map<DetectionSource, SourceEntry> = new Map();
  private consensusThreshold: number = 0.55;
  private lastConsensusUpdate: number = 0;
  private diagnostics: DiagnosticData = {
    status: 'idle',
    eventsCount: 0,
    detectionEvents: 0,
    errorEvents: 0
  };
  
  constructor() {
    // Inicializar fuentes predeterminadas
    this.sources.set('camera', { isDetected: false, confidence: 0, lastUpdated: 0 });
    this.sources.set('brightness', { isDetected: false, confidence: 0, lastUpdated: 0 });
    this.sources.set('ppg', { isDetected: false, confidence: 0, lastUpdated: 0 });
    this.sources.set('signal-quality', { isDetected: false, confidence: 0, lastUpdated: 0 });
  }
  
  /**
   * Actualiza el estado de una fuente de detección
   */
  public updateSource(source: DetectionSource, isDetected: boolean, confidence: number = 0.5): void {
    this.sources.set(source, {
      isDetected,
      confidence: Math.max(0, Math.min(1, confidence)), // Asegurar rango 0-1
      lastUpdated: Date.now()
    });
    
    this.lastConsensusUpdate = Date.now();
    
    // Actualizar diagnósticos
    this.diagnostics.eventsCount++;
    if (isDetected) {
      this.diagnostics.detectionEvents++;
    }
    
    this.diagnostics.status = 'active';
  }
  
  /**
   * Obtiene el estado consolidado actual
   */
  public getState(): { isFingerDetected: boolean; confidence: number; detectionSource: string; lastUpdated: number } {
    let totalConfidence = 0;
    let positiveConfidence = 0;
    let primarySource: DetectionSource | null = null;
    let maxConfidence = 0;
    let recentSources = 0;
    const now = Date.now();
    
    // Considerar solo fuentes actualizadas en los últimos 3 segundos
    this.sources.forEach((entry, source) => {
      if (now - entry.lastUpdated < 3000) {
        recentSources++;
        const weight = entry.confidence;
        totalConfidence += weight;
        
        if (entry.isDetected) {
          positiveConfidence += weight;
          
          // Determinar fuente principal
          if (weight > maxConfidence) {
            maxConfidence = weight;
            primarySource = source;
          }
        }
      }
    });
    
    // Calcular confianza combinada
    const combinedConfidence = totalConfidence > 0 
      ? positiveConfidence / totalConfidence 
      : 0;
    
    // Determinar resultado final
    const isFingerDetected = combinedConfidence >= this.consensusThreshold && recentSources >= 2;
    
    return {
      isFingerDetected,
      confidence: combinedConfidence,
      detectionSource: primarySource || 'none',
      lastUpdated: this.lastConsensusUpdate
    };
  }
  
  /**
   * Obtiene más detalles sobre el estado de detección actual
   */
  public getDetailedStats(): { 
    isFingerDetected: boolean; 
    confidence: number;
    consensusLevel: number;
    sourceStates: Record<string, { detected: boolean; confidence: number; age: number }>;
    diagnostics: DiagnosticData;
    primarySource: string | null;
  } {
    const state = this.getState();
    const now = Date.now();
    const sourceStates: Record<string, { detected: boolean; confidence: number; age: number }> = {};
    let primarySource: DetectionSource | null = null;
    let maxConfidence = 0;
    
    this.sources.forEach((entry, source) => {
      sourceStates[source] = {
        detected: entry.isDetected,
        confidence: entry.confidence,
        age: Math.round((now - entry.lastUpdated) / 1000) // Edad en segundos
      };
      
      if (entry.isDetected && entry.confidence > maxConfidence && now - entry.lastUpdated < 3000) {
        maxConfidence = entry.confidence;
        primarySource = source;
      }
    });
    
    return {
      isFingerDetected: state.isFingerDetected,
      confidence: state.confidence,
      consensusLevel: this.consensusThreshold,
      sourceStates,
      diagnostics: { ...this.diagnostics },
      primarySource: primarySource
    };
  }
  
  /**
   * Obtiene la sesión de diagnóstico actual
   */
  public getDiagnosticSession(): DiagnosticData {
    return { ...this.diagnostics };
  }
  
  /**
   * Exporta datos de análisis para diagnóstico 
   */
  public exportAnalysisData(): { 
    timestamp: number; 
    state: ReturnType<typeof this.getState>; 
    detailedStats: ReturnType<typeof this.getDetailedStats>;
  } {
    return {
      timestamp: Date.now(),
      state: this.getState(),
      detailedStats: this.getDetailedStats()
    };
  }
}

// Singleton para uso en toda la aplicación
export const unifiedFingerDetector = new UnifiedFingerDetector();

// Exportación predeterminada para facilitar la importación
export default unifiedFingerDetector;
