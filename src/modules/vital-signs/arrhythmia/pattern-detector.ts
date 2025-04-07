
/**
 * Pattern detector for arrhythmia detection
 */

const MAX_PATTERN_BUFFER = 30;

export class ArrhythmiaPatternDetector {
  private patternBuffer: number[] = [];
  
  /**
   * Update the pattern buffer with a new variation value
   */
  public updatePatternBuffer(variation: number): void {
    this.patternBuffer.push(variation);
    
    if (this.patternBuffer.length > MAX_PATTERN_BUFFER) {
      this.patternBuffer.shift();
    }
  }
  
  /**
   * Detect arrhythmia patterns in the buffer
   * Returns true if an arrhythmia pattern is detected
   */
  public detectArrhythmiaPattern(): boolean {
    if (this.patternBuffer.length < 10) {
      return false;
    }
    
    // Basic pattern detection: look for high variation followed by consistent pattern
    const highVariationThreshold = 0.15;
    const highVariationCount = this.patternBuffer.filter(v => v > highVariationThreshold).length;
    
    // If we have at least 2 high variations in our pattern buffer
    if (highVariationCount >= 2) {
      // Calculate average peak spacing
      const indices: number[] = [];
      this.patternBuffer.forEach((variation, index) => {
        if (variation > highVariationThreshold) {
          indices.push(index);
        }
      });
      
      // Check if indices have consistent spacing (arrhythmia pattern)
      if (indices.length >= 2) {
        const diffs = [];
        for (let i = 1; i < indices.length; i++) {
          diffs.push(indices[i] - indices[i-1]);
        }
        
        // Calculate variance of diffs
        const mean = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
        const variance = diffs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / diffs.length;
        
        // Low variance indicates consistent pattern
        return variance < 5;
      }
    }
    
    return false;
  }
  
  /**
   * Reset the pattern buffer
   */
  public resetPatternBuffer(): void {
    this.patternBuffer = [];
  }
}
