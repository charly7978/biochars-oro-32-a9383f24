
/**
 * Utilidad centralizada para seguimiento y manejo de errores de cámara
 */
import { logError, ErrorLevel, CameraState, setCameraState as setGlobalCameraState } from './debugUtils';

interface DeviceErrorDetails {
  label?: string;
  deviceId?: string;
  errorType?: string;
  errorMessage?: string;
  timestamp?: number;
}

// Historial de errores de dispositivo
const deviceErrorHistory: Array<DeviceErrorDetails & { timestamp: number }> = [];
const maxHistorySize = 20;

// Contadores de tipos de errores
const errorTypeCounter: Record<string, number> = {};

/**
 * Exportar setCameraState de debugUtils para compatibilidad
 */
export const setCameraState = setGlobalCameraState;

/**
 * Re-exportar enum CameraState
 */
export { CameraState } from './debugUtils';

/**
 * Registra un error de dispositivo y proporciona recomendaciones
 */
export function handleCameraError(
  error: unknown, 
  deviceInfo?: { label?: string; deviceId?: string }
): {
  errorDetails: DeviceErrorDetails;
  shouldRetry: boolean;
  recoveryAction?: () => Promise<void>;
} {
  const now = Date.now();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.name : 'UnknownError';
  
  // Analizar tipo de error
  const isPermissionError = 
    errorMessage.includes('permission') || 
    errorMessage.includes('denied') || 
    errorType === 'NotAllowedError';
  
  const isNotFoundError = 
    errorMessage.includes('not found') || 
    errorType === 'NotFoundError' || 
    errorType === 'OverconstrainedError';
  
  const isTrackError = 
    errorMessage.includes('track') || 
    errorType === 'InvalidStateError';
  
  const isSecurityError = 
    errorMessage.includes('security') || 
    errorType === 'SecurityError';
  
  // Incrementar contador de tipo
  errorTypeCounter[errorType] = (errorTypeCounter[errorType] || 0) + 1;
  
  // Registrar error
  const errorDetails: DeviceErrorDetails = {
    label: deviceInfo?.label,
    deviceId: deviceInfo?.deviceId,
    errorType: errorType,
    errorMessage: errorMessage,
    timestamp: now
  };
  
  deviceErrorHistory.push({...errorDetails, timestamp: now});
  
  // Limitar tamaño del historial
  if (deviceErrorHistory.length > maxHistorySize) {
    deviceErrorHistory.shift();
  }
  
  // Nivel de log basado en tipo de error
  const logLevel = isPermissionError || isSecurityError 
    ? ErrorLevel.ERROR 
    : isNotFoundError 
      ? ErrorLevel.WARNING 
      : ErrorLevel.ERROR;
  
  logError(
    `Camera error (${errorType}): ${errorMessage}`, 
    logLevel, 
    "DeviceErrorTracker",
    { deviceInfo, errorCount: errorTypeCounter[errorType] }
  );
  
  // Establecer estado global de la cámara
  setGlobalCameraState(CameraState.ERROR);
  
  // Determinar si debemos reintentar
  let shouldRetry = !isPermissionError && !isSecurityError;
  
  // Limitar reintentos si hay muchos errores del mismo tipo
  if (errorTypeCounter[errorType] > 5) {
    shouldRetry = false;
    logError(
      `Too many camera errors of type ${errorType} (${errorTypeCounter[errorType]})`, 
      ErrorLevel.ERROR, 
      "DeviceErrorTracker"
    );
  }
  
  // Acción de recuperación
  let recoveryAction: (() => Promise<void>) | undefined;
  
  if (isTrackError || isNotFoundError) {
    recoveryAction = async () => {
      return new Promise<void>((resolve) => {
        logError("Executing camera recovery action", ErrorLevel.INFO, "DeviceErrorTracker");
        
        // Pequeña espera antes de reintentar
        setTimeout(() => {
          // La acción real de recuperación se definirá en el componente que llama a esta función
          resolve();
        }, 1000);
      });
    };
  }
  
  return {
    errorDetails,
    shouldRetry,
    recoveryAction
  };
}

/**
 * Obtiene el historial completo de errores
 */
export function getDeviceErrorHistory(): Array<DeviceErrorDetails & { timestamp: number }> {
  return [...deviceErrorHistory];
}

/**
 * Limpia el historial y contadores de errores
 */
export function clearDeviceErrorHistory(): void {
  deviceErrorHistory.length = 0;
  
  Object.keys(errorTypeCounter).forEach(key => {
    errorTypeCounter[key] = 0;
  });
  
  logError("Device error history cleared", ErrorLevel.INFO, "DeviceErrorTracker");
}
