
/**
 * Factory for creating VitalSignsResult objects
 * Ensures consistent result structure across the application
 */

import { VitalSignsResult } from '../types/vital-signs-result';

export class ResultFactory {
  /**
   * Create empty results (all zeros)
   * @returns Empty VitalSignsResult object
   */
  public static createEmptyResults(): VitalSignsResult {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      }
    };
  }
  
  /**
   * Create a fully populated result
   * @param spo2 Blood oxygen level
   * @param pressure Blood pressure string
   * @param arrhythmiaStatus Arrhythmia status string
   * @param glucose Blood glucose level
   * @param hydration Hydration values object
   * @param confidence Optional confidence values
   * @param lastArrhythmiaData Optional arrhythmia data
   * @returns Populated VitalSignsResult object
   */
  public static createResult(
    spo2: number,
    pressure: string,
    arrhythmiaStatus: string,
    glucose: number,
    hydration: { totalCholesterol: number, hydrationPercentage: number },
    confidence?: { glucose: number, lipids: number, overall: number },
    lastArrhythmiaData?: { timestamp: number, rmssd: number, rrVariation: number } | null
  ): VitalSignsResult {
    return {
      spo2,
      pressure,
      arrhythmiaStatus,
      glucose,
      lipids: {
        totalCholesterol: hydration.totalCholesterol,
        hydrationPercentage: hydration.hydrationPercentage
      },
      confidence,
      lastArrhythmiaData
    };
  }
  
  /**
   * Create a result with validation
   * Ensures all values are within physiological ranges
   * @param data Raw measurement data
   * @returns Validated VitalSignsResult
   */
  public static createValidatedResult(data: {
    spo2: number,
    pressure: string,
    arrhythmiaStatus: string,
    glucose: number,
    hydration: { totalCholesterol: number, hydrationPercentage: number },
    confidence?: { glucose: number, lipids: number, overall: number },
    lastArrhythmiaData?: { timestamp: number, rmssd: number, rrVariation: number } | null
  }): VitalSignsResult {
    // Validate SPO2 (normal range: 95-100%)
    const validSpo2 = data.spo2 >= 0 && data.spo2 <= 100 ? data.spo2 : 0;
    
    // Validate glucose (normal range: 70-140 mg/dL)
    const validGlucose = data.glucose >= 0 && data.glucose <= 500 ? data.glucose : 0;
    
    // Validate cholesterol (normal range: <200 mg/dL)
    const validCholesterol = data.hydration.totalCholesterol >= 0 ? data.hydration.totalCholesterol : 0;
    
    // Validate hydration (0-100%)
    const validHydration = data.hydration.hydrationPercentage >= 0 && 
                          data.hydration.hydrationPercentage <= 100 ? 
                          data.hydration.hydrationPercentage : 0;
    
    return {
      spo2: validSpo2,
      pressure: data.pressure,
      arrhythmiaStatus: data.arrhythmiaStatus,
      glucose: validGlucose,
      lipids: {
        totalCholesterol: validCholesterol,
        hydrationPercentage: validHydration
      },
      confidence: data.confidence,
      lastArrhythmiaData: data.lastArrhythmiaData
    };
  }
}
