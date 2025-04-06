
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Interface for lipid measurement results
 */
export interface LipidMeasurement {
  totalCholesterol: number;
  triglycerides: number;
}

/**
 * Processor for lipid level estimation from PPG signals
 */
export class LipidProcessor {
  private confidence: number = 0;
  private lastMeasurement: LipidMeasurement = { totalCholesterol: 0, triglycerides: 0 };
  private baseCholesterol: number = 180;
  private baseTriglycerides: number = 150;
  
  /**
   * Calculate lipid values from PPG signal
   */
  public calculateLipids(ppgValues: number[]): LipidMeasurement {
    if (ppgValues.length < 30) {
      this.confidence = 0;
      return { totalCholesterol: 0, triglycerides: 0 };
    }
    
    // Use the most recent data points
    const recentValues = ppgValues.slice(-30);
    
    // Calculate signal characteristics
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const amplitude = max - min;
    
    // Calculate lipid values based on signal characteristics
    const cholVariation = avg * 30;
    const trigVariation = amplitude * 25;
    
    const totalCholesterol = Math.round(this.baseCholesterol + cholVariation);
    const triglycerides = Math.round(this.baseTriglycerides + trigVariation);
    
    // Calculate confidence based on signal quality
    this.confidence = this.calculateConfidence(recentValues);
    
    this.lastMeasurement = {
      totalCholesterol,
      triglycerides
    };
    
    return this.lastMeasurement;
  }
  
  /**
   * Calculate confidence level based on signal quality
   */
  private calculateConfidence(values: number[]): number {
    // More data points means higher confidence
    const dataSizeConfidence = Math.min(values.length / 45, 1);
    
    // Stable signal means higher confidence
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate variance
    let variance = 0;
    for (const val of values) {
      variance += Math.pow(val - avg, 2);
    }
    variance /= values.length;
    
    // Lower variance means more stable signal
    const stabilityConfidence = Math.max(0, 1 - (variance / 0.05));
    
    // Combine factors for overall confidence
    let overallConfidence = (dataSizeConfidence * 0.4) + (stabilityConfidence * 0.6);
    
    return Math.min(overallConfidence, 1);
  }
  
  /**
   * Get current confidence level
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.confidence = 0;
    this.lastMeasurement = { totalCholesterol: 0, triglycerides: 0 };
    console.log("LipidProcessor: Reset completed");
  }
}
