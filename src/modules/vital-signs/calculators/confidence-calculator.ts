
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculator for confidence levels in vital signs measurements
 */
export class ConfidenceCalculator {
  private confidenceThreshold: number;
  
  /**
   * Create a new confidence calculator
   * @param threshold Minimum threshold for confidence to be considered reliable
   */
  constructor(threshold: number) {
    this.confidenceThreshold = threshold;
  }
  
  /**
   * Calculate overall confidence based on individual measurements
   */
  public calculateOverallConfidence(
    glucoseConfidence: number,
    lipidsConfidence: number,
    hydrationConfidence: number
  ): number {
    // Weight the different confidence values
    const weights = {
      glucose: 0.3,
      lipids: 0.3,
      hydration: 0.4
    };
    
    // Calculate weighted average
    const overallConfidence = (
      (glucoseConfidence * weights.glucose) +
      (lipidsConfidence * weights.lipids) +
      (hydrationConfidence * weights.hydration)
    );
    
    return Math.min(overallConfidence, 1);
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
  
  /**
   * Set confidence threshold
   */
  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }
}
