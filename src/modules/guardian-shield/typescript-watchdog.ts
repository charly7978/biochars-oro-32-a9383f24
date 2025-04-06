/**
 * TypeScript Watchdog
 * Automatically detects and corrects common TypeScript errors
 */

/**
 * Type of TypeScript error to handle
 */
export enum TypeScriptErrorType {
  MISSING_PROPERTY,
  TYPE_MISMATCH,
  UNDEFINED_PROPERTY,
  NULL_CHECK,
  IMPORT_ERROR,
  ARRAY_TYPE_MISMATCH, // Added new error type for array issues
  OBJECT_STRUCTURE_MISMATCH // Added new error type for object structure issues
}

/**
 * Severity levels for errors
 */
export type ErrorSeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * TypeScript error description
 */
export interface TypeScriptError {
  type: TypeScriptErrorType;
  message: string;
  location?: string;
  suggestion?: string;
  severity: ErrorSeverityLevel; // Use the strictly typed severity level
  timestamp: number; // Added timestamp for tracking
}

/**
 * Auto-correction result
 */
export interface CorrectionResult {
  corrected: boolean;
  originalValue: any;
  correctedValue: any;
  appliedCorrections: TypeScriptError[];
  preservedKeys?: string[]; // Added to track which properties were preserved
  addedKeys?: string[]; // Added to track which properties were added
}

/**
 * TypeScript watchdog for auto-correction
 */
export class TypeScriptWatchdog {
  // Track error occurrences to prevent repeated corrections
  private static errorOccurrences: Map<string, { count: number, lastTime: number }> = new Map();
  
  /**
   * Auto-correct common TypeScript errors in an object
   */
  public static correctObject<T extends Record<string, any>>(
    obj: T, 
    expectedShape: Partial<Record<keyof T, any>>,
    options?: {
      strict?: boolean; // When true, use stricter type checking
      preserveExtraProperties?: boolean; // When true, keep extra properties not in expectedShape
      logCorrections?: boolean; // When true, log corrections to console
    }
  ): CorrectionResult {
    if (!obj || typeof obj !== 'object') {
      return {
        corrected: false,
        originalValue: obj,
        correctedValue: obj,
        appliedCorrections: []
      };
    }
    
    const corrections: TypeScriptError[] = [];
    const correctedObj = { ...obj } as T;
    const preservedKeys: string[] = [];
    const addedKeys: string[] = [];
    const now = Date.now();
    
    // Determine options
    const strict = options?.strict ?? false;
    const preserveExtra = options?.preserveExtraProperties ?? true;
    const logCorrections = options?.logCorrections ?? false;
    
    // Check and fix missing properties
    for (const key in expectedShape) {
      if (!(key in correctedObj) || correctedObj[key] === undefined) {
        // Property missing or undefined
        const expectedType = typeof expectedShape[key];
        let defaultValue: any;
        
        // Create appropriate default value based on expected type
        if (expectedType === 'number') {
          defaultValue = 0;
        } else if (expectedType === 'string') {
          defaultValue = '';
        } else if (expectedType === 'boolean') {
          defaultValue = false;
        } else if (expectedType === 'object') {
          if (Array.isArray(expectedShape[key])) {
            defaultValue = [];
          } else {
            defaultValue = {};
          }
        } else {
          defaultValue = null;
        }
        
        // Fix TS2322 by using any as intermediate type
        (correctedObj as any)[key] = defaultValue;
        addedKeys.push(key);
        
        // Create error object
        const errorKey = `missing_${key}`;
        const errorObj: TypeScriptError = {
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: `Missing property '${key}' of type '${expectedType}'`,
          suggestion: `Added default value: ${JSON.stringify(defaultValue)}`,
          severity: 'medium' as ErrorSeverityLevel, // Most missing properties are medium severity
          timestamp: now
        };
        
        // Track error occurrence
        this.trackErrorOccurrence(errorKey);
        corrections.push(errorObj);

        if (logCorrections) {
          console.warn(`TypeScriptWatchdog: ${errorObj.message}`, errorObj.suggestion);
        }
      }
      
      // Fix type mismatches for primitive types
      if (correctedObj[key] !== undefined && 
          typeof correctedObj[key] !== typeof expectedShape[key] &&
          typeof expectedShape[key] !== 'object') {
        
        const originalValue = correctedObj[key];
        const originalType = typeof originalValue;
        const expectedType = typeof expectedShape[key];
        
        // Try to convert to expected type
        if (expectedType === 'number') {
          // Fix TS2322 by using any as intermediate type
          (correctedObj as any)[key] = Number(originalValue);
          if (isNaN((correctedObj as any)[key]) && strict) {
            (correctedObj as any)[key] = 0; // In strict mode, use 0 for NaN values
          }
        } else if (expectedType === 'string') {
          // Fix TS2322 by using any as intermediate type
          (correctedObj as any)[key] = String(originalValue);
        } else if (expectedType === 'boolean') {
          // Fix TS2322 by using any as intermediate type
          (correctedObj as any)[key] = Boolean(originalValue);
        }
        
        const errorKey = `type_mismatch_${key}`;
        const errorObj: TypeScriptError = {
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for property '${key}': expected '${expectedType}' but got '${originalType}'`,
          suggestion: `Converted from '${originalType}' to '${expectedType}'`,
          severity: 'high' as ErrorSeverityLevel, // Type mismatches are high severity
          timestamp: now
        };
        
        this.trackErrorOccurrence(errorKey);
        corrections.push(errorObj);
        
        if (logCorrections) {
          console.warn(`TypeScriptWatchdog: ${errorObj.message}`, errorObj.suggestion);
        }
      }
      
      // Handle array type mismatches
      if (Array.isArray(expectedShape[key]) && !Array.isArray(correctedObj[key]) && correctedObj[key] !== undefined) {
        // Convert to array if possible
        const originalValue = correctedObj[key];
        // If not null or undefined, wrap in array, otherwise use empty array
        (correctedObj as any)[key] = originalValue != null ? [originalValue] : [];
        
        const errorKey = `array_mismatch_${key}`;
        const errorObj: TypeScriptError = {
          type: TypeScriptErrorType.ARRAY_TYPE_MISMATCH,
          message: `Expected array for property '${key}' but got ${typeof originalValue}`,
          suggestion: `Converted to array: [${originalValue}]`,
          severity: 'high' as ErrorSeverityLevel,
          timestamp: now
        };
        
        this.trackErrorOccurrence(errorKey);
        corrections.push(errorObj);
        
        if (logCorrections) {
          console.warn(`TypeScriptWatchdog: ${errorObj.message}`, errorObj.suggestion);
        }
      }
      
      // Handle object structure checks for nested objects
      if (
        typeof expectedShape[key] === 'object' && 
        !Array.isArray(expectedShape[key]) && 
        typeof correctedObj[key] === 'object' && 
        correctedObj[key] !== null &&
        !Array.isArray(correctedObj[key])
      ) {
        // Recursively correct nested objects
        const nestedResult = this.correctObject(
          correctedObj[key], 
          expectedShape[key] as Record<string, any>,
          options
        );
        
        if (nestedResult.corrected) {
          (correctedObj as any)[key] = nestedResult.correctedValue;
          
          // Add nested corrections with proper context
          const nestedCorrections = nestedResult.appliedCorrections.map(correction => ({
            ...correction,
            message: `In '${key}': ${correction.message}`,
            location: key
          }));
          
          corrections.push(...nestedCorrections);
        }
      }
      
      if (correctedObj[key] !== undefined) {
        preservedKeys.push(key);
      }
    }
    
    // In strict mode, remove extra properties
    if (strict && !preserveExtra) {
      for (const key in correctedObj) {
        if (!(key in expectedShape)) {
          delete correctedObj[key];
          
          const errorKey = `extra_property_${key}`;
          const errorObj: TypeScriptError = {
            type: TypeScriptErrorType.OBJECT_STRUCTURE_MISMATCH,
            message: `Removed extra property '${key}' not in expected shape`,
            severity: 'medium' as ErrorSeverityLevel,
            timestamp: now
          };
          
          this.trackErrorOccurrence(errorKey);
          corrections.push(errorObj);
          
          if (logCorrections) {
            console.warn(`TypeScriptWatchdog: ${errorObj.message}`);
          }
        }
      }
    }
    
    return {
      corrected: corrections.length > 0,
      originalValue: obj,
      correctedValue: correctedObj,
      appliedCorrections: corrections,
      preservedKeys,
      addedKeys
    };
  }
  
  /**
   * Fix PPGDataPoint common issues
   */
  public static correctPPGDataPoint<T extends { value?: any, timestamp?: any, time?: any }>(
    point: T
  ): CorrectionResult {
    if (!point || typeof point !== 'object') {
      return {
        corrected: false,
        originalValue: point,
        correctedValue: point,
        appliedCorrections: []
      };
    }
    
    const corrections: TypeScriptError[] = [];
    // Use as any to avoid type issues 
    const correctedPoint = { ...point } as any;
    const now = Date.now();
    
    // Ensure value property is present and numeric
    if (!('value' in correctedPoint)) {
      correctedPoint.value = 0;
      corrections.push({
        type: TypeScriptErrorType.MISSING_PROPERTY,
        message: "Missing 'value' property",
        suggestion: "Added default value: 0",
        severity: 'high',
        timestamp: now
      });
    } else if (typeof correctedPoint.value !== 'number') {
      const originalValue = correctedPoint.value;
      correctedPoint.value = Number(originalValue) || 0;
      corrections.push({
        type: TypeScriptErrorType.TYPE_MISMATCH,
        message: `Type mismatch for 'value': expected 'number' but got '${typeof originalValue}'`,
        suggestion: `Converted from '${typeof originalValue}' to 'number'`,
        severity: 'high',
        timestamp: now
      });
    }
    
    // Ensure either timestamp or time property is present
    if (!('timestamp' in correctedPoint) && !('time' in correctedPoint)) {
      correctedPoint.timestamp = now;
      correctedPoint.time = correctedPoint.timestamp;
      corrections.push({
        type: TypeScriptErrorType.MISSING_PROPERTY,
        message: "Missing both 'timestamp' and 'time' properties",
        suggestion: "Added current timestamp to both properties",
        severity: 'high',
        timestamp: now
      });
    } else {
      // Ensure both timestamp and time exist and match
      if ('timestamp' in correctedPoint && !('time' in correctedPoint)) {
        correctedPoint.time = correctedPoint.timestamp;
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'time' property",
          suggestion: "Copied from 'timestamp' property",
          severity: 'medium',
          timestamp: now
        });
      } else if ('time' in correctedPoint && !('timestamp' in correctedPoint)) {
        correctedPoint.timestamp = correctedPoint.time;
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'timestamp' property",
          suggestion: "Copied from 'time' property",
          severity: 'medium',
          timestamp: now
        });
      }
      
      // Ensure timestamp and time are numeric
      if ('timestamp' in correctedPoint && typeof correctedPoint.timestamp !== 'number') {
        const originalValue = correctedPoint.timestamp;
        correctedPoint.timestamp = Number(originalValue) || now;
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for 'timestamp': expected 'number' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'number'`,
          severity: 'high',
          timestamp: now
        });
      }
      
      if ('time' in correctedPoint && typeof correctedPoint.time !== 'number') {
        const originalValue = correctedPoint.time;
        correctedPoint.time = Number(originalValue) || now;
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for 'time': expected 'number' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'number'`,
          severity: 'high',
          timestamp: now
        });
      }
    }
    
    return {
      corrected: corrections.length > 0,
      originalValue: point,
      correctedValue: correctedPoint,
      appliedCorrections: corrections
    };
  }
  
  /**
   * Fix VitalSignsResult common issues
   */
  public static correctVitalSignsResult<T extends Record<string, any>>(
    result: T
  ): CorrectionResult {
    if (!result || typeof result !== 'object') {
      return {
        corrected: false,
        originalValue: result,
        correctedValue: result,
        appliedCorrections: []
      };
    }
    
    const corrections: TypeScriptError[] = [];
    // Use as any to avoid type indexing issues
    const correctedResult = { ...result } as any;
    const now = Date.now();
    
    // Check for required properties
    const requiredProperties = [
      'spo2',
      'pressure',
      'arrhythmiaStatus',
      'glucose',
      'hydration',
      'lipids'
    ];
    
    requiredProperties.forEach(prop => {
      if (!(prop in correctedResult)) {
        if (prop === 'lipids') {
          correctedResult[prop] = {
            totalCholesterol: 0,
            triglycerides: 0
          };
        } else if (prop === 'pressure') {
          correctedResult[prop] = "--/--";
        } else if (prop === 'arrhythmiaStatus') {
          correctedResult[prop] = "--";
        } else {
          correctedResult[prop] = 0;
        }
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: `Missing required property '${prop}'`,
          suggestion: `Added default value for '${prop}'`,
          severity: 'high',
          timestamp: now
        });
      }
    });
    
    // Check lipids structure
    if ('lipids' in correctedResult && typeof correctedResult.lipids === 'object') {
      const lipids = correctedResult.lipids;
      
      if (!lipids || !('totalCholesterol' in lipids)) {
        if (!lipids) {
          correctedResult.lipids = {
            totalCholesterol: 0,
            triglycerides: 0
          };
        } else {
          lipids.totalCholesterol = 0;
        }
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'totalCholesterol' in lipids",
          suggestion: "Added default value: 0",
          severity: 'medium',
          timestamp: now
        });
      }
      
      if (lipids && !('triglycerides' in lipids)) {
        lipids.triglycerides = 0;
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'triglycerides' in lipids",
          suggestion: "Added default value: 0",
          severity: 'medium',
          timestamp: now
        });
      }
    }
    
    // Check numeric types
    const numericProps = ['spo2', 'glucose', 'hydration'];
    numericProps.forEach(prop => {
      if (prop in correctedResult && typeof correctedResult[prop] !== 'number') {
        const originalValue = correctedResult[prop];
        correctedResult[prop] = Number(originalValue) || 0;
        
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for '${prop}': expected 'number' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'number'`,
          severity: 'high',
          timestamp: now
        });
      }
    });
    
    // Check string types
    const stringProps = ['pressure', 'arrhythmiaStatus'];
    stringProps.forEach(prop => {
      if (prop in correctedResult && typeof correctedResult[prop] !== 'string') {
        const originalValue = correctedResult[prop];
        correctedResult[prop] = String(originalValue);
        
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for '${prop}': expected 'string' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'string'`,
          severity: 'medium',
          timestamp: now
        });
      }
    });
    
    return {
      corrected: corrections.length > 0,
      originalValue: result,
      correctedValue: correctedResult,
      appliedCorrections: corrections
    };
  }
  
  /**
   * Fix ProcessedSignal common issues
   */
  public static correctProcessedSignal<T extends Record<string, any>>(
    signal: T
  ): CorrectionResult {
    if (!signal || typeof signal !== 'object') {
      return {
        corrected: false,
        originalValue: signal,
        correctedValue: signal,
        appliedCorrections: []
      };
    }
    
    const corrections: TypeScriptError[] = [];
    const correctedSignal = { ...signal } as any;
    const now = Date.now();
    
    // Required properties for ProcessedSignal
    const requiredProps = [
      { name: 'timestamp', type: 'number', defaultValue: now },
      { name: 'rawValue', type: 'number', defaultValue: 0 },
      { name: 'filteredValue', type: 'number', defaultValue: 0 },
      { name: 'quality', type: 'number', defaultValue: 0 },
      { name: 'fingerDetected', type: 'boolean', defaultValue: false },
      { name: 'roi', type: 'object', defaultValue: { x: 0, y: 0, width: 100, height: 100 } }
    ];
    
    // Check and fix each required property
    requiredProps.forEach(prop => {
      // Add missing property
      if (!(prop.name in correctedSignal)) {
        correctedSignal[prop.name] = prop.defaultValue;
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: `Missing required property '${prop.name}'`,
          suggestion: `Added default value: ${JSON.stringify(prop.defaultValue)}`,
          severity: 'high',
          timestamp: now
        });
      } 
      // Fix type mismatch
      else if (typeof correctedSignal[prop.name] !== prop.type) {
        const originalValue = correctedSignal[prop.name];
        
        if (prop.type === 'number') {
          correctedSignal[prop.name] = Number(originalValue) || 0;
        } else if (prop.type === 'boolean') {
          correctedSignal[prop.name] = Boolean(originalValue);
        } else if (prop.type === 'object' && prop.name === 'roi') {
          // Special handling for roi object
          const defaultRoi = { x: 0, y: 0, width: 100, height: 100 };
          correctedSignal[prop.name] = typeof originalValue === 'object' && originalValue !== null 
            ? { ...defaultRoi, ...originalValue }
            : defaultRoi;
        }
        
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for '${prop.name}': expected '${prop.type}' but got '${typeof originalValue}'`,
          suggestion: `Converted to appropriate type`,
          severity: 'high',
          timestamp: now
        });
      }
    });
    
    // Check roi structure
    if ('roi' in correctedSignal && typeof correctedSignal.roi === 'object') {
      const roi = correctedSignal.roi;
      const roiProps = ['x', 'y', 'width', 'height'];
      
      if (!roi) {
        correctedSignal.roi = { x: 0, y: 0, width: 100, height: 100 };
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "ROI object is null",
          suggestion: "Created default ROI object",
          severity: 'medium',
          timestamp: now
        });
      } else {
        roiProps.forEach(prop => {
          if (!(prop in roi)) {
            roi[prop] = 0;
            if (prop === 'width' || prop === 'height') {
              roi[prop] = 100;
            }
            
            corrections.push({
              type: TypeScriptErrorType.MISSING_PROPERTY,
              message: `Missing '${prop}' in roi`,
              suggestion: `Added default value: ${roi[prop]}`,
              severity: 'medium',
              timestamp: now
            });
          } else if (typeof roi[prop] !== 'number') {
            const originalValue = roi[prop];
            roi[prop] = Number(originalValue) || (prop === 'width' || prop === 'height' ? 100 : 0);
            
            corrections.push({
              type: TypeScriptErrorType.TYPE_MISMATCH,
              message: `Type mismatch for roi.${prop}: expected 'number' but got '${typeof originalValue}'`,
              suggestion: `Converted to number`,
              severity: 'medium',
              timestamp: now
            });
          }
        });
      }
    }
    
    return {
      corrected: corrections.length > 0,
      originalValue: signal,
      correctedValue: correctedSignal,
      appliedCorrections: corrections
    };
  }
  
  /**
   * Track error occurrences to prevent log spam
   */
  private static trackErrorOccurrence(errorKey: string): void {
    const now = Date.now();
    const errorData = this.errorOccurrences.get(errorKey);
    
    if (errorData) {
      errorData.count++;
      errorData.lastTime = now;
    } else {
      this.errorOccurrences.set(errorKey, { count: 1, lastTime: now });
    }
  }
  
  /**
   * Get error statistics
   */
  public static getErrorStats(): {
    totalUniqueErrors: number;
    topErrors: Array<{ key: string, count: number }>;
    recentErrors: Array<{ key: string, timestamp: number }>;
  } {
    const errors = Array.from(this.errorOccurrences.entries());
    
    return {
      totalUniqueErrors: errors.length,
      topErrors: errors
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([key, data]) => ({ key, count: data.count })),
      recentErrors: errors
        .sort((a, b) => b[1].lastTime - a[1].lastTime)
        .slice(0, 5)
        .map(([key, data]) => ({ key, timestamp: data.lastTime }))
    };
  }
  
  /**
   * Reset error statistics
   */
  public static resetErrorStats(): void {
    this.errorOccurrences.clear();
  }
}
