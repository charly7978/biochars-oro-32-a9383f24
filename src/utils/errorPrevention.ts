
/**
 * Utilidades para prevención de errores en tiempo de ejecución
 */
import { logError, ErrorLevel, detectCircular, safeStringify } from './debugUtils';

/**
 * Inicializa el sistema de prevención de errores
 */
export function initializeErrorPreventionSystem(): () => void {
  try {
    // Interceptar errores no manejados
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Registrar en el sistema de seguimiento
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? safeStringify(arg) : String(arg)
      ).join(' ');
      
      logError(errorMessage, ErrorLevel.ERROR, 'ConsoleError');
      
      // Mantener comportamiento original
      originalConsoleError.apply(console, args);
    };
    
    // Manejador de promesas rechazadas
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      logError(
        `Promesa rechazada no manejada: ${event.reason}`,
        ErrorLevel.ERROR,
        'UnhandledRejection',
        { reason: event.reason }
      );
    };
    
    // Manejador de errores
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      logError(
        `Error no manejado: ${event.message}`,
        ErrorLevel.ERROR,
        'UnhandledError',
        { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack 
        }
      );
    };
    
    // Registrar manejadores
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    window.addEventListener('error', errorHandler);
    
    // Función para limpiar manejadores
    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      window.removeEventListener('error', errorHandler);
    };
  } catch (error) {
    console.error('Error al inicializar sistema de prevención:', error);
    return () => {}; // Cleanup vacío
  }
}
