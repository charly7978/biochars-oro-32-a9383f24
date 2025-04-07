
/**
 * Type definitions for hydration measurements
 */

/**
 * Hydration measurement result
 */
export interface HydrationResult {
  totalCholesterol: number;
  hydrationPercentage: number;
}

/**
 * Hydration processing options
 */
export interface HydrationProcessingOptions {
  useDirectMeasurement: boolean;
  useSignalAmplitudeAdjustment: boolean;
  confidenceThreshold: number;
}
