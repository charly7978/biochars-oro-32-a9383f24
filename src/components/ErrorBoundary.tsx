
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorMonitor, ErrorSeverity, ErrorSource } from '../modules/guardian-shield/error-monitor';
import { errorRecovery, RecoveryStrategy } from '../modules/guardian-shield/error-recovery-service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for catching and handling React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName, onError } = this.props;
    
    // Report error to monitor
    errorMonitor.reportError(error, ErrorSource.SYSTEM, {
      severity: ErrorSeverity.HIGH,
      componentName: componentName || 'ErrorBoundary',
      context: { errorInfo }
    });
    
    // Set error info in state
    this.setState({ errorInfo });
    
    // Call onError callback if provided
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Log error
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }
  
  /**
   * Reset the error state
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetErrorBoundary);
        }
        return fallback;
      }
      
      // Default fallback UI
      return (
        <div className="error-boundary p-4 bg-red-50 border border-red-300 rounded-md">
          <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
          <p className="text-red-600 mt-1">{error.toString()}</p>
          <button 
            className="mt-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            onClick={this.resetErrorBoundary}
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<Props, 'children'> = {}
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const WrappedComponent: React.FC<P> = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} componentName={displayName}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  
  return WrappedComponent;
}

/**
 * Custom hook that provides error reporting functionality
 */
export function useErrorHandler() {
  return {
    reportError: (error: Error | unknown, componentName: string) => {
      const errorObject = error instanceof Error ? error : new Error(String(error));
      
      // Report to error monitor
      errorMonitor.reportError(errorObject, ErrorSource.SYSTEM, {
        severity: ErrorSeverity.MEDIUM,
        componentName
      });
      
      console.error(`Error in ${componentName}:`, errorObject);
      
      // Return the error for further processing if needed
      return errorObject;
    },
    
    withRecovery: async <T,>(
      promise: Promise<T>, 
      componentName: string,
      dataType: string,
      fallbackValue?: T
    ): Promise<T> => {
      try {
        return await promise;
      } catch (error) {
        // Report error
        errorMonitor.reportError(error, ErrorSource.SYSTEM, {
          severity: ErrorSeverity.MEDIUM,
          componentName,
          recoveryInfo: {
            attempted: true,
            successful: false
          }
        });
        
        // Try to recover
        const recovery = errorRecovery.handleError(
          error instanceof Error ? error : {
            code: 'PROMISE_ERROR',
            message: String(error),
            timestamp: Date.now(),
            severity: 'medium',
            recoverable: true,
            component: componentName
          },
          componentName,
          dataType,
          {
            preferredStrategy: fallbackValue !== undefined 
              ? RecoveryStrategy.USE_DEFAULT_VALUE 
              : RecoveryStrategy.USE_LAST_GOOD_VALUE,
            context: { fallbackValue }
          }
        );
        
        if (recovery.successful) {
          // Update recovery success info
          errorMonitor.reportError(error, ErrorSource.SYSTEM, {
            severity: ErrorSeverity.MEDIUM,
            componentName,
            recoveryInfo: {
              attempted: true,
              successful: true,
              strategy: RecoveryStrategy[recovery.strategy]
            }
          });
          
          return recovery.resultValue || fallbackValue as T;
        }
        
        // Re-throw if recovery failed and no fallback
        if (fallbackValue === undefined) {
          throw error;
        }
        
        return fallbackValue;
      }
    }
  };
}
