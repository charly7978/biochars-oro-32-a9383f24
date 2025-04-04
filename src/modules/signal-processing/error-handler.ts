/**
 * Error handling for signal processing
 */
import { ProcessingError, ErrorHandlerConfig } from './types-unified';

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  logErrors: true,
  retryOnError: true,
  maxRetries: 3,
  notifyUser: true,
  fallbackToLastGoodValue: true
};

/**
 * Error handler for signal processing
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private retryCount: Record<string, number> = {}; // Track retries by error code
  private lastGoodValues: Record<string, any> = {}; // Store last good values by component
  private errorLog: ProcessingError[] = [];
  
  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {...DEFAULT_CONFIG, ...config};
  }
  
  /**
   * Handle an error during signal processing
   */
  handleError(
    error: Partial<ProcessingError> & {code: string, message: string}, 
    componentName?: string
  ): {
    shouldRetry: boolean,
    fallbackValue?: any
  } {
    const errorWithDefaults: ProcessingError = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp || Date.now(),
      severity: error.severity || 'medium',
      recoverable: error.recoverable !== undefined ? error.recoverable : true,
      component: componentName || error.component,
      suggestions: error.suggestions || []
    };
    
    // Log error if configured to do so
    if (this.config.logErrors) {
      console.error(`Signal Processing Error [${errorWithDefaults.code}]: ${errorWithDefaults.message}`, errorWithDefaults);
      this.errorLog.push(errorWithDefaults);
      
      // Keep error log size reasonable
      if (this.errorLog.length > 100) {
        this.errorLog = this.errorLog.slice(-100);
      }
    }
    
    // Initialize retry count if needed
    const errorKey = `${errorWithDefaults.component || 'unknown'}-${errorWithDefaults.code}`;
    if (this.retryCount[errorKey] === undefined) {
      this.retryCount[errorKey] = 0;
    }
    
    // Check if we should retry
    let shouldRetry = false;
    if (this.config.retryOnError && errorWithDefaults.recoverable) {
      if (this.retryCount[errorKey] < this.config.maxRetries) {
        shouldRetry = true;
        this.retryCount[errorKey]++;
      }
    }
    
    // Return result with fallback value if available
    const result: { shouldRetry: boolean, fallbackValue?: any } = { shouldRetry };
    
    if (this.config.fallbackToLastGoodValue && errorWithDefaults.component && 
        this.lastGoodValues[errorWithDefaults.component] !== undefined) {
      result.fallbackValue = this.lastGoodValues[errorWithDefaults.component];
    }
    
    return result;
  }
  
  /**
   * Store a good value that can be used as fallback
   */
  storeGoodValue(componentName: string, value: any): void {
    this.lastGoodValues[componentName] = value;
  }
  
  /**
   * Reset retry counts
   */
  resetRetries(componentName?: string): void {
    if (componentName) {
      // Reset retries only for specific component
      Object.keys(this.retryCount).forEach(key => {
        if (key.startsWith(`${componentName}-`)) {
          this.retryCount[key] = 0;
        }
      });
    } else {
      // Reset all retries
      this.retryCount = {};
    }
  }
  
  /**
   * Get error log
   */
  getErrorLog(): ProcessingError[] {
    return [...this.errorLog];
  }
  
  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = {...this.config, ...config};
  }
}

/**
 * Singleton instance for app-wide use
 */
let errorHandlerInstance: ErrorHandler | null = null;

/**
 * Get the singleton error handler instance
 */
export function getErrorHandler(): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  
  return errorHandlerInstance;
}

/**
 * Create a new error handler with custom configuration
 */
export function createErrorHandler(config: Partial<ErrorHandlerConfig> = {}): ErrorHandler {
  return new ErrorHandler(config);
}
