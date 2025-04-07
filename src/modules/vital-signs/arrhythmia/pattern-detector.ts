
/**
 * Arrhythmia pattern detector
 * Detects patterns in heart rhythm that might indicate arrhythmias
 */
export class ArrhythmiaPatternDetector {
  private patternBuffer: number[] = [];
  private readonly BUFFER_SIZE = 10; 
  private readonly PATTERN_THRESHOLD = 0.15; // Lower threshold for sensitivity
  
  /**
   * Update the pattern buffer with new variation value
   */
  public updatePatternBuffer(variation: number): void {
    this.patternBuffer.push(variation);
    if (this.patternBuffer.length > this.BUFFER_SIZE) {
      this.patternBuffer.shift();
    }
  }
  
  /**
   * Detect arrhythmia patterns in the buffer
   */
  public detectArrhythmiaPattern(): boolean {
    if (this.patternBuffer.length < 5) return false;
    
    // Calculate average variation
    const avgVariation = this.patternBuffer.reduce((sum, val) => sum + val, 0) / 
                         this.patternBuffer.length;
    
    // Check for specific pattern types
    return this.detectSuddenChanges() || 
           this.detectCouplets() || 
           avgVariation > this.PATTERN_THRESHOLD;
  }
  
  /**
   * Detect sudden changes in heart rhythm
   */
  private detectSuddenChanges(): boolean {
    for (let i = 1; i < this.patternBuffer.length; i++) {
      if (Math.abs(this.patternBuffer[i] - this.patternBuffer[i-1]) > 0.2) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Detect couplets (pairs of abnormal beats)
   */
  private detectCouplets(): boolean {
    let abnormalCount = 0;
    for (let i = 0; i < this.patternBuffer.length; i++) {
      if (this.patternBuffer[i] > 0.2) {
        abnormalCount++;
        if (abnormalCount >= 2) return true;
      } else {
        abnormalCount = 0;
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
