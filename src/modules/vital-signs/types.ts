
/**
 * Types for vital signs processing
 */

export interface HybridProcessingOptions {
  useNeuralNetwork: boolean;
  neuralNetworkModelPath?: string;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
}

export interface ProcessingOptions {
  direct: boolean;
  hybrid: boolean;
  adaptiveCalibration: boolean;
}

export interface DiagnosticsInfo {
  timestamp: number;
  processor: string;
  values: Record<string, any>;
}
