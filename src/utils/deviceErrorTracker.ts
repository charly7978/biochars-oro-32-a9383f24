
/**
 * Módulo para seguimiento y manejo de errores de dispositivo
 * Centraliza la gestión de errores de cámara y otros dispositivos
 */

import { logError, ErrorLevel } from './debugUtils';

// Estados posibles para la cámara
export enum CameraState {
  INACTIVE = 'inactive',   // Cámara no inicializada o detenida
  REQUESTING = 'requesting', // Solicitando permisos
  ACTIVE = 'active',       // Cámara activa y funcionando
  ERROR = 'error'          // Error en la cámara
}

// Estado actual de la cámara
let currentCameraState: CameraState = CameraState.INACTIVE;

// Registro de errores de dispositivo
const deviceErrors: Record<string, Array<{
  timestamp: number;
  message: string;
  code?: string;
}>> = {
  camera: [],
  microphone: [],
  sensors: [],
  other: []
};

/**
 * Establece el estado actual de la cámara
 * @param state Nuevo estado
 */
export function setCameraState(state: CameraState): void {
  const previousState = currentCameraState;
  currentCameraState = state;
  
  logError(`Camera state changed: ${previousState} -> ${state}`, 
    ErrorLevel.INFO, 
    "DeviceTracker");
}

/**
 * Obtiene el estado actual de la cámara
 */
export function getCameraState(): CameraState {
  return currentCameraState;
}

/**
 * Registra un error de dispositivo
 * @param error El error ocurrido
 * @param deviceType Tipo de dispositivo (por defecto 'camera')
 */
export function trackDeviceError(
  error: unknown, 
  deviceType: 'camera' | 'microphone' | 'sensors' | 'other' = 'camera'
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error && 'code' in error ? String((error as any).code) : undefined;
  
  // Registrar el error
  deviceErrors[deviceType].push({
    timestamp: Date.now(),
    message: errorMessage,
    code: errorCode
  });
  
  // Limitar el número de errores almacenados
  if (deviceErrors[deviceType].length > 10) {
    deviceErrors[deviceType].shift();
  }
  
  // Registrar en el log
  logError(
    `Device error (${deviceType}): ${errorMessage}` + (errorCode ? ` [Code: ${errorCode}]` : ''),
    ErrorLevel.ERROR,
    "DeviceTracker"
  );
  
  // Si es un error de cámara, actualizar el estado
  if (deviceType === 'camera' && currentCameraState !== CameraState.ERROR) {
    setCameraState(CameraState.ERROR);
  }
}

/**
 * Obtiene el historial de errores para un tipo de dispositivo
 * @param deviceType Tipo de dispositivo
 */
export function getDeviceErrors(
  deviceType: 'camera' | 'microphone' | 'sensors' | 'other' = 'camera'
): Array<{timestamp: number; message: string; code?: string}> {
  return [...deviceErrors[deviceType]];
}

/**
 * Limpia el historial de errores para un tipo de dispositivo
 * @param deviceType Tipo de dispositivo (o undefined para limpiar todos)
 */
export function clearDeviceErrors(
  deviceType?: 'camera' | 'microphone' | 'sensors' | 'other'
): void {
  if (deviceType) {
    deviceErrors[deviceType] = [];
  } else {
    Object.keys(deviceErrors).forEach(key => {
      deviceErrors[key as keyof typeof deviceErrors] = [];
    });
  }
  
  logError(
    `Device errors cleared ${deviceType ? `for ${deviceType}` : 'for all devices'}`,
    ErrorLevel.INFO,
    "DeviceTracker"
  );
}
