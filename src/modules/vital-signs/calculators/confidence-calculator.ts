
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
    lipidsConfidence: number,
    hydrationConfidence: number = 0
  ): number {
    // Include hydration in confidence calculation if provided
    if (hydrationConfidence > 0) {
      return Math.min(
        0.95,
        (glucoseConfidence * 0.4) + (lipidsConfidence * 0.3) + (hydrationConfidence * 0.3)
      );
    }
    
    // Original calculation without hydration
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
