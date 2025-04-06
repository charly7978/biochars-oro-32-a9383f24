
/**
 * Factory for creating VitalSignsResult objects
 */
import { VitalSignsResult } from '../types/vital-signs-result';

export class ResultFactory {
  /**
   * Create an empty results object
   */
  public static createEmptyResults(): VitalSignsResult {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      hydration: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Create a result with all provided values
   */
  public static createResult(
    spo2: number,
    pressure: string,
    arrhythmiaStatus: string,
    glucose: number,
    hydration: number,
    lipids: {
      totalCholesterol: number;
      triglycerides: number;
    },
    confidence?: {
      glucose: number;
      lipids: number;
      overall: number;
    },
    lastArrhythmiaData?: {
      timestamp: number;
      rmssd?: number;
      rrVariation?: number;
    } | null
  ): VitalSignsResult {
    return {
      spo2,
      pressure,
      arrhythmiaStatus,
      glucose,
      hydration,
      lipids,
      confidence,
      lastArrhythmiaData
    };
  }
}
