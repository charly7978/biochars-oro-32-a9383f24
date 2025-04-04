/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades de depuración y registro de errores
 * Soporte para registro y monitoreo en producción
 */

// Niveles de error
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Configuración de depuración
interface DebugConfig {
  verbose: boolean;
  logToConsole: boolean;
  setupGlobalHandlers: boolean;
  maxLogSize: number;
  applicationVersion?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

// Estructura para entrada de log
export interface LogEntry {
  timestamp: number;
  level: ErrorLevel;
  message: string;
  module?: string;
  details?: Record<string, any>;
}

// Estado global
const debugState = {
  isInitialized: false,
  config: {
    verbose: false,
    logToConsole: true,
    setupGlobalHandlers: false,
    maxLogSize: 1000,
    applicationVersion: '1.0.0'
  } as DebugConfig,
  logs: [] as LogEntry[],
  errorHandlers: [] as ((error: Error, info: any) => void)[],
  
  // Buffer específico para componentes de UI
  errorBuffer: [] as LogEntry[],
  maxBufferSize: 500
};

/**
 * Inicializa el sistema de seguimiento de errores
 */
export function initializeErrorTracking(config?: Partial<DebugConfig>): void {
  debugState.config = {
    ...debugState.config,
    ...config,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    deviceInfo: getDeviceInfo()
  };
  
  debugState.isInitialized = true;
  
  if (debugState.config.setupGlobalHandlers) {
    setupGlobalErrorHandlers();
  }
  
  logError(
    `Error tracking initialized with verbose=${debugState.config.verbose}`,
    ErrorLevel.INFO,
    'Debug'
  );
}

/**
 * Obtiene información sobre el dispositivo actual
 */
function getDeviceInfo(): Record<string, any> {
  if (typeof window === 'undefined') {
    return { environment: 'server' };
  }
  
  return {
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewportSize: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    language: navigator.language,
    platform: navigator.platform,
    hasWebGL: hasWebGL(),
    hasCameraSupport: 'mediaDevices' in navigator,
    pixelRatio: window.devicePixelRatio || 1,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: getConnectionInfo()
  };
}

/**
 * Verifica si el navegador soporta WebGL
 */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

/**
 * Obtiene información sobre la conexión del cliente
 */
function getConnectionInfo(): Record<string, any> {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { available: false };
  }
  
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return { available: false };
  }
  
  return {
    available: true,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
}

/**
 * Configura manejadores globales de errores
 */
function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Error de JavaScript
  window.onerror = (message, source, lineno, colno, error) => {
    logError(
      String(message), 
      ErrorLevel.ERROR, 
      'GlobalError',
      {
        source,
        lineno,
        colno,
        stack: error?.stack
      }
    );
    return false;
  };

  // Promesas no manejadas
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      `Unhandled promise rejection: ${event.reason}`,
      ErrorLevel.ERROR,
      'PromiseRejection',
      {
        reason: event.reason
      }
    );
  });

  // Error en recurso
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as any).tagName) {
      const target = event.target as HTMLElement;
      logError(
        `Resource error in ${target.tagName}`,
        ErrorLevel.WARNING,
        'ResourceError',
        {
          element: target.tagName,
          src: (target as any).src || (target as any).href
        }
      );
    }
  }, true);
}

/**
 * Registra un error o mensaje de depuración
 */
export function logError(
  message: string,
  level: ErrorLevel = ErrorLevel.ERROR,
  module?: string,
  details?: Record<string, any>
): void {
  if (!debugState.isInitialized) {
    initializeErrorTracking();
  }

  const logEntry: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
    module,
    details
  };
  
  // Agregar al registro principal
  debugState.logs.push(logEntry);
  
  // Agregar al buffer para componentes UI
  debugState.errorBuffer.push(logEntry);
  
  // Limitar tamaño de los registros
  if (debugState.logs.length > debugState.config.maxLogSize) {
    debugState.logs.shift();
  }
  
  if (debugState.errorBuffer.length > debugState.maxBufferSize) {
    debugState.errorBuffer.shift();
  }
  
  // Imprimir en consola si está habilitado
  if (debugState.config.logToConsole) {
    const logFn = level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL
      ? console.error
      : level === ErrorLevel.WARNING
        ? console.warn
        : level === ErrorLevel.INFO
          ? console.info
          : console.debug;
    
    const prefix = module ? `[${module}] ` : '';
    
    if (details) {
      logFn(`${prefix}${message}`, details);
    } else {
      logFn(`${prefix}${message}`);
    }
  }
  
  // Notificar a los manejadores registrados
  for (const handler of debugState.errorHandlers) {
    try {
      handler(new Error(message), { level, module, details });
    } catch (error) {
      console.error('Error in error handler:', error);
    }
  }
}

/**
 * Registra un manejador de errores externo
 */
export function registerErrorHandler(handler: (error: Error, info: any) => void): void {
  debugState.errorHandlers.push(handler);
}

/**
 * Obtiene los registros de error actuales
 */
export function getErrorLogs(
  filter?: {
    level?: ErrorLevel;
    module?: string;
    since?: number;
  }
): typeof debugState.logs {
  let logs = [...debugState.logs];
  
  if (filter) {
    if (filter.level) {
      const levelIndex = Object.values(ErrorLevel).indexOf(filter.level);
      logs = logs.filter(log => {
        const logLevelIndex = Object.values(ErrorLevel).indexOf(log.level);
        return logLevelIndex >= levelIndex;
      });
    }
    
    if (filter.module) {
      logs = logs.filter(log => log.module === filter.module);
    }
    
    if (filter.since) {
      logs = logs.filter(log => log.timestamp >= filter.since);
    }
  }
  
  return logs;
}

/**
 * Limpia el registro de errores
 */
export function clearErrorLogs(): void {
  debugState.logs = [];
}

/**
 * Obtiene el buffer de errores para componentes UI
 */
export function getErrorBuffer(
  filter?: {
    level?: ErrorLevel;
    module?: string;
    since?: number;
  }
): LogEntry[] {
  let entries = [...debugState.errorBuffer];
  
  if (filter) {
    if (filter.level) {
      const levelIndex = Object.values(ErrorLevel).indexOf(filter.level);
      entries = entries.filter(entry => {
        const entryLevelIndex = Object.values(ErrorLevel).indexOf(entry.level);
        return entryLevelIndex >= levelIndex;
      });
    }
    
    if (filter.module) {
      entries = entries.filter(entry => entry.module === filter.module);
    }
    
    if (filter.since) {
      entries = entries.filter(entry => entry.timestamp >= filter.since);
    }
  }
  
  return entries;
}

/**
 * Limpia el buffer de errores para componentes UI
 */
export function clearErrorBuffer(): void {
  debugState.errorBuffer = [];
}

/**
 * Detecta referencias circulares en objetos
 */
export function detectCircular(obj: any, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  if (seen.has(obj)) return true;
  
  seen.add(obj);
  
  for (const key of Object.keys(obj)) {
    if (detectCircular(obj[key], seen)) return true;
  }
  
  return false;
}

/**
 * Stringifica objetos de forma segura, evitando referencias circulares
 */
export function safeStringify(obj: any, space: number | string = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}
