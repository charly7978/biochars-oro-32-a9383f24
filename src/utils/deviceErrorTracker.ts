
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

/**
 * Registra un error de dispositivo
 */
export function trackDeviceError(error: string | Event, type: string = 'generic', source?: string, extra?: Record<string, any>): void {
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

export default { trackDeviceError, getDeviceErrors, clearDeviceErrors };
