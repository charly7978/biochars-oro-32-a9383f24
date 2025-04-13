/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { ArrhythmiaPatternType } from './types';

/**
 * Detector for arrhythmia patterns in cardiac signals
 */
export class ArrhythmiaPatternDetector {
  private patternBuffer: number[] = [];
  private readonly BUFFER_SIZE = 20;
  private readonly PATTERN_THRESHOLD = 0.3;
  private readonly MIN_VARIATIONS_COUNT = 2;
  
  /**
   * Update pattern buffer with new variation value
   */
  public updatePatternBuffer(variation: number): void {
    this.patternBuffer.push(variation);
    
    // Keep buffer at defined size
    if (this.patternBuffer.length > this.BUFFER_SIZE) {
      this.patternBuffer.shift();
    }
  }
  
  /**
   * Reset the pattern buffer
   */
  public resetPatternBuffer(): void {
    this.patternBuffer = [];
  }
  
  /**
   * Detect if current pattern indicates arrhythmia
   */
  public detectArrhythmiaPattern(): boolean {
    if (this.patternBuffer.length < 5) {
      return false;
    }
    
    // Count significant variations
    const significantVariations = this.patternBuffer.filter(
      variation => variation > this.PATTERN_THRESHOLD
    ).length;
    
    // Detect pattern if we have enough significant variations
    return significantVariations >= this.MIN_VARIATIONS_COUNT;
  }
  
  /**
   * Get the type of pattern detected
   */
  public getPatternType(): ArrhythmiaPatternType {
    if (!this.detectArrhythmiaPattern()) {
      return ArrhythmiaPatternType.NORMAL;
    }
    
    // Get recent variations for analysis
    const recentVariations = this.patternBuffer.slice(-5);
    
    // Calculate average variation
    const avgVariation = recentVariations.reduce((sum, val) => sum + val, 0) / 
                         recentVariations.length;
    
    // Detect specific patterns based on variation characteristics
    if (avgVariation > 0.5) {
      return ArrhythmiaPatternType.IRREGULAR_RHYTHM;
    } else if (this.detectPrematureBeatPattern()) {
      return ArrhythmiaPatternType.PREMATURE_BEAT;
    } else if (this.detectMissedBeatPattern()) {
      return ArrhythmiaPatternType.MISSED_BEAT;
    }
    
    return ArrhythmiaPatternType.NORMAL;
  }
  
  /**
   * Detect premature beat pattern
   */
  private detectPrematureBeatPattern(): boolean {
    if (this.patternBuffer.length < 5) {
      return false;
    }
    
    // Premature beat pattern often shows as short interval followed by compensatory pause
    const variations = this.patternBuffer.slice(-5);
    
    for (let i = 1; i < variations.length; i++) {
      // Detection of short-long pattern
      if (variations[i-1] < -0.2 && variations[i] > 0.2) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Detect missed beat pattern
   */
  private detectMissedBeatPattern(): boolean {
    if (this.patternBuffer.length < 5) {
      return false;
    }
    
    // Missed beat pattern shows as a single very long interval
    const variations = this.patternBuffer.slice(-5);
    
    // Check for any significantly long interval
    return variations.some(variation => variation > 0.8);
  }
}
