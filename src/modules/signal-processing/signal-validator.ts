
/**
 * Signal validation utilities
 */
import { SignalValidationResult, SignalValidationConfig } from '../types/signal';

export class SignalValidator {
  private config: SignalValidationConfig;

  constructor(config: SignalValidationConfig) {
    this.config = config;
  }

  validate(data: any): SignalValidationResult {
    const isValid = this.validateData(data);
    return {
      isValid,
      errorCode: isValid ? undefined : 'INVALID_SIGNAL',
      errorMessage: isValid ? undefined : 'Signal validation failed',
      validatedData: isValid ? data : undefined
    };
  }

  // Add method to validate PPG data points specifically
  validatePPGDataPoint(data: any): SignalValidationResult {
    if (!data) {
      return {
        isValid: false,
        errorCode: 'INVALID_PPG_DATA',
        errorMessage: 'PPG data point is null or undefined'
      };
    }
    
    // Ensure timestamp exists
    if (this.config.validateTimestamp && (!data.timestamp && !data.time)) {
      return {
        isValid: false,
        errorCode: 'MISSING_TIMESTAMP',
        errorMessage: 'PPG data point is missing timestamp'
      };
    }
    
    // Validate value exists
    if (data.value === undefined || data.value === null) {
      return {
        isValid: false,
        errorCode: 'MISSING_VALUE',
        errorMessage: 'PPG data point is missing value'
      };
    }
    
    return {
      isValid: true,
      validatedData: data
    };
  }

  private validateData(data: any): boolean {
    // Basic validation logic
    if (!data) return false;
    
    // Timestamp validation if needed
    if (this.config.validateTimestamp && (!data.timestamp || typeof data.timestamp !== 'number')) {
      return false;
    }
    
    // Quality validation if needed
    if (this.config.validateQuality && data.quality !== undefined && data.quality < this.config.minQuality) {
      return false;
    }
    
    // Value validation if needed
    if (this.config.enforcePositiveValues && data.value !== undefined && data.value < 0) {
      return false;
    }
    
    return true;
  }
}

export function createSignalValidator(config: Partial<SignalValidationConfig> = {}): SignalValidator {
  const defaultConfig: SignalValidationConfig = {
    validateTimestamp: true,
    validateQuality: true,
    minQuality: 0.5,
    maxDataAge: 5000,
    enforcePositiveValues: true
  };
  
  return new SignalValidator({
    ...defaultConfig,
    ...config
  });
}

export default SignalValidator;
