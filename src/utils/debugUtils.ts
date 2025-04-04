
/**
 * Utilidades para depuración y manejo de errores
 */

/**
 * Niveles de error para logging
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  WARNING = 'warning',  // Add WARNING as an alias to WARN for backward compatibility
  ERROR = 'error',
  FATAL = 'fatal',
  CRITICAL = 'critical'  // Add CRITICAL as an alias to FATAL for backward compatibility
}

/**
 * Registra un error o mensaje de depuración
 */
export function logError(
  message: string, 
  level: ErrorLevel = ErrorLevel.ERROR, 
  context: string = 'General',
  metadata?: any
): void {
  // Determinar el método de console a usar según nivel
  switch (level) {
    case ErrorLevel.DEBUG:
      console.debug(`[${context}] ${message}`);
      break;
    case ErrorLevel.INFO:
      console.info(`[${context}] ${message}`);
      break;
    case ErrorLevel.WARN:
    case ErrorLevel.WARNING:
      console.warn(`[${context}] ${message}`);
      break;
    case ErrorLevel.FATAL:
    case ErrorLevel.CRITICAL:
      console.error(`[FATAL] [${context}] ${message}`);
      break;
    case ErrorLevel.ERROR:
    default:
      console.error(`[${context}] ${message}`);
      break;
  }
}

// Helper functions for error buffer management
export function getErrorBuffer() {
  return [];
}

export function clearErrorBuffer() {
  // Implementation to clear error buffer
}

export function setVerboseLogging(enabled: boolean) {
  // Implementation to set verbose logging
}

// Function to detect circular references
export function detectCircular(obj: any): boolean {
  return false;
}

// Function to safely stringify objects with circular references
export function safeStringify(obj: any): string {
  return JSON.stringify(obj);
}

// Function to initialize error tracking
export function initializeErrorTracking() {
  // Implementation to initialize error tracking
}
