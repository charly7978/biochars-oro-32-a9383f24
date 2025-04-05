
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Unified finger detector that centralizes finger detection from multiple sources
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Define valid detection sources
export type DetectionSource = 
  'ppg-extractor' | 
  'signal-quality-amplitude' | 
  'signal-quality-pattern' | 
  'signal-quality-state' | 
  'weak-signal-result' | 
  'rhythm-pattern' | 
  'brightness' | 
  'camera-analysis' |
  'unified-detection';

/**
 * Simple implementation of a unified finger detector
 */
export class UnifiedFingerDetector {
  private detectionSources: Map<DetectionSource, { detected: boolean, confidence: number }> = new Map();
  private isFingerDetected: boolean = false;
  private detectionConfidence: number = 0;
  
  /**
   * Update detection state from a source
   */
  public updateSource(source: DetectionSource, detected: boolean, confidence: number = 1.0): void {
    this.detectionSources.set(source, { detected, confidence });
    this.recalculateDetectionState();
  }
  
  /**
   * Get current detection state
   */
  public getDetectionState(): { isFingerDetected: boolean, confidence: number } {
    return {
      isFingerDetected: this.isFingerDetected,
      confidence: this.detectionConfidence
    };
  }
  
  /**
   * Reset detector state
   */
  public reset(): void {
    this.detectionSources.clear();
    this.isFingerDetected = false;
    this.detectionConfidence = 0;
  }
  
  /**
   * Recalculate the overall detection state
   */
  private recalculateDetectionState(): void {
    if (this.detectionSources.size === 0) {
      this.isFingerDetected = false;
      this.detectionConfidence = 0;
      return;
    }
    
    let detectedCount = 0;
    let totalConfidence = 0;
    
    for (const [_, data] of this.detectionSources) {
      if (data.detected) {
        detectedCount++;
        totalConfidence += data.confidence;
      }
    }
    
    const totalSources = this.detectionSources.size;
    
    // Finger is detected if at least 30% of sources detect it
    this.isFingerDetected = detectedCount >= Math.max(1, Math.floor(totalSources * 0.3));
    
    // Overall confidence is the average of confidence values from positive detections
    this.detectionConfidence = detectedCount > 0 ? totalConfidence / detectedCount : 0;
  }
}

// Create singleton instance
export const unifiedFingerDetector = new UnifiedFingerDetector();

/**
 * Reset the finger detector
 */
export function resetFingerDetector(): void {
  unifiedFingerDetector.reset();
}
