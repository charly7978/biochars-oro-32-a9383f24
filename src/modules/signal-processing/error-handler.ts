
/**
 * Error handling for signal processing
 */
import { ProcessingError, ErrorHandlerConfig } from '../../types/signal';

export class SignalProcessingErrorHandler {
  private config: ErrorHandlerConfig;
  private errors: ProcessingError[] = [];
  private lastGoodValues: Map<string, any> = new Map();
  private retryCount: Map<string, number> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    const defaultConfig: ErrorHandlerConfig = {
      logErrors: true,
      retryOnError: true,
      maxRetries: 3,
      notifyUser: false,
      fallbackToLastGoodValue: true
    };
    
    this.config = { ...defaultConfig, ...config };
  }

  handleError(error: ProcessingError, component?: string, fallbackValue?: any): { 
    shouldRetry: boolean, 
    fallbackValue: any | null 
  } {
    // Add component information if provided
    if (component) {
      error.component = component;
    }
    
    // Log error if enabled
    if (this.config.logErrors) {
      console.error(`Signal Processing Error [${error.code}]: ${error.message}`, error);
    }
    
    // Store error
    this.errors.push(error);
    
    // Check if we should retry
    let shouldRetry = false;
    if (this.config.retryOnError && error.recoverable !== false) {
      const currentRetryCount = this.retryCount.get(error.code) || 0;
      if (currentRetryCount < this.config.maxRetries) {
        this.retryCount.set(error.code, currentRetryCount + 1);
        shouldRetry = true;
      }
    }
    
    // Get fallback value
    let returnFallbackValue = null;
    if (this.config.fallbackToLastGoodValue) {
      // Use provided fallback value first
      if (fallbackValue !== undefined) {
        returnFallbackValue = fallbackValue;
      } 
      // Then try component-specific last good value
      else if (component && this.lastGoodValues.has(component)) {
        returnFallbackValue = this.lastGoodValues.get(component);
      }
    }
    
    return { shouldRetry, fallbackValue: returnFallbackValue };
  }

  registerGoodValue(component: string, value: any): void {
    this.lastGoodValues.set(component, value);
    // Reset retry count for this component since we have a good value
    this.retryCount.set(component, 0);
  }

  getErrors(): ProcessingError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getLastError(): ProcessingError | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
  }
}

// Singleton instance for app-wide use
let errorHandlerInstance: SignalProcessingErrorHandler | null = null;

export function getErrorHandler(config?: Partial<ErrorHandlerConfig>): SignalProcessingErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new SignalProcessingErrorHandler(config);
  } else if (config) {
    // Update config if provided
    errorHandlerInstance = new SignalProcessingErrorHandler(config);
  }
  
  return errorHandlerInstance;
}
