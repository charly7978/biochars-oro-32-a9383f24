
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
  IMPORT_ERROR
}

/**
 * TypeScript error description
 */
export interface TypeScriptError {
  type: TypeScriptErrorType;
  message: string;
  location?: string;
  suggestion?: string;
}

/**
 * Auto-correction result
 */
export interface CorrectionResult {
  corrected: boolean;
  originalValue: any;
  correctedValue: any;
  appliedCorrections: TypeScriptError[];
}

/**
 * TypeScript watchdog for auto-correction
 */
export class TypeScriptWatchdog {
  /**
   * Auto-correct common TypeScript errors in an object
   */
  public static correctObject<T extends Record<string, any>>(
    obj: T, 
    expectedShape: Partial<T>
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
    const correctedObj = { ...obj };
    
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
        
        correctedObj[key] = defaultValue;
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: `Missing property '${key}' of type '${expectedType}'`,
          suggestion: `Added default value: ${JSON.stringify(defaultValue)}`
        });
      }
      
      // Fix type mismatches for primitive types
      if (correctedObj[key] !== undefined && 
          typeof correctedObj[key] !== typeof expectedShape[key] &&
          typeof expectedShape[key] !== 'object') {
        
        const originalValue = correctedObj[key];
        
        if (typeof expectedShape[key] === 'number') {
          correctedObj[key] = Number(originalValue);
        } else if (typeof expectedShape[key] === 'string') {
          correctedObj[key] = String(originalValue);
        } else if (typeof expectedShape[key] === 'boolean') {
          correctedObj[key] = Boolean(originalValue);
        }
        
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for property '${key}': expected '${typeof expectedShape[key]}' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to '${typeof correctedObj[key]}'`
        });
      }
    }
    
    return {
      corrected: corrections.length > 0,
      originalValue: obj,
      correctedValue: correctedObj,
      appliedCorrections: corrections
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
    const correctedPoint = { ...point };
    
    // Ensure value property is present and numeric
    if (!('value' in correctedPoint)) {
      correctedPoint.value = 0;
      corrections.push({
        type: TypeScriptErrorType.MISSING_PROPERTY,
        message: "Missing 'value' property",
        suggestion: "Added default value: 0"
      });
    } else if (typeof correctedPoint.value !== 'number') {
      const originalValue = correctedPoint.value;
      correctedPoint.value = Number(originalValue) || 0;
      corrections.push({
        type: TypeScriptErrorType.TYPE_MISMATCH,
        message: `Type mismatch for 'value': expected 'number' but got '${typeof originalValue}'`,
        suggestion: `Converted from '${typeof originalValue}' to 'number'`
      });
    }
    
    // Ensure either timestamp or time property is present
    if (!('timestamp' in correctedPoint) && !('time' in correctedPoint)) {
      correctedPoint.timestamp = Date.now();
      correctedPoint.time = correctedPoint.timestamp;
      corrections.push({
        type: TypeScriptErrorType.MISSING_PROPERTY,
        message: "Missing both 'timestamp' and 'time' properties",
        suggestion: "Added current timestamp to both properties"
      });
    } else {
      // Ensure both timestamp and time exist and match
      if ('timestamp' in correctedPoint && !('time' in correctedPoint)) {
        correctedPoint.time = correctedPoint.timestamp;
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'time' property",
          suggestion: "Copied from 'timestamp' property"
        });
      } else if ('time' in correctedPoint && !('timestamp' in correctedPoint)) {
        correctedPoint.timestamp = correctedPoint.time;
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'timestamp' property",
          suggestion: "Copied from 'time' property"
        });
      }
      
      // Ensure timestamp and time are numeric
      if ('timestamp' in correctedPoint && typeof correctedPoint.timestamp !== 'number') {
        const originalValue = correctedPoint.timestamp;
        correctedPoint.timestamp = Number(originalValue) || Date.now();
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for 'timestamp': expected 'number' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'number'`
        });
      }
      
      if ('time' in correctedPoint && typeof correctedPoint.time !== 'number') {
        const originalValue = correctedPoint.time;
        correctedPoint.time = Number(originalValue) || Date.now();
        corrections.push({
          type: TypeScriptErrorType.TYPE_MISMATCH,
          message: `Type mismatch for 'time': expected 'number' but got '${typeof originalValue}'`,
          suggestion: `Converted from '${typeof originalValue}' to 'number'`
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
    const correctedResult = { ...result };
    
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
          suggestion: `Added default value for '${prop}'`
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
          suggestion: "Added default value: 0"
        });
      }
      
      if (lipids && !('triglycerides' in lipids)) {
        lipids.triglycerides = 0;
        
        corrections.push({
          type: TypeScriptErrorType.MISSING_PROPERTY,
          message: "Missing 'triglycerides' in lipids",
          suggestion: "Added default value: 0"
        });
      }
    }
    
    return {
      corrected: corrections.length > 0,
      originalValue: result,
      correctedValue: correctedResult,
      appliedCorrections: corrections
    };
  }
}
