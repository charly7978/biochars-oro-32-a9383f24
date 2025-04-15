
/**
 * Types for vital signs processing
 */

// Interface for hybrid processing options
export interface HybridProcessingOptions {
  useNeuralNetwork?: boolean;
  neuralNetworkModelPath?: string;
  useDirect?: boolean;
  useCalibration?: boolean;
}

// Result type for hydration processor
export interface HydrationResult {
  totalCholesterol: number;
  hydrationPercentage: number;
  confidence?: number;
}

// Common interface for all processor diagnostics
export interface ProcessorDiagnostics {
  processedValues?: number;
  lastUpdateTime?: number;
  confidence?: number;
  quality?: number;
  [key: string]: any;
}

