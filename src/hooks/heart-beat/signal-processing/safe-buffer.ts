
/**
 * Buffer seguro con validación de datos y manejo de errores
 * Encapsula el buffer optimizado con protecciones adicionales
 */
import { 
  OptimizedPPGBuffer, 
  CircularBufferAdapter 
} from './optimized-buffer';
import { 
  PPGDataPoint, 
  TimestampedPPGData, 
  SignalValidationResult,
  SignalDiagnosticInfo
} from '../../../types/signal';

/**
 * Simple signal validator interface
 */
interface SignalValidator {
  validatePPGDataPoint(point: any): SignalValidationResult;
}

/**
 * Simple error handler interface
 */
interface SignalProcessingErrorHandler {
  handleError(
    error: any, 
    componentName: string, 
    lastValidPoint?: any
  ): { shouldRetry: boolean; fallbackValue: any | null };
  registerGoodValue(componentName: string, value: any): void;
}

/**
 * Simple diagnostics interface
 */
interface SignalProcessingDiagnostics {
  recordDiagnosticInfo(info: SignalDiagnosticInfo): void;
}

/**
 * Create a simple validator
 */
function createSignalValidator(): SignalValidator {
  return {
    validatePPGDataPoint: (point: any): SignalValidationResult => {
      if (!point || typeof point !== 'object') {
        return {
          isValid: false,
          errorCode: 'INVALID_POINT',
          errorMessage: 'Invalid point object'
        };
      }
      
      if (typeof point.value !== 'number') {
        return {
          isValid: false,
          errorCode: 'MISSING_VALUE',
          errorMessage: 'Missing or invalid value field'
        };
      }
      
      return { isValid: true };
    }
  };
}

/**
 * Create a simple error handler
 */
function getErrorHandler(): SignalProcessingErrorHandler {
  const lastGoodValues: Record<string, any> = {};
  
  return {
    handleError: (error, componentName, lastValidPoint) => {
      console.warn(`Error in ${componentName}:`, error);
      
      return {
        shouldRetry: false,
        fallbackValue: lastValidPoint || lastGoodValues[componentName] || null
      };
    },
    registerGoodValue: (componentName, value) => {
      lastGoodValues[componentName] = value;
    }
  };
}

/**
 * Create a simple diagnostics service
 */
function getDiagnostics(): SignalProcessingDiagnostics {
  return {
    recordDiagnosticInfo: (info) => {
      // Just log to console in this simple implementation
      if (!info.validationPassed) {
        console.log('Signal processing diagnostic:', info);
      }
    }
  };
}

/**
 * SafeBuffer that adds validation and error handling
 * Compatible with the original interface for easy integration
 */
export class SafePPGBuffer<T extends TimestampedPPGData = TimestampedPPGData> {
  private buffer: OptimizedPPGBuffer<T>;
  private validator: SignalValidator;
  private errorHandler: SignalProcessingErrorHandler;
  private diagnostics: SignalProcessingDiagnostics;
  private componentName: string;
  private lastValidPoint: T | null = null;

  constructor(capacity: number, componentName = 'SafePPGBuffer') {
    // Initialize optimized buffer
    this.buffer = new OptimizedPPGBuffer<T>(capacity);
    
    // Initialize validation and error systems
    this.validator = createSignalValidator();
    this.errorHandler = getErrorHandler();
    this.diagnostics = getDiagnostics();
    this.componentName = componentName;
    
    console.log(`SafePPGBuffer initialized with capacity ${capacity}`);
  }

  /**
   * Add a point with validation
   */
  public push(item: T): void {
    try {
      // Ensure the point has all required properties
      const enhancedItem = { ...item } as T;
      
      // Ensure both time and timestamp exist
      if ('timestamp' in enhancedItem && !('time' in enhancedItem)) {
        (enhancedItem as any).time = enhancedItem.timestamp;
      } else if ('time' in enhancedItem && !('timestamp' in enhancedItem)) {
        (enhancedItem as any).timestamp = enhancedItem.time;
      }
      
      // Validate the point before adding it
      const validationStart = performance.now();
      const validationResult: SignalValidationResult = this.validator.validatePPGDataPoint(enhancedItem);
      const validationTimeMs = performance.now() - validationStart;
      
      // Record validation diagnostic
      this.diagnostics.recordDiagnosticInfo({
        processingStage: `${this.componentName}.validate`,
        validationPassed: validationResult.isValid,
        errorCode: validationResult.errorCode,
        errorMessage: validationResult.errorMessage,
        processingTimeMs: validationTimeMs
      });
      
      if (!validationResult.isValid) {
        // Handle validation error
        const error = {
          code: validationResult.errorCode || 'VALIDATION_ERROR',
          message: validationResult.errorMessage || 'Data validation failed',
          data: {
            item,
            validationResult
          }
        };
        
        const { shouldRetry, fallbackValue } = this.errorHandler.handleError(
          error, 
          this.componentName,
          this.lastValidPoint
        );
        
        if (shouldRetry) {
          // Do nothing, let the system continue operating
          return;
        } else if (fallbackValue) {
          // Use the last valid value
          this.buffer.push(fallbackValue);
          return;
        } else {
          // Don't add the invalid point
          return;
        }
      }
      
      // If validation passes, save as last valid point
      this.lastValidPoint = enhancedItem;
      
      // Register as good value for future fallbacks
      this.errorHandler.registerGoodValue(this.componentName, enhancedItem);
      
      // Add to buffer
      this.buffer.push(enhancedItem);
      
    } catch (error) {
      // Catch unexpected errors
      console.error(`SafePPGBuffer: Unexpected error in push operation:`, error);
      
      // Record error in the diagnostic system
      this.diagnostics.recordDiagnosticInfo({
        processingStage: `${this.componentName}.push`,
        validationPassed: false,
        errorCode: 'UNEXPECTED_ERROR',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get an element with error handling
   */
  public get(index: number): T | null {
    try {
      return this.buffer.get(index);
    } catch (error) {
      // Record error
      const processingError = {
        code: 'BUFFER_GET_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
      
      this.errorHandler.handleError(processingError, this.componentName);
      return null;
    }
  }

  /**
   * Get all points with error protection
   */
  public getPoints(): T[] {
    try {
      return this.buffer.getPoints();
    } catch (error) {
      const processingError = {
        code: 'BUFFER_GET_POINTS_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
      
      this.errorHandler.handleError(processingError, this.componentName);
      return [];
    }
  }

  /**
   * Clear the buffer
   */
  public clear(): void {
    try {
      this.buffer.clear();
      this.lastValidPoint = null;
    } catch (error) {
      console.error('Error clearing buffer:', error);
    }
  }

  /**
   * Current buffer size
   */
  public size(): number {
    return this.buffer.size();
  }

  /**
   * Check if the buffer is empty
   */
  public isEmpty(): boolean {
    return this.buffer.isEmpty();
  }

  /**
   * Check if the buffer is full
   */
  public isFull(): boolean {
    return this.buffer.isFull();
  }

  /**
   * Get the buffer capacity
   */
  public getCapacity(): number {
    return this.buffer.getCapacity();
  }

  /**
   * Get the buffer values
   */
  public getValues(): number[] {
    try {
      return this.buffer.getValues();
    } catch (error) {
      const processingError = {
        code: 'BUFFER_GET_VALUES_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
      
      this.errorHandler.handleError(processingError, this.componentName);
      return [];
    }
  }

  /**
   * Get the last N elements
   */
  public getLastN(n: number): T[] {
    try {
      return this.buffer.getLastN(n);
    } catch (error) {
      const processingError = {
        code: 'BUFFER_GET_LAST_N_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
      
      this.errorHandler.handleError(processingError, this.componentName);
      return [];
    }
  }

  /**
   * Get the internal optimized buffer
   */
  public getOptimizedBuffer(): OptimizedPPGBuffer<T> {
    return this.buffer;
  }
}

/**
 * Safe adapter compatible with CircularBuffer
 * Provides the same interface with additional protections
 */
export class SafeCircularBufferAdapter<T extends TimestampedPPGData = TimestampedPPGData> extends CircularBufferAdapter<T> {
  private safeBuffer: SafePPGBuffer<T>;
  
  constructor(capacity: number, componentName = 'SafeCircularBufferAdapter') {
    super(capacity);
    this.safeBuffer = new SafePPGBuffer<T>(capacity, componentName);
  }
  
  public override push(item: T): void {
    super.push(item);
    this.safeBuffer.push(item);
  }
  
  /**
   * Get the safe buffer
   */
  public getSafeBuffer(): SafePPGBuffer<T> {
    return this.safeBuffer;
  }
}

/**
 * Create a safe buffer from a circular buffer
 */
export function createSafeBuffer<U extends TimestampedPPGData>(
  capacity: number, 
  componentName?: string
): SafePPGBuffer<U> {
  return new SafePPGBuffer<U>(capacity, componentName);
}

/**
 * Create a safe circular buffer adapter
 */
export function createSafeCircularBufferAdapter<U extends TimestampedPPGData>(
  capacity: number,
  componentName?: string
): SafeCircularBufferAdapter<U> {
  return new SafeCircularBufferAdapter<U>(capacity, componentName);
}
