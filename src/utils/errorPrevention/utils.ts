
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilities for error prevention and robust processing
 */

import { trackDeviceError } from '../deviceErrorTracker';
import { logError, ErrorLevel } from '../debugUtils';

/**
 * Error types for categorization and analysis
 */
export enum PreventableErrorType {
  DATA_VALIDATION = 'data_validation',
  BOUNDARY_CHECK = 'boundary_check',
  TYPE_ERROR = 'type_error',
  NULL_CHECK = 'null_check',
  OPERATION_TIMING = 'operation_timing',
  RESOURCE_AVAILABILITY = 'resource_availability',
  SIGNAL_QUALITY = 'signal_quality',
  PROCESSING_PIPELINE = 'processing_pipeline',
  HARDWARE_COMPATIBILITY = 'hardware_compatibility',
  CALIBRATION = 'calibration'
}

/**
 * Type guard that checks if a value is a valid number (not NaN, not Infinity)
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Type guard that checks if a value is a valid array with expected length
 */
export function isValidArray<T>(value: any, minLength = 0, maxLength?: number): value is T[] {
  if (!Array.isArray(value)) return false;
  if (value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

/**
 * Ensures all required object properties exist
 */
export function ensureRequiredProperties<T extends object>(
  obj: any,
  requiredProps: (keyof T)[],
  source: string
): obj is T {
  if (!obj || typeof obj !== 'object') {
    trackDeviceError(`Invalid object: not an object`, 'validation', source);
    return false;
  }

  const missingProps = requiredProps.filter(prop => !(prop in obj));
  
  if (missingProps.length > 0) {
    trackDeviceError(
      `Missing required properties: ${missingProps.join(', ')}`,
      'validation',
      source
    );
    return false;
  }
  
  return true;
}

/**
 * Validates that a number is within expected boundaries
 */
export function validateNumberInRange(
  value: number,
  min: number,
  max: number,
  source: string,
  propertyName?: string
): boolean {
  if (!isValidNumber(value)) {
    trackDeviceError(
      `Invalid number${propertyName ? ` for ${propertyName}` : ''}: ${value}`,
      'validation',
      source
    );
    return false;
  }
  
  if (value < min || value > max) {
    trackDeviceError(
      `Value ${propertyName ? `for ${propertyName}` : ''} out of range (${value}): expected [${min} - ${max}]`,
      'validation',
      source
    );
    return false;
  }
  
  return true;
}

/**
 * Safe method execution with error handling and reporting
 */
export function safeExecute<T>(
  fn: () => T,
  errorHandler: (error: unknown) => T,
  source: string,
  operation: string
): T {
  try {
    return fn();
  } catch (error) {
    trackDeviceError(
      `Error executing ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      'execution',
      source
    );
    return errorHandler(error);
  }
}

/**
 * Safe async method execution with error handling and reporting
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  errorHandler: (error: unknown) => Promise<T> | T,
  source: string,
  operation: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    trackDeviceError(
      `Error executing async ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      'execution',
      source
    );
    return errorHandler(error);
  }
}

/**
 * Create a transaction-like operation that can be rolled back on failure
 */
export function createTransactionOperation<T, R>(
  execute: (state: T) => R,
  rollback: (originalState: T) => void,
  source: string,
  operationName: string
): (state: T) => R | null {
  return (state: T) => {
    // Create deep copy of original state for rollback
    const originalState = JSON.parse(JSON.stringify(state));
    
    try {
      const result = execute(state);
      return result;
    } catch (error) {
      // Log the error
      logError(
        `Transaction operation "${operationName}" failed: ${error instanceof Error ? error.message : String(error)}. Rolling back.`,
        ErrorLevel.ERROR,
        source
      );
      
      // Roll back to original state
      rollback(originalState);
      return null;
    }
  };
}

/**
 * Signal quality validator that applies preset thresholds
 */
export function validateSignalQuality(
  quality: number,
  amplitude: number,
  source: string
): { 
  isValid: boolean; 
  qualityLevel: 'high' | 'medium' | 'low' | 'invalid';
  reason?: string;
} {
  // Validate inputs first
  if (!isValidNumber(quality) || !isValidNumber(amplitude)) {
    return { 
      isValid: false, 
      qualityLevel: 'invalid',
      reason: 'Invalid quality or amplitude values'
    };
  }
  
  // Normalize quality to 0-100 if needed
  const normalizedQuality = quality > 1 ? quality : quality * 100;
  
  // Define thresholds
  if (normalizedQuality > 75 && amplitude > 0.2) {
    return { isValid: true, qualityLevel: 'high' };
  } else if (normalizedQuality > 50 && amplitude > 0.1) {
    return { isValid: true, qualityLevel: 'medium' };
  } else if (normalizedQuality > 30 && amplitude > 0.05) {
    return { isValid: true, qualityLevel: 'low', reason: 'Low quality signal' };
  } else {
    return { 
      isValid: false, 
      qualityLevel: 'invalid',
      reason: `Quality (${normalizedQuality.toFixed(1)}) or amplitude (${amplitude.toFixed(2)}) too low`
    };
  }
}

/**
 * Analyzes a batch of signals for consistency and potential errors
 */
export function analyzeSignalConsistency(
  signals: number[],
  source: string
): {
  isConsistent: boolean;
  meanValue: number;
  stdDeviation: number;
  hasOutliers: boolean;
  outlierCount: number;
  isPhysiological: boolean;
} {
  if (!isValidArray(signals, 3)) {
    return {
      isConsistent: false,
      meanValue: 0,
      stdDeviation: 0,
      hasOutliers: false,
      outlierCount: 0,
      isPhysiological: false
    };
  }
  
  // Calculate mean
  const mean = signals.reduce((sum, val) => sum + val, 0) / signals.length;
  
  // Calculate standard deviation
  const squaredDiffs = signals.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / signals.length;
  const stdDev = Math.sqrt(variance);
  
  // Identify outliers (values > 2 standard deviations from mean)
  const outliers = signals.filter(val => Math.abs(val - mean) > 2 * stdDev);
  
  // Check if signal variation is within physiological limits
  // For heart-related signals: too stable = artificial, too variable = noise
  const normalizedStdDev = stdDev / Math.abs(mean);
  const isPhysiological = normalizedStdDev > 0.05 && normalizedStdDev < 0.8;
  
  return {
    isConsistent: outliers.length < signals.length * 0.1, // Less than 10% outliers
    meanValue: mean,
    stdDeviation: stdDev,
    hasOutliers: outliers.length > 0,
    outlierCount: outliers.length,
    isPhysiological
  };
}

/**
 * Create a buffered operation that requires consecutive successful validations
 * before acknowledging a state change
 */
export function createBufferedStateValidator<T>(
  validationFn: (value: T) => boolean,
  requiredConsecutiveValidations: number,
  requiredConsecutiveFailures: number
): {
  validate: (value: T) => boolean;
  getState: () => 'valid' | 'invalid' | 'pending';
  reset: () => void;
} {
  let consecutiveValidations = 0;
  let consecutiveFailures = 0;
  let currentState: 'valid' | 'invalid' | 'pending' = 'pending';
  
  return {
    validate: (value: T) => {
      const isValid = validationFn(value);
      
      if (isValid) {
        consecutiveValidations++;
        consecutiveFailures = 0;
        
        if (consecutiveValidations >= requiredConsecutiveValidations) {
          currentState = 'valid';
        }
      } else {
        consecutiveFailures++;
        consecutiveValidations = 0;
        
        if (consecutiveFailures >= requiredConsecutiveFailures) {
          currentState = 'invalid';
        }
      }
      
      return currentState === 'valid';
    },
    getState: () => currentState,
    reset: () => {
      consecutiveValidations = 0;
      consecutiveFailures = 0;
      currentState = 'pending';
    }
  };
}

/**
 * Memoize expensive calculations with cache expiration
 */
export function memoizeWithExpiration<T, R>(
  fn: (arg: T) => R,
  getKey: (arg: T) => string,
  maxCacheSize: number = 100,
  expirationMs: number = 60000
): (arg: T) => R {
  const cache = new Map<string, { value: R, timestamp: number }>();
  
  return (arg: T) => {
    const key = getKey(arg);
    const now = Date.now();
    const cached = cache.get(key);
    
    if (cached && now - cached.timestamp < expirationMs) {
      return cached.value;
    }
    
    // Calculate the new value
    const result = fn(arg);
    
    // Manage cache size
    if (cache.size >= maxCacheSize) {
      // Find and delete oldest entry
      let oldestKey = key;
      let oldestTime = now;
      
      for (const [entryKey, entry] of cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = entryKey;
        }
      }
      
      cache.delete(oldestKey);
    }
    
    // Store new result
    cache.set(key, { value: result, timestamp: now });
    
    return result;
  };
}
