
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calculator for confidence levels in vital signs measurements
 * Using only direct measurement methods
 */
export class ConfidenceCalculator {
  private confidenceThreshold: number;
  
  /**
   * Create new instance with specified threshold
   */
  constructor(confidenceThreshold: number = 0.6) {
    this.confidenceThreshold = confidenceThreshold;
  }
  
  /**
   * Calculate overall confidence level based on individual measurements
   */
  public calculateOverallConfidence(
    glucoseConfidence: number, 
    lipidsConfidence: number,
    hydrationConfidence: number
  ): number {
    // Weights for different confidence measures
    const w1 = 0.33; // Glucose
    const w2 = 0.33; // Lipids
    const w3 = 0.34; // Hydration
    
    // Weighted average
    return (glucoseConfidence * w1) + (lipidsConfidence * w2) + (hydrationConfidence * w3);
  }
  
  /**
   * Check if confidence level meets threshold
   */
  public meetsThreshold(confidence: number): boolean {
    return confidence >= this.confidenceThreshold * 100;
  }
  
  /**
   * Get the configured confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
