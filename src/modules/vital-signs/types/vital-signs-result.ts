
/**
 * Standardized interface for vital signs measurement results
 * Direct measurement only, no simulation
 */
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose: number;
  lipids: {
    totalCholesterol: number;
    hydrationPercentage: number;  // Using hydrationPercentage instead of triglycerides
  };
  confidence?: {
    glucose: number;
    lipids: number;  // Kept as 'lipids' for backward compatibility
    overall: number;
  };
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd: number;
    rrVariation: number;
  } | null;
}

/**
 * Interface for lipids measurement result
 */
export interface LipidsResult {
  totalCholesterol: number;
  hydrationPercentage: number;
}
