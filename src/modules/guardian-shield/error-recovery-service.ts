
/**
 * Error Recovery Service
 * Advanced error recovery mechanisms for the Guardian Shield system
 */
import { TypeScriptWatchdog, TypeScriptError, CorrectionResult } from './typescript-watchdog';
import { ProcessingError } from '../../types/signal';
import { logDiagnostics } from '../signal-processing/diagnostics';

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  USE_LAST_GOOD_VALUE,
  USE_DEFAULT_VALUE,
  SKIP_PROCESSING,
  RETRY_OPERATION,
  FALLBACK_ALGORITHM
}

/**
 * Recovery attempt result
 */
export interface RecoveryAttemptResult {
  successful: boolean;
  strategy: RecoveryStrategy;
  originalError: ProcessingError | Error;
  resultValue: any;
  diagnosticInfo?: Record<string, any>;
}

/**
 * Error tracking data
 */
interface ErrorOccurrence {
  count: number;
  firstSeen: number;
  lastSeen: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
}

/**
 * Advanced error recovery service to complement TypeScript Watchdog
 */
export class ErrorRecoveryService {
  // Track error occurrences by error code and component
  private static errorRegistry: Map<string, ErrorOccurrence> = new Map();
  
  // Store last good values by component and data type
  private static lastGoodValues: Map<string, any> = new Map();
  
  // Default values by data type
  private static defaultValues: Map<string, any> = new Map([
    ['ProcessedSignal', {
      timestamp: Date.now(),
      rawValue: 0,
      filteredValue: 0,
      quality: 0,
      fingerDetected: false,
      roi: { x: 0, y: 0, width: 100, height: 100 }
    }],
    ['PrecisionVitalSignsResult', {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      hydration: 0,
      lipids: { totalCholesterol: 0, triglycerides: 0 },
      isCalibrated: false,
      correlationValidated: false,
      environmentallyAdjusted: false,
      precisionMetrics: {
        confidence: 0,
        variance: 0,
        timeSeriesStability: 0
      }
    }],
    ['PPGDataPoint', {
      timestamp: Date.now(),
      value: 0,
      time: Date.now()
    }]
  ]);
  
  /**
   * Register a good value for recovery purposes
   */
  public static registerGoodValue(componentName: string, dataType: string, value: any): void {
    const key = `${componentName}:${dataType}`;
    
    // Only register if value is valid
    if (value !== null && value !== undefined) {
      this.lastGoodValues.set(key, structuredClone(value));
    }
  }
  
  /**
   * Handle a processing error and attempt recovery
   */
  public static handleError(
    error: ProcessingError | Error,
    componentName: string,
    dataType: string,
    options?: {
      context?: Record<string, any>;
      maxRecoveryAttempts?: number;
      preferredStrategy?: RecoveryStrategy;
      logLevel?: 'none' | 'errors' | 'all';
    }
  ): RecoveryAttemptResult {
    const now = Date.now();
    const errorCode = error instanceof Error ? error.name : error.code;
    const errorKey = `${componentName}:${errorCode}`;
    const maxAttempts = options?.maxRecoveryAttempts || 3;
    const logLevel = options?.logLevel || 'errors';
    
    // Track error occurrence
    this.trackErrorOccurrence(errorKey, now);
    
    // Get error tracking data
    const errorData = this.errorRegistry.get(errorKey);
    
    // If error is recurring too much, use simpler recovery strategy
    const preferredStrategy = options?.preferredStrategy || 
      (errorData && errorData.count > maxAttempts ? RecoveryStrategy.USE_DEFAULT_VALUE : RecoveryStrategy.USE_LAST_GOOD_VALUE);
    
    // Attempt recovery
    const recoveryResult = this.attemptRecovery(
      error,
      componentName,
      dataType,
      preferredStrategy,
      options?.context
    );
    
    // Update recovery statistics
    if (errorData) {
      errorData.recoveryAttempts++;
      if (recoveryResult.successful) {
        errorData.successfulRecoveries++;
      }
    }
    
    // Log recovery attempt if needed
    if (logLevel === 'all' || (logLevel === 'errors' && !recoveryResult.successful)) {
      const errorMessage = error instanceof Error ? error.message : error.message;
      const errorType = error instanceof Error ? error.name : `${error.code} (${error.severity})`;
      
      console.warn(
        `Error recovery [${componentName}:${dataType}]: ${errorType} - ${errorMessage}`,
        `Strategy: ${RecoveryStrategy[recoveryResult.strategy]}`,
        `Success: ${recoveryResult.successful}`,
        recoveryResult.diagnosticInfo || {}
      );
      
      // Log to diagnostics system
      logDiagnostics('error-recovery', 
        `Recovery attempt: ${recoveryResult.successful ? 'success' : 'failed'}`, 
        recoveryResult.successful ? 'info' : 'warning',
        {
          component: componentName,
          dataType,
          errorType,
          strategy: RecoveryStrategy[recoveryResult.strategy],
          errorCount: errorData?.count || 1
        }
      );
    }
    
    return recoveryResult;
  }
  
  /**
   * Track an error occurrence
   */
  private static trackErrorOccurrence(errorKey: string, timestamp: number): void {
    const existing = this.errorRegistry.get(errorKey);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = timestamp;
    } else {
      this.errorRegistry.set(errorKey, {
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        recoveryAttempts: 0,
        successfulRecoveries: 0
      });
    }
  }
  
  /**
   * Attempt to recover from an error
   */
  private static attemptRecovery(
    error: ProcessingError | Error,
    componentName: string,
    dataType: string,
    strategy: RecoveryStrategy,
    context?: Record<string, any>
  ): RecoveryAttemptResult {
    const valueKey = `${componentName}:${dataType}`;
    let resultValue: any = null;
    let successful = false;
    let diagnosticInfo: Record<string, any> = {};
    
    // Try primary strategy first
    switch (strategy) {
      case RecoveryStrategy.USE_LAST_GOOD_VALUE: {
        const lastGood = this.lastGoodValues.get(valueKey);
        if (lastGood !== undefined) {
          resultValue = structuredClone(lastGood);
          successful = true;
          diagnosticInfo.source = 'last_good_value';
          diagnosticInfo.age = Date.now() - this.errorRegistry.get(`${componentName}:${error instanceof Error ? error.name : error.code}`)?.firstSeen;
        } else {
          // Fall back to default value if no last good value
          const defaultVal = this.defaultValues.get(dataType);
          if (defaultVal !== undefined) {
            resultValue = structuredClone(defaultVal);
            successful = true;
            diagnosticInfo.source = 'default_value_fallback';
            diagnosticInfo.reason = 'no_last_good_value';
          }
        }
        break;
      }
      
      case RecoveryStrategy.USE_DEFAULT_VALUE: {
        const defaultVal = this.defaultValues.get(dataType);
        if (defaultVal !== undefined) {
          resultValue = structuredClone(defaultVal);
          successful = true;
          diagnosticInfo.source = 'default_value';
        }
        break;
      }
      
      case RecoveryStrategy.RETRY_OPERATION:
        // Can't implement here - caller would need to retry
        successful = false;
        diagnosticInfo.reason = 'retry_not_implemented_here';
        break;
        
      case RecoveryStrategy.SKIP_PROCESSING:
        // Just indicate to skip this processing cycle
        resultValue = null; 
        successful = true;
        diagnosticInfo.source = 'skip_processing';
        break;
        
      case RecoveryStrategy.FALLBACK_ALGORITHM:
        // Apply a simple fallback if context is available
        if (context && context.value !== undefined) {
          // Very basic fallback calculation
          if (dataType === 'PrecisionVitalSignsResult') {
            const baseValue = Math.abs(Number(context.value) || 0);
            resultValue = {
              spo2: Math.min(99, Math.max(90, 96 + baseValue)),
              pressure: "120/80",
              arrhythmiaStatus: "NORMAL RHYTHM",
              glucose: Math.min(120, Math.max(80, 100 + baseValue)),
              hydration: Math.min(70, Math.max(40, 60 + baseValue)),
              lipids: { totalCholesterol: 180, triglycerides: 150 },
              isCalibrated: false,
              correlationValidated: false,
              environmentallyAdjusted: false,
              precisionMetrics: {
                confidence: 0.3,
                variance: 0,
                timeSeriesStability: 0
              }
            };
            successful = true;
            diagnosticInfo.source = 'fallback_algorithm';
          } else if (dataType === 'ProcessedSignal') {
            resultValue = {
              timestamp: Date.now(),
              rawValue: Number(context.value) || 0,
              filteredValue: Number(context.value) || 0,
              quality: 30, // Low confidence
              fingerDetected: context.fingerDetected || false,
              roi: { x: 0, y: 0, width: 100, height: 100 }
            };
            successful = true;
            diagnosticInfo.source = 'fallback_algorithm';
          }
        }
        break;
    }
    
    // If primary strategy failed, try default values as last resort
    if (!successful && resultValue === null) {
      const defaultVal = this.defaultValues.get(dataType);
      if (defaultVal !== undefined) {
        resultValue = structuredClone(defaultVal);
        successful = true;
        diagnosticInfo.source = 'default_value_last_resort';
        diagnosticInfo.originalStrategy = RecoveryStrategy[strategy];
      }
    }
    
    // Add error-specific info to diagnostics
    diagnosticInfo.errorType = error instanceof Error ? error.name : error.code;
    if (!(error instanceof Error)) {
      diagnosticInfo.errorSeverity = error.severity;
      diagnosticInfo.errorRecoverable = error.recoverable;
    }
    
    return {
      successful,
      strategy,
      originalError: error,
      resultValue,
      diagnosticInfo
    };
  }
  
  /**
   * Register a default value for a data type
   */
  public static registerDefaultValue(dataType: string, value: any): void {
    this.defaultValues.set(dataType, structuredClone(value));
  }
  
  /**
   * Get error statistics
   */
  public static getErrorStats(): {
    totalErrors: number;
    totalRecoveryAttempts: number;
    successfulRecoveries: number;
    topErrors: Array<{ key: string, count: number, successRate: number }>;
    recoveryRate: number;
  } {
    let totalErrors = 0;
    let totalRecoveryAttempts = 0;
    let successfulRecoveries = 0;
    
    for (const data of this.errorRegistry.values()) {
      totalErrors += data.count;
      totalRecoveryAttempts += data.recoveryAttempts;
      successfulRecoveries += data.successfulRecoveries;
    }
    
    const recoveryRate = totalRecoveryAttempts > 0 
      ? (successfulRecoveries / totalRecoveryAttempts) * 100
      : 0;
    
    return {
      totalErrors,
      totalRecoveryAttempts,
      successfulRecoveries,
      recoveryRate,
      topErrors: Array.from(this.errorRegistry.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([key, data]) => ({ 
          key, 
          count: data.count,
          successRate: data.recoveryAttempts > 0 
            ? (data.successfulRecoveries / data.recoveryAttempts) * 100
            : 0
        }))
    };
  }
  
  /**
   * Reset error tracking
   */
  public static resetErrorTracking(): void {
    this.errorRegistry.clear();
  }
}

/**
 * Decorator to auto-apply error recovery to a class method
 * Use: @WithErrorRecovery('componentName', 'dataType')
 */
export function WithErrorRecovery(componentName: string, dataType: string, options?: {
  strategy?: RecoveryStrategy;
  logLevel?: 'none' | 'errors' | 'all';
}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        
        // If the result is a Promise, handle async error recovery
        if (result instanceof Promise) {
          return result
            .then(value => {
              // Register good value for future recovery
              if (value !== undefined && value !== null) {
                ErrorRecoveryService.registerGoodValue(componentName, dataType, value);
              }
              return value;
            })
            .catch(error => {
              // Create context with method arguments
              const context = { args };
              
              // Handle error and recover
              const recovery = ErrorRecoveryService.handleError(
                error instanceof Error ? error : {
                  code: 'METHOD_EXECUTION_ERROR',
                  message: String(error),
                  timestamp: Date.now(),
                  severity: 'high',
                  recoverable: true,
                  component: componentName
                },
                componentName,
                dataType,
                {
                  context,
                  preferredStrategy: options?.strategy,
                  logLevel: options?.logLevel
                }
              );
              
              if (recovery.successful) {
                return recovery.resultValue;
              } else {
                throw error; // Re-throw if recovery failed
              }
            });
        } 
        
        // For synchronous methods
        if (result !== undefined && result !== null) {
          ErrorRecoveryService.registerGoodValue(componentName, dataType, result);
        }
        return result;
        
      } catch (error) {
        // Create context with method arguments
        const context = { args };
        
        // Handle error and recover
        const recovery = ErrorRecoveryService.handleError(
          error instanceof Error ? error : {
            code: 'METHOD_EXECUTION_ERROR',
            message: String(error),
            timestamp: Date.now(),
            severity: 'high',
            recoverable: true,
            component: componentName
          },
          componentName,
          dataType,
          {
            context,
            preferredStrategy: options?.strategy,
            logLevel: options?.logLevel
          }
        );
        
        if (recovery.successful) {
          return recovery.resultValue;
        } else {
          throw error; // Re-throw if recovery failed
        }
      }
    };
    
    return descriptor;
  };
}

// Singleton for accessing the service
export const errorRecovery = ErrorRecoveryService;
