
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
