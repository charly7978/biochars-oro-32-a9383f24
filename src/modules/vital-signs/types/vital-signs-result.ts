
/**
 * Type definitions for vital signs results
 */

// Result of vital signs processing
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose: number;
  lipids: LipidsResult;
  confidence?: {
    glucose: number;
    lipids: number;
    overall: number;
  };
  lastArrhythmiaData?: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  hydration: number; // Explicit hydration field
}

// Lipids result interface
export interface LipidsResult {
  totalCholesterol: number;
  hydrationPercentage: number;
  triglycerides?: number;
}

// Processor interface
export interface VitalSignProcessorInterface {
  processSignal(value: number): any;
  reset(): VitalSignsResult | null;
}

// Processor feedback
export interface ProcessorFeedback {
  quality: number;
  calibrationStatus: string;
  lastUpdated: number;
  diagnosticInfo?: Record<string, any>;
}
