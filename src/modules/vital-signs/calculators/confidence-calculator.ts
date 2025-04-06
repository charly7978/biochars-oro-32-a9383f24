
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculator for confidence levels in vital measurements
 */
export class ConfidenceCalculator {
  private readonly confidenceThreshold: number;
  
  /**
   * Create a new confidence calculator
   * @param confidenceThreshold Minimum confidence level to consider a measurement valid (0-1)
   */
  constructor(confidenceThreshold: number = 0.5) {
    this.confidenceThreshold = Math.max(0, Math.min(1, confidenceThreshold));
  }
  
  /**
   * Calculate overall confidence from individual measurements
   */
  public calculateOverallConfidence(
    glucoseConfidence: number,
    lipidsConfidence: number,
    hydrationConfidence: number
  ): number {
    // Calculate weighted average of individual confidences
    const weights = {
      glucose: 0.4,
      lipids: 0.3,
      hydration: 0.3
    };
    
    const weightedConfidence = 
      glucoseConfidence * weights.glucose +
      lipidsConfidence * weights.lipids +
      hydrationConfidence * weights.hydration;
    
    // Return normalized confidence (0-1)
    return Math.max(0, Math.min(1, weightedConfidence));
  }
  
  /**
   * Check if confidence meets the threshold
   */
  public meetsThreshold(confidence: number): boolean {
    return confidence >= this.confidenceThreshold;
  }
  
  /**
   * Get the current confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
