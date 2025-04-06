
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignsResult } from '../types/vital-signs-result';

/**
 * Factory for creating standardized vital signs results
 */
export class ResultFactory {
  /**
   * Create empty results with default values
   * Used when no measurements are available
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
      }
    };
  }
  
  /**
   * Create a complete result with all parameters
   */
  public static createResult(
    spo2: number,
    pressure: string,
    arrhythmiaStatus: string,
    glucose: number,
    hydration: number,
    lipids: { totalCholesterol: number; triglycerides: number },
    confidence?: {
      glucose: number;
      lipids: number;
      overall: number;
    },
    lastArrhythmiaData?: {
      timestamp: number;
      rmssd: number;
      rrVariation: number;
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
