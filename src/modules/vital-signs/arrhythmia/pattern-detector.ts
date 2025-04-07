
/**
 * Arrhythmia pattern detection
 * Analyzes RR interval patterns for arrhythmia recognition
 */
import { PatternDetectionResult } from './types';

export class ArrhythmiaPatternDetector {
  private patternBuffer: number[] = [];
  private readonly PATTERN_BUFFER_SIZE = 15;

  /**
   * Update the pattern buffer with new variation ratio
   */
  updatePatternBuffer(variationRatio: number): void {
    this.patternBuffer.push(variationRatio);
    if (this.patternBuffer.length > this.PATTERN_BUFFER_SIZE) {
      this.patternBuffer.shift();
    }
  }
  
  /**
   * Detect arrhythmia patterns in the buffer
   */
  detectArrhythmiaPattern(): boolean {
    if (this.patternBuffer.length < 10) {
      return false;
    }
    
    // Look for specific arrhythmia patterns
    return this.detectPrematureBeats() || 
           this.detectRhythmChanges() || 
           this.detectIrregularIntervals();
  }
  
  /**
   * Detect premature beats
   */
  private detectPrematureBeats(): boolean {
    if (this.patternBuffer.length < 5) return false;
    
    // Premature beats show as sudden large variations followed by compensatory pause
    let hasPattern = false;
    
    for (let i = 1; i < this.patternBuffer.length - 1; i++) {
      // Look for a spike followed by another variation
      if (this.patternBuffer[i] > 0.3 && this.patternBuffer[i+1] > 0.15) {
        hasPattern = true;
        break;
      }
    }
    
    return hasPattern;
  }
  
  /**
   * Detect rhythm changes
   */
  private detectRhythmChanges(): boolean {
    if (this.patternBuffer.length < 10) return false;
    
    // Divide buffer in half and compare average variations
    const firstHalf = this.patternBuffer.slice(0, Math.floor(this.patternBuffer.length / 2));
    const secondHalf = this.patternBuffer.slice(Math.floor(this.patternBuffer.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    // Significant change in pattern?
    return Math.abs(secondAvg - firstAvg) > 0.1;
  }
  
  /**
   * Detect irregular intervals
   */
  private detectIrregularIntervals(): boolean {
    if (this.patternBuffer.length < 8) return false;
    
    // Count how many variations are above threshold
    const highVariations = this.patternBuffer.filter(v => v > 0.15).length;
    
    // If more than 30% of recent variations are high, it's likely an arrhythmia
    return highVariations > this.patternBuffer.length * 0.3;
  }
  
  /**
   * Get detailed pattern analysis
   */
  getDetailedAnalysis(): PatternDetectionResult {
    const isArrhythmia = this.detectArrhythmiaPattern();
    
    let pattern = null;
    let confidence = 0;
    
    if (this.detectPrematureBeats()) {
      pattern = "Premature Beat Pattern";
      confidence = 0.7;
    } else if (this.detectRhythmChanges()) {
      pattern = "Rhythm Change Pattern";
      confidence = 0.6;
    } else if (this.detectIrregularIntervals()) {
      pattern = "Irregular Interval Pattern";
      confidence = 0.5;
    }
    
    return {
      isArrhythmia,
      confidence,
      pattern
    };
  }
  
  /**
   * Reset pattern buffer
   */
  resetPatternBuffer(): void {
    this.patternBuffer = [];
  }
}
