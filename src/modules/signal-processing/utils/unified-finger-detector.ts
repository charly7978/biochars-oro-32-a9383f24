
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

// Detection state interface
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
}

/**
 * Simple implementation of a unified finger detector
 */
export class UnifiedFingerDetector {
  private detectionSources: Map<DetectionSource, { detected: boolean, confidence: number }> = new Map();
  private isFingerDetected: boolean = false;
  private detectionConfidence: number = 0;
  private amplitudeThreshold: number = 0.05;
  private falsePositiveReductionFactor: number = 0.3;
  private falseNegativeReductionFactor: number = 0.7;
  private sensitivityFactor: number = 1.0;
  private adaptationRate: number = 0.1;
  
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
  public getDetectionState(): DetectionState {
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

  /**
   * Adapt thresholds based on signal quality and brightness
   */
  public adaptThresholds(signalQuality: number, brightness?: number): void {
    const qualityFactor = signalQuality / 100; // normalize to 0-1
    
    // Adjust sensitivity based on signal quality
    if (brightness !== undefined) {
      // Use brightness to further adjust sensitivity
      const brightnessFactor = Math.min(1, Math.max(0.1, brightness / 255));
      this.sensitivityFactor = Math.max(0.5, Math.min(1.5, qualityFactor * brightnessFactor * 2));
    } else {
      // Just use signal quality
      this.sensitivityFactor = Math.max(0.5, Math.min(1.5, qualityFactor * 1.5));
    }
  }

  /**
   * Set detection sensitivity
   */
  public setSensitivity(sensitivity: number): void {
    this.sensitivityFactor = Math.max(0.1, Math.min(2.0, sensitivity));
  }

  /**
   * Set adaptation rate
   */
  public setAdaptationRate(rate: number): void {
    this.adaptationRate = Math.max(0.01, Math.min(1.0, rate));
  }

  /**
   * Set amplitude threshold
   */
  public setAmplitudeThreshold(threshold: number): void {
    this.amplitudeThreshold = Math.max(0.01, Math.min(0.5, threshold));
  }

  /**
   * Set false positive reduction factor
   */
  public setFalsePositiveReduction(factor: number): void {
    this.falsePositiveReductionFactor = Math.max(0.1, Math.min(0.9, factor));
  }

  /**
   * Set false negative reduction factor
   */
  public setFalseNegativeReduction(factor: number): void {
    this.falseNegativeReductionFactor = Math.max(0.1, Math.min(0.9, factor));
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
