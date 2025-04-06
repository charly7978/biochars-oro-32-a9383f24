
/**
 * Factory for creating VitalSignsResult objects
 * Ensures consistent result structure across the application
 */

import { VitalSignsResult } from '../types/vital-signs-result';

export class ResultFactory {
  /**
   * Create empty results (all zeros)
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
      },
      hydration: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      }
    };
  }
  
  /**
   * Create a fully populated result
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
      hydration: {
        totalCholesterol: hydration.totalCholesterol,
        hydrationPercentage: hydration.hydrationPercentage
      },
      confidence,
      lastArrhythmiaData
    };
  }
}
