
/**
 * Utilidad para seguimiento de errores de dispositivo
 */

// Buffer de errores del dispositivo
const deviceErrors: Array<{
  timestamp: number;
  type: string;
  message: string;
  source?: string;
  extra?: Record<string, any>;
}> = [];

// Límite del buffer
const MAX_DEVICE_ERRORS = 50;

// Camera state enum for tracking camera status
export enum CameraState {
  INACTIVE = 'inactive',
  REQUESTING = 'requesting',
  ACTIVE = 'active',
  ERROR = 'error'
}

// Current camera state
let currentCameraState: CameraState = CameraState.INACTIVE;

/**
 * Set the current camera state
 */
export function setCameraState(state: CameraState): void {
  const previousState = currentCameraState;
  currentCameraState = state;
  
  if (previousState !== state) {
    console.log(`Camera state changed: ${previousState} -> ${state}`);
  }
}

/**
 * Get the current camera state
 */
export function getCameraState(): CameraState {
  return currentCameraState;
}

/**
 * Handle camera errors with recovery options
 */
export function handleCameraError(error: Error, deviceInfo?: { label?: string, deviceId?: string }): {
  errorDetails: string;
  shouldRetry: boolean;
  recoveryAction?: () => Promise<void>;
} {
  // Track error
  trackDeviceError(error, 'camera', 'CameraOperation', deviceInfo);
  
  const errorMessage = error.message || String(error);
  let shouldRetry = false;
  let recoveryAction = undefined;
  
  // Determine if we should retry based on error type
  if (
    errorMessage.includes('Permission') || 
    errorMessage.includes('denied') ||
    errorMessage.includes('not allowed')
  ) {
    shouldRetry = true;
    recoveryAction = async () => {
      // Simple recovery action to request permission again
      trackDeviceError('Attempting to recover camera permissions', 'recovery', 'CameraOperation');
    };
  } else if (
    errorMessage.includes('disconnected') || 
    errorMessage.includes('unavailable') ||
    errorMessage.includes('in use')
  ) {
    shouldRetry = true;
    recoveryAction = async () => {
      // Wait a bit and try again for device unavailable
      await new Promise(resolve => setTimeout(resolve, 2000));
      trackDeviceError('Attempting to recover from device unavailable', 'recovery', 'CameraOperation');
    };
  }
  
  return {
    errorDetails: errorMessage,
    shouldRetry,
    recoveryAction
  };
}

/**
 * Registra un error de dispositivo
 */
export function trackDeviceError(error: string | Event | Error, type: string = 'generic', source?: string, extra?: Record<string, any>): void {
  let errorMessage: string;
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = `${error.name}: ${error.message}`;
    if (!extra && 'stack' in error) {
      extra = { stack: error.stack };
    }
  } else if (error instanceof Event) {
    errorMessage = `Event: ${error.type}`;
    extra = { ...extra, eventDetail: error };
  } else {
    errorMessage = String(error);
  }
  
  deviceErrors.push({
    timestamp: Date.now(),
    type,
    message: errorMessage,
    source,
    extra
  });
  
  // Eliminar errores antiguos si excede el tamaño máximo
  if (deviceErrors.length > MAX_DEVICE_ERRORS) {
    deviceErrors.shift();
  }
  
  // Registrar en consola
  console.error(`[${type}] ${source ? `(${source}) ` : ''}${errorMessage}`);
}

/**
 * Obtiene el historial de errores del dispositivo
 */
export function getDeviceErrors(): typeof deviceErrors {
  return [...deviceErrors];
}

/**
 * Limpia el historial de errores del dispositivo
 */
export function clearDeviceErrors(): void {
  deviceErrors.length = 0;
}

export default { trackDeviceError, getDeviceErrors, clearDeviceErrors, CameraState, setCameraState, getCameraState, handleCameraError };
