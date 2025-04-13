
/**
 * Enhanced confidence calculator for vital signs measurements with hydration support
 */

export class ConfidenceCalculator {
  private confidenceThreshold: number;
  
  constructor(threshold: number = 0.4) {
    this.confidenceThreshold = threshold;
  }
  
  /**
   * Calculate overall confidence from individual metrics
   * @param glucoseConfidence Confidence level for glucose measurement
   * @param lipidsConfidence Confidence level for lipids measurement
   * @param hydrationConfidence Confidence level for hydration measurement
   * @returns Overall confidence value (0-1)
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
   * @param confidence Confidence value to check
   * @returns Boolean indicating if threshold is met
   */
  public meetsThreshold(confidence: number): boolean {
    return confidence >= this.confidenceThreshold;
  }
  
  /**
   * Get current confidence threshold
   * @returns Current threshold value
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
  
  /**
   * Set new confidence threshold
   * @param threshold New threshold value (0-1)
   */
  public setConfidenceThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
    }
  }
}
