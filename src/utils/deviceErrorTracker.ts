/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidad para seguimiento específico de errores de cámara y dispositivo
 */

import { logError, ErrorLevel } from './debugUtils';
import { registerApplicationError } from './errorPrevention';

// Types of known device errors
export enum DeviceErrorType {
  CAMERA_NOT_FOUND = 'camera_not_found',
  CAMERA_IN_USE = 'camera_in_use',
  CAMERA_PERMISSION_DENIED = 'camera_permission_denied',
  CAMERA_TRACK_ENDED = 'camera_track_ended',
  INVALID_TRACK_STATE = 'invalid_track_state',
  TORCH_NOT_AVAILABLE = 'torch_not_available',
  CAPTURE_ERROR = 'capture_error',
  ORIENTATION_LOCK_FAILED = 'orientation_lock_failed',
  FULLSCREEN_ERROR = 'fullscreen_error',
  OTHER = 'other'
}

// Camera states
export enum CameraState {
  INACTIVE = 'inactive',
  REQUESTING = 'requesting',
  ACTIVE = 'active',
  ERROR = 'error'
}

// Interface for device error details
interface DeviceErrorDetails {
  type: DeviceErrorType;
  message: string;
  originalError?: Error | DOMException | unknown;
  deviceInfo?: {
    deviceId?: string;
    label?: string;
    facingMode?: string;
  };
  timestamp: number;
  retryCount: number;
}

// Store error history
const deviceErrorHistory: DeviceErrorDetails[] = [];
const MAX_HISTORY_SIZE = 20;

// Track current camera state
let currentCameraState: CameraState = CameraState.INACTIVE;
let cameraRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Get error type from error message or object
 */
function determineErrorType(error: Error | DOMException | unknown): DeviceErrorType {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : '';
  
  if (errorName === 'NotFoundError' || errorMsg.includes('not found') || errorMsg.includes('No camera available')) {
    return DeviceErrorType.CAMERA_NOT_FOUND;
  } else if (errorName === 'NotAllowedError' || errorMsg.includes('Permission denied')) {
    return DeviceErrorType.CAMERA_PERMISSION_DENIED;
  } else if (errorName === 'NotReadableError' || errorMsg.includes('in use') || errorMsg.includes('already in use')) {
    return DeviceErrorType.CAMERA_IN_USE;
  } else if (errorMsg.includes('Track ended') || errorMsg.includes('ended unexpectedly')) {
    return DeviceErrorType.CAMERA_TRACK_ENDED;
  } else if (errorName === 'InvalidStateError' || errorMsg.includes('invalid state')) {
    return DeviceErrorType.INVALID_TRACK_STATE;
  } else if (errorMsg.includes('torch') || errorMsg.includes('light')) {
    return DeviceErrorType.TORCH_NOT_AVAILABLE;
  } else if (errorMsg.includes('capture') || errorMsg.includes('grabFrame')) {
    return DeviceErrorType.CAPTURE_ERROR;
  } else if (errorMsg.includes('orientation') || errorMsg.includes('lock')) {
    return DeviceErrorType.ORIENTATION_LOCK_FAILED;
  } else if (errorMsg.includes('fullscreen')) {
    return DeviceErrorType.FULLSCREEN_ERROR;
  }
  
  return DeviceErrorType.OTHER;
}

/**
 * Get a user-friendly error message based on error type
 */
export function getErrorMessage(type: DeviceErrorType): string {
  switch (type) {
    case DeviceErrorType.CAMERA_NOT_FOUND:
      return 'No se pudo encontrar una cámara en el dispositivo';
    case DeviceErrorType.CAMERA_PERMISSION_DENIED:
      return 'Permiso de cámara denegado. Por favor, habilita los permisos de cámara';
    case DeviceErrorType.CAMERA_IN_USE:
      return 'La cámara está siendo utilizada por otra aplicación';
    case DeviceErrorType.CAMERA_TRACK_ENDED:
      return 'La conexión con la cámara se ha interrumpido';
    case DeviceErrorType.INVALID_TRACK_STATE:
      return 'La cámara está en un estado no válido';
    case DeviceErrorType.TORCH_NOT_AVAILABLE:
      return 'El flash no está disponible en este dispositivo';
    case DeviceErrorType.CAPTURE_ERROR:
      return 'Error al capturar imagen de la cámara';
    case DeviceErrorType.ORIENTATION_LOCK_FAILED:
      return 'No se pudo bloquear la orientación de la pantalla';
    case DeviceErrorType.FULLSCREEN_ERROR:
      return 'No se pudo activar el modo de pantalla completa';
    default:
      return 'Error desconocido con el dispositivo';
  }
}

/**
 * Track a camera or device error
 */
export function trackDeviceError(
  error: Error | DOMException | unknown,
  deviceInfo?: DeviceErrorDetails['deviceInfo']
): DeviceErrorDetails {
  const errorType = determineErrorType(error);
  const errorMessage = getErrorMessage(errorType);
  
  // Create error details
  const errorDetails: DeviceErrorDetails = {
    type: errorType,
    message: errorMessage,
    originalError: error,
    deviceInfo,
    timestamp: Date.now(),
    retryCount: cameraRetryCount
  };
  
  // Add to history
  deviceErrorHistory.unshift(errorDetails);
  if (deviceErrorHistory.length > MAX_HISTORY_SIZE) {
    deviceErrorHistory.pop();
  }
  
  // Log the error through the regular logging system
  logError(
    errorMessage,
    errorType === DeviceErrorType.CAMERA_PERMISSION_DENIED || 
    errorType === DeviceErrorType.CAMERA_NOT_FOUND
      ? ErrorLevel.CRITICAL
      : ErrorLevel.ERROR,
    'CameraSystem',
    {
      errorType,
      originalError: error instanceof Error ? error.message : String(error),
      deviceInfo
    }
  );
  
  // Register with error prevention system for recovery
  registerApplicationError(
    errorMessage,
    'CameraSystem',
    {
      errorType,
      originalError: error instanceof Error ? error.message : String(error),
      deviceInfo
    },
    errorType === DeviceErrorType.CAMERA_PERMISSION_DENIED || 
    errorType === DeviceErrorType.CAMERA_NOT_FOUND
      ? ErrorLevel.CRITICAL
      : ErrorLevel.ERROR
  );
  
  // Update camera state
  setCameraState(CameraState.ERROR);
  
  return errorDetails;
}

/**
 * Set current camera state
 */
export function setCameraState(state: CameraState): void {
  // Only log transitions
  if (state !== currentCameraState) {
    const prevState = currentCameraState;
    currentCameraState = state;
    
    logError(
      `Camera state changed: ${prevState} -> ${state}`,
      ErrorLevel.INFO,
      'CameraSystem'
    );
    
    // Reset retry count when camera becomes active
    if (state === CameraState.ACTIVE) {
      cameraRetryCount = 0;
    }
  }
}

/**
 * Get current camera state
 */
export function getCameraState(): CameraState {
  return currentCameraState;
}

/**
 * Check if it's appropriate to retry camera access
 */
export function shouldRetryCamera(): boolean {
  return cameraRetryCount < MAX_RETRY_ATTEMPTS;
}

/**
 * Increment retry counter
 */
export function incrementCameraRetry(): number {
  cameraRetryCount++;
  return cameraRetryCount;
}

/**
 * Reset retry counter
 */
export function resetCameraRetry(): void {
  cameraRetryCount = 0;
}

/**
 * Get device error history
 */
export function getDeviceErrorHistory(): DeviceErrorDetails[] {
  return [...deviceErrorHistory];
}

/**
 * Clear error history
 */
export function clearDeviceErrorHistory(): void {
  deviceErrorHistory.length = 0;
}

/**
 * Get most frequent error type
 */
export function getMostFrequentErrorType(): DeviceErrorType | null {
  if (deviceErrorHistory.length === 0) {
    return null;
  }
  
  const errorCounts = deviceErrorHistory.reduce((counts, error) => {
    counts[error.type] = (counts[error.type] || 0) + 1;
    return counts;
  }, {} as Record<DeviceErrorType, number>);
  
  const sortedErrors = Object.entries(errorCounts)
    .sort(([, countA], [, countB]) => countB - countA);
  
  return sortedErrors.length > 0 ? sortedErrors[0][0] as DeviceErrorType : null;
}

/**
 * Handle camera-related errors with appropriate recovery actions
 */
export function handleCameraError(
  error: Error | DOMException | unknown,
  deviceInfo?: DeviceErrorDetails['deviceInfo']
): {
  errorDetails: DeviceErrorDetails;
  shouldRetry: boolean;
  recoveryAction?: () => Promise<void>;
} {
  const errorDetails = trackDeviceError(error, deviceInfo);
  const shouldRetry = shouldRetryCamera();
  
  let recoveryAction: (() => Promise<void>) | undefined;
  
  switch (errorDetails.type) {
    case DeviceErrorType.CAMERA_TRACK_ENDED:
    case DeviceErrorType.INVALID_TRACK_STATE:
    case DeviceErrorType.CAPTURE_ERROR:
      // These errors might be transient, we can retry
      if (shouldRetry) {
        recoveryAction = async () => {
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          incrementCameraRetry();
          setCameraState(CameraState.REQUESTING);
          // The actual retry will be handled by the caller
        };
      }
      break;
      
    case DeviceErrorType.CAMERA_IN_USE:
      // Camera might be released after some time
      if (shouldRetry) {
        recoveryAction = async () => {
          // Wait longer before retrying
          await new Promise(resolve => setTimeout(resolve, 3000));
          incrementCameraRetry();
          setCameraState(CameraState.REQUESTING);
          // The actual retry will be handled by the caller
        };
      }
      break;
      
    // Other cases don't have automatic recovery
    default:
      break;
  }
  
  return {
    errorDetails,
    shouldRetry,
    recoveryAction
  };
}
