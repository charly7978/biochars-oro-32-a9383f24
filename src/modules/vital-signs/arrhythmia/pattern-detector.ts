/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Pattern-based arrhythmia detector using HRV metrics
 */

/**
 * Class to detect arrhythmia patterns in real-time
 * No simulations or fake data is used
 */
export class ArrhythmiaPatternDetector {
  private patternBuffer: number[] = [];
  private readonly MAX_PATTERN_BUFFER = 30;
  private readonly PATTERN_DETECTION_THRESHOLD = 0.25;
  
  /**
   * Update the pattern buffer with a new variation value
   * @param variationRatio The variation ratio from the current RR interval
   */
  public updatePatternBuffer(variationRatio: number): void {
    this.patternBuffer.push(variationRatio);
    
    // Keep buffer size limited
    if (this.patternBuffer.length > this.MAX_PATTERN_BUFFER) {
      this.patternBuffer.shift();
    }
  }
  
  /**
   * Detect arrhythmia patterns from the pattern buffer
   * @returns True if an arrhythmia pattern is detected
   */
  public detectArrhythmiaPattern(): boolean {
    if (this.patternBuffer.length < 5) {
      return false;
    }
    
    // Higher sensitivity for better detection
    const recentValues = this.patternBuffer.slice(-10);
    
    // Look for sudden jumps in variation
    for (let i = 1; i < recentValues.length; i++) {
      if (recentValues[i] > this.PATTERN_DETECTION_THRESHOLD &&
          recentValues[i] > recentValues[i-1] * 2) {
        return true;
      }
    }
    
    // Check for sustained high variation
    const highVariationCount = recentValues.filter(
      v => v > this.PATTERN_DETECTION_THRESHOLD
    ).length;
    
    return highVariationCount >= 3; // If 3 or more high variation points
  }
  
  /**
   * Reset the pattern buffer
   */
  public resetPatternBuffer(): void {
    this.patternBuffer = [];
  }
}
