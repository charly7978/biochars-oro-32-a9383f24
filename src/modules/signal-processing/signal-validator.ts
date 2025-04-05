
/**
 * Signal validation utilities
 */
import { 
  SignalValidationResult, 
  SignalValidationConfig, 
  PPGDataPoint 
} from './types-unified';

export class SignalValidator {
  private config: SignalValidationConfig;

  constructor(config: Partial<SignalValidationConfig> = {}) {
    const defaultConfig: SignalValidationConfig = {
      validateTimestamp: true,
      validateQuality: true,
      minQuality: 0.5,
      maxDataAge: 5000,
      enforcePositiveValues: true
    };
    
    this.config = { ...defaultConfig, ...config };
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
    if (this.config.validateTimestamp) {
      // Check for timestamp or time property
      if (!(data.timestamp || data.time) || 
          (data.timestamp && typeof data.timestamp !== 'number') ||
          (data.time && typeof data.time !== 'number')) {
        return false;
      }
      
      // Check data age if timestamp exists
      if (data.timestamp && this.config.maxDataAge > 0) {
        const now = Date.now();
        if (now - data.timestamp > this.config.maxDataAge) {
          return false;
        }
      }
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

  // Add utility methods for specific validations
  isValidSignal(value: number): boolean {
    return value !== undefined && value !== null && (!this.config.enforcePositiveValues || value >= 0);
  }

  hasEnoughData(values: number[]): boolean {
    return values.length >= 5; // Minimum data points needed
  }

  hasValidAmplitude(values: number[]): boolean {
    if (values.length < 2) return false;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const amplitude = max - min;
    
    // Require minimum amplitude for valid signal
    return amplitude > 0.05;
  }

  logValidationResults(isValid: boolean, amplitude: number, values: number[]): void {
    if (!isValid) {
      console.log('Signal validation failed:', {
        amplitude,
        valuesCount: values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      });
    }
  }
}

export function createSignalValidator(config: Partial<SignalValidationConfig> = {}): SignalValidator {
  return new SignalValidator(config);
}

export default SignalValidator;
