
/**
 * Signal validation utilities
 */
import { SignalValidationResult, SignalValidationConfig } from '../../types/signal';

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: SignalValidationConfig = {
  minAmplitude: 0.01,
  maxAmplitude: 5.0,
  minVariance: 0.00001,
  maxVariance: 1.0,
  requiredSampleSize: 5,
  maxTimeGap: 5000 // ms
};

/**
 * Validate signal data for quality and integrity
 */
export function validateSignalData(
  values: number[], 
  config?: Partial<SignalValidationConfig>
): SignalValidationResult {
  // Merge with default config
  const validationConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  
  // Check if enough samples
  if (values.length < validationConfig.requiredSampleSize) {
    return {
      isValid: false,
      reason: `Insufficient samples: ${values.length} < ${validationConfig.requiredSampleSize}`,
      validationId: 'INSUFFICIENT_SAMPLES'
    };
  }
  
  // Calculate basic statistics
  const min = Math.min(...values);
  const max = Math.max(...values);
  const amplitude = max - min;
  
  // Check amplitude
  if (amplitude < validationConfig.minAmplitude) {
    return {
      isValid: false,
      reason: `Amplitude too low: ${amplitude} < ${validationConfig.minAmplitude}`,
      validationId: 'LOW_AMPLITUDE'
    };
  }
  
  if (validationConfig.maxAmplitude && amplitude > validationConfig.maxAmplitude) {
    return {
      isValid: false,
      reason: `Amplitude too high: ${amplitude} > ${validationConfig.maxAmplitude}`,
      validationId: 'HIGH_AMPLITUDE'
    };
  }
  
  // Calculate variance
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  // Check variance
  if (variance < validationConfig.minVariance) {
    return {
      isValid: false,
      reason: `Variance too low: ${variance} < ${validationConfig.minVariance}`,
      validationId: 'LOW_VARIANCE'
    };
  }
  
  if (validationConfig.maxVariance && variance > validationConfig.maxVariance) {
    return {
      isValid: false,
      reason: `Variance too high: ${variance} > ${validationConfig.maxVariance}`,
      validationId: 'HIGH_VARIANCE'
    };
  }
  
  // All checks passed
  return {
    isValid: true,
    validationId: 'SIGNAL_VALID',
    timestamp: Date.now()
  };
}

/**
 * Validate time gaps between samples
 */
export function validateSampleTiming(
  timestamps: number[],
  maxGap: number = DEFAULT_VALIDATION_CONFIG.maxTimeGap
): SignalValidationResult {
  if (timestamps.length < 2) {
    return { 
      isValid: true,
      validationId: 'INSUFFICIENT_TIMESTAMPS'
    };
  }
  
  // Check for too large gaps
  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];
    
    if (gap > maxGap) {
      return {
        isValid: false,
        reason: `Time gap too large: ${gap}ms > ${maxGap}ms`,
        validationId: 'LARGE_TIME_GAP',
        timestamp: timestamps[i]
      };
    }
    
    if (gap < 0) {
      return {
        isValid: false,
        reason: `Negative time gap: ${gap}ms`,
        validationId: 'NEGATIVE_TIME_GAP',
        timestamp: timestamps[i]
      };
    }
  }
  
  return {
    isValid: true,
    validationId: 'TIMING_VALID',
    timestamp: Date.now()
  };
}

/**
 * Signal validator interface
 */
export interface SignalValidator {
  validateSignalData(values: number[]): SignalValidationResult;
  validateSampleTiming(timestamps: number[]): SignalValidationResult;
  validatePPGDataPoint(point: any): SignalValidationResult;
  setConfig(config: Partial<SignalValidationConfig>): void;
}

/**
 * Create a signal validator instance
 */
export function createSignalValidator(
  config?: Partial<SignalValidationConfig>
): SignalValidator {
  let validationConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  
  return {
    validateSignalData: (values: number[]) => 
      validateSignalData(values, validationConfig),
    
    validateSampleTiming: (timestamps: number[]) => 
      validateSampleTiming(timestamps, validationConfig.maxTimeGap),
    
    validatePPGDataPoint: (point: any): SignalValidationResult => {
      // Check if point has required properties
      if (!point || typeof point !== 'object') {
        return {
          isValid: false,
          reason: 'Invalid point object',
          validationId: 'INVALID_POINT'
        };
      }
      
      // Check required fields
      if (typeof point.value !== 'number') {
        return {
          isValid: false,
          reason: 'Missing or invalid value field',
          validationId: 'MISSING_VALUE'
        };
      }
      
      // Check for timestamp or time
      if (typeof point.timestamp !== 'number' && typeof point.time !== 'number') {
        return {
          isValid: false,
          reason: 'Missing timestamp or time field',
          validationId: 'MISSING_TIMESTAMP'
        };
      }
      
      return { isValid: true, validationId: 'POINT_VALID' };
    },
    
    setConfig: (config: Partial<SignalValidationConfig>) => {
      validationConfig = { ...validationConfig, ...config };
    }
  };
}
