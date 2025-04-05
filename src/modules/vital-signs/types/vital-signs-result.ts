
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
  /**
   * Optional confidence values for measurements
   */
  confidence?: {
    spo2?: number;
    pressure?: number;
    glucose?: number;
    lipids?: number;
    overall?: number;
  };
}

/**
 * Base interface for vital sign processor implementations
 */
export interface VitalSignProcessorInterface<T> {
  /**
   * Process a raw signal value to calculate a vital sign
   */
  processValue(value: number): T;
  
  /**
   * Reset the processor state
   */
  reset(): void;
  
  /**
   * Get the processor name or identifier
   */
  getProcessorName(): string;
}

/**
 * Standard interface for vital sign processing feedback
 */
export interface ProcessorFeedback {
  quality: number;
  calibrationStatus: 'uncalibrated' | 'calibrating' | 'calibrated';
  lastUpdated: number;
  diagnosticInfo?: Record<string, any>;
}
