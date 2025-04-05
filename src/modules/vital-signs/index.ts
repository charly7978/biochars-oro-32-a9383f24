
/**
 * Central export for vital signs module
 */

// Export the VitalSignsProcessor
export { VitalSignsProcessor } from './VitalSignsProcessor';

// Export the HybridVitalSignsProcessor
export { HybridVitalSignsProcessor } from './HybridVitalSignsProcessor';

// Export type definitions for vital signs
export type { 
  VitalSignsResult, 
  LipidsResult, 
  VitalSignProcessorInterface,
  ProcessorFeedback
} from './types/vital-signs-result';

// Export the confidence calculator
export { ConfidenceCalculator } from './calculators/confidence-calculator';

// Export the result factory
export { ResultFactory } from './factories/result-factory';

// Export specialized processors
export * from './specialized/BaseVitalSignProcessor';
export * from './specialized/HydrationProcessor';
export * from './signal-processor';

// Export shared utilities
export * from './shared-signal-utils';

// Export HybridProcessingOptions interface for configuration
export interface HybridProcessingOptions {
  useNeuralModels?: boolean;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
  adaptiveProcessing?: boolean;
  enhancedCalibration?: boolean;
  // Add TensorFlow optimization options
  useWebGPU?: boolean;
  useQuantization?: boolean;
  optimizeForMobile?: boolean;
}

// Re-export signal processing options to ensure compatibility
export { type SignalProcessingOptions } from '../signal-processing/types';

// Export channel feedback interface for communication between components
export interface ChannelFeedback {
  channelId: string;
  signalQuality: number;
  suggestedAdjustments: {
    amplificationFactor?: number;
    filterStrength?: number;
    baselineCorrection?: number;
    frequencyRangeMin?: number;
    frequencyRangeMax?: number;
  };
  timestamp: number;
  success: boolean;
}

// Export AutoCalibrationOptions for new calibration functionality
export interface AutoCalibrationOptions {
  useHistoricalData?: boolean;
  calibrationPeriod?: number; // in milliseconds
  minimumSamplesRequired?: number;
  adaptToBiometrics?: boolean;
  environmentalAdjustment?: boolean;
}

// Export interface for neural network model configuration
export interface NeuralModelConfig {
  modelType: string;
  inputShape: number[];
  outputShape: number[];
  quantized?: boolean;
  useTransformer?: boolean;
  useAttention?: boolean;
}
