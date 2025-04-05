
/**
 * Central export for vital signs module
 * Optimized and consolidated exports following SOLID principles
 */

// Core processors
export { VitalSignsProcessor } from './VitalSignsProcessor';
export { HybridVitalSignsProcessor } from './HybridVitalSignsProcessor';

// Type definitions
export type { 
  VitalSignsResult, 
  LipidsResult, 
  VitalSignProcessorInterface,
  ProcessorFeedback
} from './types/vital-signs-result';

// Calculation utilities
export { ConfidenceCalculator } from './calculators/confidence-calculator';
export { ResultFactory } from './factories/result-factory';

// Specialized processors
export { BaseVitalSignProcessor } from './specialized/BaseVitalSignProcessor';
export { HydrationProcessor } from './specialized/HydrationProcessor';
export { SignalProcessor } from './signal-processor';

// Shared utilities
export * from './shared-signal-utils';

// Configuration interfaces
export interface HybridProcessingOptions {
  useNeuralModels?: boolean;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
  adaptiveProcessing?: boolean;
  enhancedCalibration?: boolean;
  // TensorFlow optimization options
  useWebGPU?: boolean;
  useQuantization?: boolean;
  optimizeForMobile?: boolean;
}

// Re-export signal processing options to ensure compatibility
export { type SignalProcessingOptions } from '../signal-processing/types';

// Channel feedback interface
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

// Auto-calibration options
export interface AutoCalibrationOptions {
  useHistoricalData?: boolean;
  calibrationPeriod?: number; // in milliseconds
  minimumSamplesRequired?: number;
  adaptToBiometrics?: boolean;
  environmentalAdjustment?: boolean;
}

// Neural network model configuration
export interface NeuralModelConfig {
  modelType: string;
  inputShape: number[];
  outputShape: number[];
  quantized?: boolean;
  useTransformer?: boolean;
  useAttention?: boolean;
}
