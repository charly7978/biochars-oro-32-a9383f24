
/**
 * Error handling for signal processing
 */
import { ProcessingError } from '../../types/signal';

/**
 * Configuration for error handler
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  throwOnCritical: boolean;
  retryOnError: boolean;
  maxRetries: number;
  fallbackToLastGoodValue: boolean;
}

/**
 * Default error handler configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  logErrors: true,
  throwOnCritical: true,
  retryOnError: true,
  maxRetries: 3,
  fallbackToLastGoodValue: true
};

/**
 * Store of last good values by component
 */
const lastGoodValues: Record<string, any> = {};

/**
 * Retry counters by error code
 */
const retryCounters: Record<string, number> = {};

/**
 * Error handling for signal processing
 */
export function handleProcessingError(
  error: ProcessingError,
  componentName: string,
  fallbackValue?: any
): { shouldRetry: boolean, fallbackValue: any | null } {
  // Get error code for tracking
  const errorCode = `${componentName}:${error.code}`;
  
  // Initialize retry counter if needed
  if (!retryCounters[errorCode]) {
    retryCounters[errorCode] = 0;
  }
  
  // Increment retry counter
  retryCounters[errorCode]++;
  
  // Check if we exceeded max retries
  const shouldRetry = DEFAULT_ERROR_CONFIG.retryOnError && 
                      retryCounters[errorCode] <= DEFAULT_ERROR_CONFIG.maxRetries;
  
  // Log error if configured
  if (DEFAULT_ERROR_CONFIG.logErrors) {
    console.error(`Signal processing error in ${componentName}:`, error, {
      retryCount: retryCounters[errorCode],
      shouldRetry,
      hasFallback: !!lastGoodValues[componentName]
    });
  }
  
  // Handle critical errors
  if (error.severity === 'critical' && DEFAULT_ERROR_CONFIG.throwOnCritical) {
    throw new Error(`Critical signal processing error: ${error.message}`);
  }
  
  // Return appropriate action
  return {
    shouldRetry,
    fallbackValue: DEFAULT_ERROR_CONFIG.fallbackToLastGoodValue ? 
      (fallbackValue || lastGoodValues[componentName] || null) : null
  };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: ProcessingError): boolean {
  return error.recoverable || 
         error.severity === 'low' || 
         error.severity === 'medium';
}

/**
 * Register a good value for a component
 */
export function registerGoodValue(componentName: string, value: any): void {
  lastGoodValues[componentName] = value;
}

/**
 * Reset error counters
 */
export function resetErrorCounters(): void {
  for (const key in retryCounters) {
    retryCounters[key] = 0;
  }
}

/**
 * Error handler interface
 */
export interface SignalProcessingErrorHandler {
  handleError: (
    error: ProcessingError, 
    componentName: string, 
    fallbackValue?: any
  ) => { shouldRetry: boolean, fallbackValue: any | null };
  
  isRecoverableError: (error: ProcessingError) => boolean;
  registerGoodValue: (componentName: string, value: any) => void;
  resetErrorCounters: () => void;
  getConfig: () => ErrorHandlerConfig;
  setConfig: (config: Partial<ErrorHandlerConfig>) => void;
}

/**
 * Get an error handler instance
 */
export function getErrorHandler(): SignalProcessingErrorHandler {
  let config = { ...DEFAULT_ERROR_CONFIG };
  
  return {
    handleError: (error, componentName, fallbackValue) => 
      handleProcessingError(error, componentName, fallbackValue),
    isRecoverableError,
    registerGoodValue,
    resetErrorCounters,
    getConfig: () => ({ ...config }),
    setConfig: (newConfig) => {
      config = { ...config, ...newConfig };
    }
  };
}
