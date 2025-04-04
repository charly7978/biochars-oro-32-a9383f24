
/**
 * Utilidades de depuración y logging centralizado
 * Mejora la capacidad de diagnóstico y rastreo de problemas
 */

// Niveles de error para categorización
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Estado de la cámara para seguimiento
export enum CameraState {
  INACTIVE = 'inactive',
  REQUESTING = 'requesting',
  ACTIVE = 'active',
  ERROR = 'error'
}

// Estructura para un mensaje de log
interface LogMessage {
  timestamp: number;
  level: ErrorLevel;
  message: string;
  source?: string;
  data?: any;
}

// Buffer circular para almacenar logs recientes
class LogBuffer {
  private buffer: LogMessage[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }
  
  public add(message: LogMessage): void {
    this.buffer.push(message);
    
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  public getAll(): LogMessage[] {
    return [...this.buffer];
  }
  
  public getByLevel(level: ErrorLevel): LogMessage[] {
    return this.buffer.filter(msg => msg.level === level);
  }
  
  public getBySource(source: string): LogMessage[] {
    return this.buffer.filter(msg => msg.source === source);
  }
  
  public clear(): void {
    this.buffer = [];
  }
}

// Singleton para logs globales
const globalLogBuffer = new LogBuffer(300);

// Configuración global
let consoleOutputEnabled = true;
let logLevel: ErrorLevel = ErrorLevel.INFO;
let verboseLogging = false;

/**
 * Inicializa el sistema de tracking de errores con opciones
 */
export function initializeErrorTracking(options: {
  verbose: boolean;
  setupGlobalHandlers: boolean;
}): void {
  verboseLogging = options.verbose;
  
  if (options.setupGlobalHandlers) {
    // Configurar manejadores globales
    window.addEventListener('error', (event) => {
      logError(
        `Unhandled error: ${event.message || 'Unknown error'} at ${event.filename}:${event.lineno}:${event.colno}`,
        ErrorLevel.ERROR,
        'GlobalErrorHandler',
        { error: event.error }
      );
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logError(
        `Unhandled promise rejection: ${event.reason}`,
        ErrorLevel.ERROR,
        'GlobalPromiseHandler',
        { reason: event.reason }
      );
    });
    
    console.log('Global error handlers initialized');
  }
}

/**
 * Configura si el logging debe ser detallado o no
 */
export function setVerboseLogging(enabled: boolean): void {
  verboseLogging = enabled;
  console.log(`Verbose logging ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Registra un mensaje en el sistema centralizado de logs
 */
export function logError(
  message: string,
  level: ErrorLevel = ErrorLevel.ERROR,
  source?: string,
  data?: any
): void {
  const logMessage: LogMessage = {
    timestamp: Date.now(),
    level,
    message,
    source,
    data
  };
  
  // Agregar al buffer
  globalLogBuffer.add(logMessage);
  
  // Salida a consola si está habilitado y nivel suficiente
  if (consoleOutputEnabled && isLevelLoggable(level)) {
    const formattedTime = new Date(logMessage.timestamp).toISOString();
    const prefix = source ? `[${source}]` : '';
    
    switch (level) {
      case ErrorLevel.DEBUG:
        console.debug(`${formattedTime} ${prefix} ${message}`, data || '');
        break;
      case ErrorLevel.INFO:
        console.info(`${formattedTime} ${prefix} ${message}`, data || '');
        break;
      case ErrorLevel.WARNING:
        console.warn(`${formattedTime} ${prefix} ${message}`, data || '');
        break;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        console.error(`${formattedTime} ${prefix} ${message}`, data || '');
        break;
    }
  }
}

/**
 * Verifica si un nivel de error debe ser mostrado según la configuración
 */
function isLevelLoggable(level: ErrorLevel): boolean {
  // Si el modo detallado está activado, mostrar todos los niveles
  if (verboseLogging) {
    return true;
  }
  
  const levels = [
    ErrorLevel.DEBUG,
    ErrorLevel.INFO,
    ErrorLevel.WARNING,
    ErrorLevel.ERROR,
    ErrorLevel.CRITICAL
  ];
  
  const configIndex = levels.indexOf(logLevel);
  const messageIndex = levels.indexOf(level);
  
  return messageIndex >= configIndex;
}

/**
 * Configura el nivel mínimo de log para mostrar en consola
 */
export function setLogLevel(level: ErrorLevel): void {
  logLevel = level;
}

/**
 * Habilita o deshabilita la salida a consola
 */
export function enableConsoleOutput(enabled: boolean): void {
  consoleOutputEnabled = enabled;
}

/**
 * Obtiene todos los logs almacenados
 */
export function getAllLogs(): LogMessage[] {
  return globalLogBuffer.getAll();
}

/**
 * Limpia el buffer de logs
 */
export function clearLogs(): void {
  globalLogBuffer.clear();
}

// Estado actual de la cámara
let currentCameraState: CameraState = CameraState.INACTIVE;
let cameraErrorHistory: Array<{timestamp: number, error: string}> = [];

/**
 * Actualiza el estado de la cámara
 */
export function setCameraState(state: CameraState): void {
  currentCameraState = state;
  
  logError(`Camera state changed to: ${state}`, 
    state === CameraState.ERROR ? ErrorLevel.ERROR : ErrorLevel.INFO, 
    "CameraStateTracker");
}

/**
 * Registra un error de dispositivo
 */
export function trackDeviceError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  cameraErrorHistory.push({
    timestamp: Date.now(),
    error: errorMessage
  });
  
  // Limitar historial
  if (cameraErrorHistory.length > 20) {
    cameraErrorHistory.shift();
  }
  
  logError(`Device error: ${errorMessage}`, ErrorLevel.ERROR, "DeviceErrorTracker");
}

/**
 * Obtiene el estado actual de la cámara
 */
export function getCameraState(): {
  state: CameraState;
  errors: typeof cameraErrorHistory;
} {
  return {
    state: currentCameraState,
    errors: [...cameraErrorHistory]
  };
}
