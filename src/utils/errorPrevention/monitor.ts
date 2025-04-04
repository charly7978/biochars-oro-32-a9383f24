
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Error monitoring system
 */
import { logError, ErrorLevel } from '../debugUtils';

// Track device errors
export function trackDeviceError(
  message: string,
  errorType: string,
  deviceName: string,
  data?: any
) {
  // Log the error
  logError(`Device error (${errorType}): ${message}`, ErrorLevel.ERROR, deviceName, data);
  
  // Here we would send the error to a monitoring system
  // For now, we'll just console.log in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${deviceName}] ${errorType}: ${message}`, data);
  }
}

// Check system performance
export function checkSystemPerformance() {
  // This would normally check browser performance metrics
  // For a simple implementation, we'll just report basic memory usage
  if (window.performance && window.performance.memory) {
    const memory = (window.performance as any).memory;
    
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }
  
  return null;
}

// Mock network issues for testing
export function simulateNetworkIssue(severity: 'minor' | 'major' = 'minor'): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  logError(
    `[TEST] Simulating ${severity} network issue`,
    severity === 'major' ? ErrorLevel.ERROR : ErrorLevel.WARNING,
    'NetworkTest'
  );
  
  // This is just for testing the error prevention system
  console.warn(`[TEST] Simulated ${severity} network issue`);
}
