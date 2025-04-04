
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Monitor de prevención de errores en el sistema
 * Detecta patrones de error y aplica estrategias de recuperación
 */

import { ErrorLevel, logError } from '../debugUtils';
import { CameraState } from '../deviceErrorTracker';

// Tipos de dispositivos monitoreados
export type MonitoredDeviceType = 'camera' | 'accelerometer' | 'memory' | 'processor';

// Interfaz para eventos de error de dispositivo
export interface DeviceErrorEvent {
  deviceType: MonitoredDeviceType;
  errorType: string;
  timestamp: number;
  details?: any;
  recoveryAttempted?: boolean;
}

// Sistema de monitoreo de errores
class ErrorPreventionMonitor {
  private deviceErrors: Map<MonitoredDeviceType, DeviceErrorEvent[]> = new Map();
  private readonly MAX_ERROR_HISTORY = 10;
  
  // Registrar un error de dispositivo
  public trackDeviceError(event: DeviceErrorEvent): void {
    const { deviceType } = event;
    
    // Inicializar array si no existe
    if (!this.deviceErrors.has(deviceType)) {
      this.deviceErrors.set(deviceType, []);
    }
    
    // Añadir evento al historial
    const errors = this.deviceErrors.get(deviceType)!;
    errors.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });
    
    // Limitar tamaño del historial
    if (errors.length > this.MAX_ERROR_HISTORY) {
      errors.shift();
    }
    
    // Loguear el error
    logError(
      `Error en dispositivo ${deviceType}: ${event.errorType}`,
      ErrorLevel.WARNING,
      'ErrorPreventionMonitor',
      { details: event.details }
    );
  }
  
  // Comprobar si un dispositivo tiene demasiados errores recientes
  public hasExcessiveErrors(deviceType: MonitoredDeviceType, timeWindowMs: number = 30000): boolean {
    if (!this.deviceErrors.has(deviceType)) return false;
    
    const errors = this.deviceErrors.get(deviceType)!;
    const now = Date.now();
    
    // Contar errores en la ventana de tiempo
    const recentErrors = errors.filter(e => now - e.timestamp < timeWindowMs);
    
    // Criterios por tipo de dispositivo
    switch (deviceType) {
      case 'camera':
        return recentErrors.length >= 3;
      case 'memory':
        return recentErrors.length >= 5;
      default:
        return recentErrors.length >= 4;
    }
  }
  
  // Obtener errores recientes para un dispositivo
  public getRecentErrors(deviceType: MonitoredDeviceType): DeviceErrorEvent[] {
    return this.deviceErrors.get(deviceType) || [];
  }
  
  // Determinar si se debe intentar una recuperación
  public shouldAttemptRecovery(deviceType: MonitoredDeviceType): boolean {
    if (!this.deviceErrors.has(deviceType)) return false;
    
    const errors = this.deviceErrors.get(deviceType)!;
    if (errors.length === 0) return false;
    
    // Verificar si ya se intentó recuperación recientemente
    const recentRecoveryAttempt = errors
      .filter(e => e.recoveryAttempted)
      .some(e => Date.now() - e.timestamp < 10000);
    
    return !recentRecoveryAttempt && this.hasExcessiveErrors(deviceType);
  }
  
  // Marcar que se ha intentado recuperar un dispositivo
  public markRecoveryAttempted(deviceType: MonitoredDeviceType): void {
    if (!this.deviceErrors.has(deviceType)) return;
    
    const errors = this.deviceErrors.get(deviceType)!;
    if (errors.length === 0) return;
    
    // Marcar el error más reciente
    const mostRecent = errors[errors.length - 1];
    mostRecent.recoveryAttempted = true;
    
    logError(
      `Intento de recuperación para ${deviceType}`,
      ErrorLevel.INFO,
      'ErrorPreventionMonitor'
    );
  }
  
  // Restablecer el historial de errores para un dispositivo
  public resetErrorHistory(deviceType: MonitoredDeviceType): void {
    this.deviceErrors.set(deviceType, []);
  }
  
  // Actualizar estado de cámara en el sistema de monitoreo
  public updateCameraState(state: CameraState): void {
    logError(
      `Estado de cámara actualizado: ${state}`,
      ErrorLevel.INFO,
      'ErrorPreventionMonitor'
    );
    
    // Si la cámara está activa, reiniciar contadores de error
    if (state === CameraState.ACTIVE) {
      this.resetErrorHistory('camera');
    }
  }
}

// Instancia singleton
export const errorPreventionMonitor = new ErrorPreventionMonitor();

// Exportar funciones de utilidad
export const trackDeviceError = (event: DeviceErrorEvent): void => {
  errorPreventionMonitor.trackDeviceError(event);
};

export const shouldAttemptDeviceRecovery = (deviceType: MonitoredDeviceType): boolean => {
  return errorPreventionMonitor.shouldAttemptRecovery(deviceType);
};

export const markDeviceRecoveryAttempted = (deviceType: MonitoredDeviceType): void => {
  errorPreventionMonitor.markRecoveryAttempted(deviceType);
};

export const getDeviceErrors = (deviceType: MonitoredDeviceType): DeviceErrorEvent[] => {
  return errorPreventionMonitor.getRecentErrors(deviceType);
};
