
/**
 * Sistema de prevención de errores
 * Monitorea la aplicación para detectar y prevenir patrones comunes de fallo
 */

import { logError, ErrorLevel } from './debugUtils';

// Estado del sistema
interface PreventionSystemState {
  initialized: boolean;
  errorCount: number;
  recoveryAttempts: number;
  lastRecoveryTime: number;
  isRecovering: boolean;
  hasUnresolvedIssues: boolean;
  healthStatus: 'healthy' | 'warning' | 'degraded' | 'critical';
  criticalErrors: string[];
}

const state: PreventionSystemState = {
  initialized: false,
  errorCount: 0,
  recoveryAttempts: 0,
  lastRecoveryTime: 0,
  isRecovering: false,
  hasUnresolvedIssues: false,
  healthStatus: 'healthy',
  criticalErrors: []
};

/**
 * Inicializa el sistema de prevención de errores
 */
export function initializeErrorPreventionSystem(): () => void {
  if (state.initialized) {
    return () => {};
  }
  
  state.initialized = true;
  state.errorCount = 0;
  state.healthStatus = 'healthy';
  
  logError("Error prevention system initialized", ErrorLevel.INFO, "ErrorPrevention");
  
  // Monitor de memoria
  let lastMemoryUsage = 0;
  
  const memoryMonitorInterval = setInterval(() => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      
      if (memory && memory.usedJSHeapSize) {
        const usedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        const totalMB = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        const usagePercent = (usedMB / totalMB) * 100;
        
        // Detectar fugas de memoria significativas
        if (lastMemoryUsage > 0 && usedMB > lastMemoryUsage * 1.5 && usedMB > 100) {
          logError(
            `Posible fuga de memoria detectada: ${usedMB}MB (${usagePercent.toFixed(1)}% de ${totalMB}MB)`,
            ErrorLevel.WARNING,
            "MemoryMonitor"
          );
        }
        
        // Advertir sobre uso excesivo de memoria
        if (usagePercent > 80) {
          logError(
            `Uso de memoria elevado: ${usedMB}MB (${usagePercent.toFixed(1)}% de ${totalMB}MB)`,
            ErrorLevel.WARNING,
            "MemoryMonitor"
          );
        }
        
        lastMemoryUsage = usedMB;
      }
    }
  }, 10000);

  // Monitor de error loop
  let consecutiveErrors = 0;
  let lastErrorTime = 0;
  
  const errorHandler = (event: ErrorEvent) => {
    const now = Date.now();
    
    // Detectar errores rápidos consecutivos que podrían indicar un bucle
    if (now - lastErrorTime < 1000) {
      consecutiveErrors++;
      
      if (consecutiveErrors > 5) {
        logError(
          `Posible bucle de errores detectado: ${consecutiveErrors} errores en menos de 1 segundo`,
          ErrorLevel.ERROR,
          "ErrorLoopDetector",
          { error: event.error }
        );
        
        state.healthStatus = 'critical';
        state.hasUnresolvedIssues = true;
        state.criticalErrors.push(event.message || "Error loop detected");
        
        // Limitar el tamaño de errores críticos
        if (state.criticalErrors.length > 10) {
          state.criticalErrors.shift();
        }
      }
    } else {
      consecutiveErrors = 1;
    }
    
    lastErrorTime = now;
    state.errorCount++;
  };
  
  window.addEventListener('error', errorHandler);
  
  return () => {
    clearInterval(memoryMonitorInterval);
    window.removeEventListener('error', errorHandler);
    state.initialized = false;
    logError("Error prevention system shut down", ErrorLevel.INFO, "ErrorPrevention");
  };
}

/**
 * Obtiene el estado actual del sistema de prevención
 */
export function getErrorPreventionState(): PreventionSystemState {
  return { ...state };
}

/**
 * Intenta recuperarse automáticamente de problemas detectados
 */
export function attemptErrorRecovery(): Promise<boolean> {
  if (state.isRecovering) {
    return Promise.resolve(false);
  }
  
  state.isRecovering = true;
  state.recoveryAttempts++;
  state.lastRecoveryTime = Date.now();
  
  logError(
    `Intentando recuperación automática (intento ${state.recoveryAttempts})`,
    ErrorLevel.WARNING,
    "ErrorRecovery"
  );
  
  return new Promise<boolean>((resolve) => {
    // Implementar acciones de recuperación específicas aquí
    
    // Simulación de una acción de recuperación
    setTimeout(() => {
      state.isRecovering = false;
      
      // Determinar éxito basado en lógica específica
      const wasSuccessful = Math.random() > 0.3; // Simular 70% de éxito
      
      if (wasSuccessful) {
        state.hasUnresolvedIssues = false;
        state.healthStatus = state.errorCount > 10 ? 'warning' : 'healthy';
        
        logError(
          "Recuperación automática exitosa",
          ErrorLevel.INFO,
          "ErrorRecovery"
        );
      } else {
        state.healthStatus = 'degraded';
        
        logError(
          "Recuperación automática fallida",
          ErrorLevel.ERROR,
          "ErrorRecovery"
        );
      }
      
      resolve(wasSuccessful);
    }, 1000);
  });
}
