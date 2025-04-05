
/**
 * Result types for vital signs processing
 */

/**
 * Lipids measurement result
 */
export interface LipidsResult {
  totalCholesterol: number;
  hydrationPercentage: number;
}

/**
 * Complete vital signs result object
 */
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose: number;
  lipids: LipidsResult;
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
}
