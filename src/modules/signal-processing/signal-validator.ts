/**
 * Signal validation module
 * Provides functions to validate signal data based on specified criteria
 */

import { SignalValidationResult, SignalValidationConfig } from '../../types/signal';

// Default validation configuration
const DEFAULT_CONFIG: SignalValidationConfig = {
  validateTimestamp: true,
  validateQuality: true,
  minQuality: 30,
  maxDataAge: 5000,
  enforcePositiveValues: true
};

/**
 * Validates signal data against a given configuration
 * @param data The signal data to validate
 * @param config (Optional) Configuration for validation
 */
export function validateSignal(data: any, config: Partial<SignalValidationConfig> = {}): SignalValidationResult {
  // Merge configs
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Check if data exists
  if (!data) {
    return { 
      isValid: false, 
      errorCode: 'EMPTY_DATA', 
      errorMessage: 'No data provided',
      diagnosticInfo: {
        processingStage: 'Validation',
        validationPassed: false,
        timestamp: Date.now()
      }
    };
  }
  
  // Validate timestamp if configured
  if (finalConfig.validateTimestamp && data.timestamp) {
    const now = Date.now();
    const timestamp = typeof data.time !== 'undefined' ? data.time : data.timestamp;
    
    if (now - timestamp > finalConfig.maxDataAge) {
      return { 
        isValid: false,
        errorCode: 'DATA_TOO_OLD',
        errorMessage: `Data is too old (${now - timestamp}ms)`,
        diagnosticInfo: {
          processingStage: 'Timestamp Validation',
          validationPassed: false,
          timestamp: now
        }
      };
    }
  }

  // Validate quality if configured
  if (finalConfig.validateQuality && data.quality !== undefined) {
    if (data.quality < finalConfig.minQuality) {
      return {
        isValid: false,
        errorCode: 'QUALITY_LOW',
        errorMessage: `Signal quality is too low (${data.quality})`,
        diagnosticInfo: {
          processingStage: 'Quality Validation',
          validationPassed: false,
          timestamp: Date.now()
        }
      };
    }
  }

  // Enforce positive values if configured
  if (finalConfig.enforcePositiveValues && data.value !== undefined && data.value < 0) {
    return {
      isValid: false,
      errorCode: 'NEGATIVE_VALUE',
      errorMessage: 'Signal value is negative',
      diagnosticInfo: {
        processingStage: 'Value Validation',
        validationPassed: false,
        timestamp: Date.now()
      }
    };
  }
  
  // All validations passed
  return {
    isValid: true,
    validatedData: data,
    diagnosticInfo: {
      processingStage: 'Validation',
      validationPassed: true,
      timestamp: Date.now()
    }
  };
}
