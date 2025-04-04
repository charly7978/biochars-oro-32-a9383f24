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
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Registra un error o mensaje de depuración
 */
export function logError(
  message: string, 
  level: ErrorLevel = ErrorLevel.ERROR, 
  context: string = 'General'
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
      console.warn(`[${context}] ${message}`);
      break;
    case ErrorLevel.FATAL:
      console.error(`[FATAL] [${context}] ${message}`);
      break;
    case ErrorLevel.ERROR:
    default:
      console.error(`[${context}] ${message}`);
      break;
  }
}

// Exportar otras utilidades de depuración según sea necesario
