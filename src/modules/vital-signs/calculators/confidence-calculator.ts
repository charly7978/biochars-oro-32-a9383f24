
/**
 * Calculates overall confidence for vital signs measurements
 */

export class ConfidenceCalculator {
  private confidenceThreshold: number;
  
  constructor(threshold: number = 0.4) {
    this.confidenceThreshold = threshold;
  }
  
  /**
   * Calculate overall confidence from individual metrics
   */
  public calculateOverallConfidence(
    glucoseConfidence: number,
    lipidsConfidence: number
  ): number {
    // Weighted average of confidence values
    return Math.min(
      0.95,
      (glucoseConfidence * 0.5) + (lipidsConfidence * 0.5)
    );
  }
  
  /**
   * Check if confidence meets threshold
   */
  public meetsThreshold(confidence: number): boolean {
    return confidence >= this.confidenceThreshold;
  }
  
  /**
   * Get current confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
