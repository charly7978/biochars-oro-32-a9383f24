/**
 * Advanced signal validator with enhanced validation and quality enforcement
 */
import { SignalValidationResult, SignalValidationConfig } from '../../types/signal';
import { errorMonitor, ErrorSeverity, ErrorSource } from '../guardian-shield/error-monitor';
import { TypeScriptWatchdog } from '../guardian-shield/typescript-watchdog';
import { logDiagnostics } from './diagnostics';

/**
 * Enhanced validation configuration
 */
export interface EnhancedValidationConfig extends SignalValidationConfig {
  enforceQualityThreshold: boolean;
  qualityThreshold: number;
  enforceStrictTyping: boolean;
  validateTimeSeries: boolean;
  maxSampleInterval: number; // ms
  maxAllowedOutliers: number;
  enforceFingerDetection: boolean;
}

/**
 * Default enhanced validation configuration
 */
const DEFAULT_ENHANCED_CONFIG: EnhancedValidationConfig = {
  minAmplitude: 0.01,
  maxAmplitude: 5.0,
  minVariance: 0.00001,
  maxVariance: 1.0,
  requiredSampleSize: 5,
  maxTimeGap: 5000, // ms
  enforceQualityThreshold: true,
  qualityThreshold: 30, // Minimum quality (0-100)
  enforceStrictTyping: true,
  validateTimeSeries: true,
  maxSampleInterval: 100, // ms
  maxAllowedOutliers: 3,
  enforceFingerDetection: true
};

/**
 * Enhanced validation result with additional information
 */
export interface EnhancedValidationResult extends SignalValidationResult {
  qualityScore: number;
  typeValidation: {
    valid: boolean;
    errors?: string[];
  };
  timeSeriesValidation?: {
    valid: boolean;
    issues?: string[];
    outlierCount?: number;
    averageSampleInterval?: number;
  };
  fingerDetection?: {
    detected: boolean;
    confidence?: number;
  };
  enforceResult: boolean; // Whether validation result is enforced
}

/**
 * Advanced Signal Validator
 * Provides enhanced validation for signals with stronger quality enforcement
 */
export class AdvancedSignalValidator {
  private config: EnhancedValidationConfig;
  private recentValidations: EnhancedValidationResult[] = [];
  private maxStoredValidations: number = 20;
  
  constructor(config?: Partial<EnhancedValidationConfig>) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
  }
  
  /**
   * Update configuration
   */
  public setConfig(config: Partial<EnhancedValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): EnhancedValidationConfig {
    return { ...this.config };
  }
  
  /**
   * Validate a signal value
   */
  public validateSignalValue(
    value: number,
    options?: {
      quality?: number;
      fingerDetected?: boolean;
      enforce?: boolean;
    }
  ): EnhancedValidationResult {
    const quality = options?.quality ?? 0;
    const fingerDetected = options?.fingerDetected ?? false;
    const enforce = options?.enforce ?? this.config.enforceQualityThreshold;
    
    // Basic validation checks
    const isValidNumber = typeof value === 'number' && !isNaN(value) && isFinite(value);
    
    if (!isValidNumber) {
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: 'Invalid signal value: not a valid number',
        validationId: 'INVALID_NUMBER',
        timestamp: Date.now(),
        qualityScore: 0,
        typeValidation: {
          valid: false,
          errors: ['Value is not a valid number']
        },
        enforceResult: enforce
      };
      
      this.storeValidation(result);
      return result;
    }
    
    // Amplitude check
    if (Math.abs(value) < this.config.minAmplitude) {
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: `Signal amplitude too low: ${Math.abs(value)} < ${this.config.minAmplitude}`,
        validationId: 'LOW_AMPLITUDE',
        timestamp: Date.now(),
        qualityScore: quality,
        typeValidation: { valid: true },
        fingerDetection: {
          detected: fingerDetected,
          confidence: fingerDetected ? 0.7 : 0.3
        },
        enforceResult: enforce
      };
      
      this.storeValidation(result);
      return result;
    }
    
    if (this.config.maxAmplitude && Math.abs(value) > this.config.maxAmplitude) {
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: `Signal amplitude too high: ${Math.abs(value)} > ${this.config.maxAmplitude}`,
        validationId: 'HIGH_AMPLITUDE',
        timestamp: Date.now(),
        qualityScore: quality,
        typeValidation: { valid: true },
        fingerDetection: {
          detected: fingerDetected,
          confidence: fingerDetected ? 0.5 : 0.3
        },
        enforceResult: enforce
      };
      
      this.storeValidation(result);
      return result;
    }
    
    // Quality threshold check
    if (enforce && this.config.enforceQualityThreshold && quality < this.config.qualityThreshold) {
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: `Signal quality below threshold: ${quality} < ${this.config.qualityThreshold}`,
        validationId: 'LOW_QUALITY',
        timestamp: Date.now(),
        qualityScore: quality,
        typeValidation: { valid: true },
        fingerDetection: {
          detected: fingerDetected,
          confidence: fingerDetected ? 0.6 : 0.3
        },
        enforceResult: enforce
      };
      
      this.storeValidation(result);
      return result;
    }
    
    // Finger detection check
    if (enforce && this.config.enforceFingerDetection && !fingerDetected) {
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: 'No finger detected',
        validationId: 'NO_FINGER',
        timestamp: Date.now(),
        qualityScore: quality,
        typeValidation: { valid: true },
        fingerDetection: {
          detected: false,
          confidence: 0.8
        },
        enforceResult: enforce
      };
      
      this.storeValidation(result);
      return result;
    }
    
    // All checks passed
    const result: EnhancedValidationResult = {
      isValid: true,
      validationId: 'SIGNAL_VALID',
      timestamp: Date.now(),
      qualityScore: quality,
      typeValidation: { valid: true },
      fingerDetection: {
        detected: fingerDetected,
        confidence: fingerDetected ? 0.9 : 0.2
      },
      enforceResult: enforce
    };
    
    this.storeValidation(result);
    return result;
  }
  
  /**
   * Validate a processed signal
   */
  public validateProcessedSignal(
    signal: any,
    recentValues: number[] = [],
    recentTimestamps: number[] = []
  ): EnhancedValidationResult {
    try {
      // Use TypeScriptWatchdog to ensure signal has valid structure
      const correctedSignal = TypeScriptWatchdog.correctProcessedSignal(signal);
      
      // Track if we had to correct anything
      const typeValidation = {
        valid: !correctedSignal.corrected,
        errors: correctedSignal.corrected 
          ? correctedSignal.appliedCorrections.map(c => c.message)
          : undefined
      };
      
      // Extract key properties
      const filteredValue = correctedSignal.correctedValue.filteredValue || 0;
      const quality = correctedSignal.correctedValue.quality || 0;
      const fingerDetected = !!correctedSignal.correctedValue.fingerDetected;
      
      // Start with basic validation
      const baseValidation = this.validateSignalValue(filteredValue, {
        quality,
        fingerDetected,
        enforce: this.config.enforceQualityThreshold
      });
      
      // Add time series validation if requested
      let timeSeriesValidation;
      if (this.config.validateTimeSeries && recentTimestamps.length > 1) {
        timeSeriesValidation = this.validateTimeSeries(recentTimestamps, recentValues);
      }
      
      // Combine results
      const result: EnhancedValidationResult = {
        ...baseValidation,
        typeValidation,
        timeSeriesValidation,
        isValid: baseValidation.isValid && 
                 typeValidation.valid && 
                 (!timeSeriesValidation || timeSeriesValidation.valid)
      };
      
      // Update reason if needed
      if (result.isValid) {
        result.reason = undefined;
        result.validationId = 'SIGNAL_FULLY_VALID';
      } else if (!baseValidation.isValid) {
        // Keep base validation reason
      } else if (!typeValidation.valid) {
        result.reason = 'Type validation failed';
        result.validationId = 'TYPE_VALIDATION_FAILED';
      } else if (timeSeriesValidation && !timeSeriesValidation.valid) {
        result.reason = 'Time series validation failed';
        result.validationId = 'TIME_SERIES_INVALID';
      }
      
      this.storeValidation(result);
      return result;
      
    } catch (error) {
      // Handle validation error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Report error to monitor
      errorMonitor.reportError(error, ErrorSource.SIGNAL_PROCESSING, {
        severity: ErrorSeverity.MEDIUM,
        componentName: 'AdvancedSignalValidator',
        context: { signal }
      });
      
      // Log to diagnostics
      logDiagnostics('signal-validation', 'Error validating signal', 'error', {
        error: errorMessage,
        signalType: typeof signal
      });
      
      // Return invalid result
      const result: EnhancedValidationResult = {
        isValid: false,
        reason: `Validation error: ${errorMessage}`,
        validationId: 'VALIDATION_ERROR',
        timestamp: Date.now(),
        qualityScore: 0,
        typeValidation: {
          valid: false,
          errors: [errorMessage]
        },
        enforceResult: this.config.enforceQualityThreshold
      };
      
      this.storeValidation(result);
      return result;
    }
  }
  
  /**
   * Validate time series data
   */
  private validateTimeSeries(
    timestamps: number[],
    values: number[]
  ): EnhancedValidationResult['timeSeriesValidation'] {
    if (timestamps.length < 2) {
      return {
        valid: true,
        issues: ['Not enough samples for time series validation']
      };
    }
    
    const issues: string[] = [];
    let outlierCount = 0;
    let totalInterval = 0;
    let validIntervals = 0;
    
    // Check intervals between consecutive samples
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i - 1];
      
      if (interval < 0) {
        issues.push(`Negative time interval at index ${i}: ${interval}ms`);
        continue;
      }
      
      if (interval > this.config.maxSampleInterval) {
        issues.push(`Large time gap at index ${i}: ${interval}ms > ${this.config.maxSampleInterval}ms`);
        outlierCount++;
        continue;
      }
      
      totalInterval += interval;
      validIntervals++;
    }
    
    // Calculate average interval
    const averageSampleInterval = validIntervals > 0 
      ? totalInterval / validIntervals
      : undefined;
    
    // Check for value outliers (simple z-score)
    if (values.length >= 3) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Count values more than 3 standard deviations from mean
      const extremeOutliers = values.filter(v => Math.abs(v - mean) > 3 * stdDev).length;
      
      if (extremeOutliers > 0) {
        issues.push(`Found ${extremeOutliers} extreme value outliers`);
        outlierCount += extremeOutliers;
      }
    }
    
    return {
      valid: outlierCount <= this.config.maxAllowedOutliers,
      issues: issues.length > 0 ? issues : undefined,
      outlierCount,
      averageSampleInterval
    };
  }
  
  /**
   * Store validation result
   */
  private storeValidation(result: EnhancedValidationResult): void {
    this.recentValidations.unshift(result);
    
    if (this.recentValidations.length > this.maxStoredValidations) {
      this.recentValidations.pop();
    }
    
    // Log invalid results to diagnostics
    if (!result.isValid && result.enforceResult) {
      logDiagnostics('signal-validation', 'Signal validation failed', 'warning', {
        reason: result.reason,
        validationId: result.validationId,
        quality: result.qualityScore,
        fingerDetected: result.fingerDetection?.detected
      });
    }
  }
  
  /**
   * Get recent validation results
   */
  public getRecentValidations(): EnhancedValidationResult[] {
    return [...this.recentValidations];
  }
  
  /**
   * Get validation statistics
   */
  public getValidationStats(): {
    totalValidations: number;
    passRate: number;
    averageQuality: number;
    fingerprintDetectionRate: number;
    topFailureReasons: Record<string, number>;
  } {
    if (this.recentValidations.length === 0) {
      return {
        totalValidations: 0,
        passRate: 0,
        averageQuality: 0,
        fingerprintDetectionRate: 0,
        topFailureReasons: {}
      };
    }
    
    // Count passes
    const passCount = this.recentValidations.filter(v => v.isValid).length;
    
    // Calculate average quality
    const totalQuality = this.recentValidations.reduce((sum, v) => sum + v.qualityScore, 0);
    
    // Count finger detections
    const fingerDetectCount = this.recentValidations.filter(
      v => v.fingerDetection?.detected
    ).length;
    
    // Count failure reasons
    const failureReasons: Record<string, number> = {};
    this.recentValidations
      .filter(v => !v.isValid)
      .forEach(v => {
        const reason = v.validationId || 'UNKNOWN';
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });
    
    return {
      totalValidations: this.recentValidations.length,
      passRate: (passCount / this.recentValidations.length) * 100,
      averageQuality: totalQuality / this.recentValidations.length,
      fingerprintDetectionRate: (fingerDetectCount / this.recentValidations.length) * 100,
      topFailureReasons: failureReasons
    };
  }
  
  /**
   * Reset validation statistics
   */
  public resetStats(): void {
    this.recentValidations = [];
  }
}

// Create a default instance for easy import
export const signalValidator = new AdvancedSignalValidator();
