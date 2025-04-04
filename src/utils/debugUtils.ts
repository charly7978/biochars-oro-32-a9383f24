
/**
 * Utilidades de depuración para toda la aplicación
 */

export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  WARNING = 'warning', // Adding WARNING as an alias for WARN for backward compatibility
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ErrorTrackingConfig {
  verbose?: boolean;
  setupGlobalHandlers?: boolean;
  logToConsole?: boolean;
  maxLogSize?: number;
  applicationVersion?: string;
}

export interface LogEntry {
  message: string;
  level: ErrorLevel;
  timestamp: number;
  moduleId?: string;
  module?: string; // Adding for backward compatibility
  source?: string;
  data?: any;
  stack?: string;
}

let errorLogs: LogEntry[] = [];
let errorBuffer: LogEntry[] = []; // Added separate buffer for buffered logs
let isVerboseLogging = false;
let maxLogSize = 1000;
let maxBufferSize = 500; // Setting a default buffer size
let errorHandlers: Function[] = [];

/**
 * Inicializa el sistema de seguimiento de errores
 */
export function initializeErrorTracking(config: ErrorTrackingConfig = {}): void {
  isVerboseLogging = config.verbose || false;
  maxLogSize = config.maxLogSize || 1000;
  
  // Configurar manejadores globales si se solicita
  if (config.setupGlobalHandlers) {
    setupGlobalHandlers();
  }
  
  logError(
    `Sistema de seguimiento inicializado, verbose: ${isVerboseLogging}`,
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Configura el modo verbose de logging
 */
export function setVerboseLogging(verbose: boolean): void {
  isVerboseLogging = verbose;
  logError(
    `Verbose logging ${verbose ? 'activado' : 'desactivado'}`,
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Registra un error en el sistema
 */
export function logError(
  message: string,
  level: ErrorLevel = ErrorLevel.ERROR,
  moduleId?: string,
  data?: any
): void {
  // Solo registrar mensajes de depuración si el modo verbose está activo
  if (level === ErrorLevel.DEBUG && !isVerboseLogging) {
    return;
  }
  
  const logEntry: LogEntry = {
    message,
    level,
    timestamp: Date.now(),
    moduleId,
    module: moduleId, // For backward compatibility
    source: getCallSource(),
    data,
    stack: new Error().stack
  };
  
  // Agregar al registro
  errorLogs.push(logEntry);
  
  // Also add to buffer for components that use the buffer
  errorBuffer.push(logEntry);
  
  // Limitar tamaño del registro
  if (errorLogs.length > maxLogSize) {
    errorLogs.shift();
  }
  
  // Limit buffer size
  if (errorBuffer.length > maxBufferSize) {
    errorBuffer.shift();
  }
  
  // Notificar a manejadores de errores
  if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
    notifyErrorHandlers(logEntry);
  }
  
  // Mostrar en consola si está configurado
  if (shouldLogToConsole(level)) {
    logToConsole(logEntry);
  }
}

/**
 * Get logs from the error buffer
 */
export function getErrorBuffer(): LogEntry[] {
  return [...errorBuffer];
}

/**
 * Clear the error buffer
 */
export function clearErrorBuffer(): void {
  errorBuffer = [];
  logError(
    'Error buffer cleared',
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Determina si un nivel de error debe mostrarse en consola
 */
function shouldLogToConsole(level: ErrorLevel): boolean {
  // Siempre mostrar errores y críticos
  if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
    return true;
  }
  
  // Para otros niveles, solo mostrar si verbose está activo
  return isVerboseLogging;
}

/**
 * Registra una entrada en la consola
 */
function logToConsole(entry: LogEntry): void {
  const timestamp = new Date(entry.timestamp).toISOString();
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]${entry.moduleId ? ` [${entry.moduleId}]` : ''}`;
  
  switch (entry.level) {
    case ErrorLevel.DEBUG:
      console.debug(`${prefix} ${entry.message}`, entry.data || '');
      break;
    case ErrorLevel.INFO:
      console.info(`${prefix} ${entry.message}`, entry.data || '');
      break;
    case ErrorLevel.WARN:
      console.warn(`${prefix} ${entry.message}`, entry.data || '');
      break;
    case ErrorLevel.ERROR:
    case ErrorLevel.CRITICAL:
      console.error(`${prefix} ${entry.message}`, entry.data || '');
      if (entry.stack) {
        console.error(entry.stack);
      }
      break;
  }
}

/**
 * Obtiene la fuente de la llamada
 */
function getCallSource(): string {
  try {
    const err = new Error();
    const stack = err.stack || '';
    const stackLines = stack.split('\n');
    
    // Buscar la primera línea que no sea de este archivo
    const relevantLine = stackLines.find(line => !line.includes('debugUtils.ts'));
    
    if (relevantLine) {
      // Extraer información relevante
      const match = relevantLine.match(/\s+at\s+([^\s]+)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        const [_, functionName, filePath, line, column] = match;
        const filePathParts = filePath.split('/');
        const fileName = filePathParts[filePathParts.length - 1];
        return `${functionName} (${fileName}:${line})`;
      }
    }
    
    return 'unknown';
  } catch (e) {
    return 'error-getting-source';
  }
}

/**
 * Configura manejadores globales para errores no capturados
 */
function setupGlobalHandlers(): void {
  // Manejador de errores no capturados
  window.addEventListener('error', (event) => {
    logError(
      `Error no capturado: ${event.message}`,
      ErrorLevel.ERROR,
      'GlobalHandler',
      { 
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }
    );
  });
  
  // Manejador de promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason ? (event.reason.toString ? event.reason.toString() : JSON.stringify(event.reason)) : 'Unknown reason';
    logError(
      `Promesa rechazada no capturada: ${reason}`,
      ErrorLevel.ERROR,
      'GlobalHandler',
      { reason: event.reason }
    );
  });
  
  logError(
    'Manejadores globales de errores configurados',
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Registra un manejador de errores
 */
export function registerErrorHandler(handler: Function): void {
  errorHandlers.push(handler);
  logError(
    `Nuevo manejador de errores registrado. Total: ${errorHandlers.length}`,
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Notifica a todos los manejadores de errores
 */
function notifyErrorHandlers(entry: LogEntry): void {
  errorHandlers.forEach(handler => {
    try {
      handler(entry);
    } catch (e) {
      console.error('Error en manejador de errores:', e);
    }
  });
}

/**
 * Obtiene todos los registros de errores
 */
export function getErrorLogs(): LogEntry[] {
  return [...errorLogs];
}

/**
 * Obtiene los registros filtrados por nivel
 */
export function getFilteredErrorLogs(level?: ErrorLevel): LogEntry[] {
  if (!level) {
    return [...errorLogs];
  }
  
  return errorLogs.filter(entry => entry.level === level);
}

/**
 * Limpia todos los registros de errores
 */
export function clearErrorLogs(): void {
  errorLogs = [];
  logError(
    'Registros de error limpiados',
    ErrorLevel.INFO,
    'ErrorTracking'
  );
}

/**
 * Detecta referencias circulares en un objeto
 */
export function detectCircular(obj: any, seen = new WeakSet()): boolean {
  // Valores primitivos no tienen referencias circulares
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  // Si ya hemos visto este objeto, es circular
  if (seen.has(obj)) {
    return true;
  }
  
  // Agregar este objeto a los vistos
  seen.add(obj);
  
  // Verificar en propiedades
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (detectCircular(obj[key], seen)) {
        return true;
      }
    }
  }
  
  // Verificar en arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (detectCircular(item, seen)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Convierte un objeto a JSON, manejando referencias circulares
 */
export function safeStringify(obj: any, space?: number): string {
  try {
    const cache = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        cache.add(value);
      }
      return value;
    }, space);
  } catch (e) {
    return `[Error al convertir objeto: ${e}]`;
  }
}
