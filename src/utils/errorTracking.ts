
/**
 * Sistema centralizado de inicialización de seguimiento de errores
 */
import { initializeErrorTracking, logError, ErrorLevel, registerErrorHandler } from './debugUtils';

/**
 * Inicializa el sistema completo de seguimiento de errores
 */
export function initializeErrorTrackingSystem(): void {
  try {
    // Configurar sistema de seguimiento
    initializeErrorTracking({
      verbose: false,
      setupGlobalHandlers: true,
      logToConsole: true,
      maxLogSize: 2000,
      applicationVersion: '1.0.0'
    });
    
    // Registrar manejador de errores global
    registerErrorHandler((error, info) => {
      console.error('Error capturado por el sistema de seguimiento:', error);
      
      // Aquí podrían implementarse reportes a servicios de monitoreo remotos
    });
    
    logError(
      'Sistema de seguimiento de errores inicializado correctamente',
      ErrorLevel.INFO,
      'ErrorTracking'
    );
  } catch (error) {
    console.error('Error al inicializar el sistema de seguimiento:', error);
  }
}
