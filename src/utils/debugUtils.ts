
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades de depuración para el sistema
 */

// Niveles de error
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Configuración global de depuración
export interface DebugConfig {
  showLogs: boolean;
  logLevel: ErrorLevel;
  categories: string[];
}

// Estado global de depuración
const debugConfig: DebugConfig = {
  showLogs: true,
  logLevel: ErrorLevel.INFO,
  categories: ['FingerDetection', 'SignalProcessing', 'VitalSigns', 'Camera']
};

/**
 * Registra un error o mensaje de depuración
 */
export function logError(
  message: string,
  level: ErrorLevel = ErrorLevel.ERROR,
  category: string = 'General',
  details?: any
): void {
  // No mostrar si los logs están desactivados
  if (!debugConfig.showLogs) return;
  
  // No mostrar si el nivel es menor que el configurado
  if (shouldShowErrorLevel(level) && shouldShowCategory(category)) {
    const timestamp = new Date().toISOString();
    
    // Formatear mensaje según nivel
    switch (level) {
      case ErrorLevel.INFO:
        console.log(`${timestamp} info: [${category}] ${message}`, details || '');
        break;
      case ErrorLevel.WARNING:
        console.warn(`${timestamp} warning: [${category}] ${message}`, details || '');
        break;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        console.error(`${timestamp} ${level}: [${category}] ${message}`, details || '');
        break;
      default:
        console.log(`${timestamp} debug: [${category}] ${message}`, details || '');
    }
  }
}

/**
 * Determina si se debe mostrar un nivel de error
 */
function shouldShowErrorLevel(level: ErrorLevel): boolean {
  const levels = [
    ErrorLevel.INFO,
    ErrorLevel.WARNING,
    ErrorLevel.ERROR,
    ErrorLevel.CRITICAL
  ];
  
  const configLevelIndex = levels.indexOf(debugConfig.logLevel);
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex >= configLevelIndex;
}

/**
 * Determina si se debe mostrar una categoría
 */
function shouldShowCategory(category: string): boolean {
  return debugConfig.categories.includes(category) || debugConfig.categories.includes('All');
}

/**
 * Actualiza la configuración de depuración
 */
export function updateDebugConfig(newConfig: Partial<DebugConfig>): void {
  Object.assign(debugConfig, newConfig);
  
  logError(
    `Configuración de depuración actualizada: ${JSON.stringify(debugConfig)}`,
    ErrorLevel.INFO,
    'System'
  );
}

/**
 * Activa o desactiva los logs
 */
export function setLogsEnabled(enabled: boolean): void {
  debugConfig.showLogs = enabled;
  
  if (enabled) {
    console.log('Sistema de logs activado');
  }
}

/**
 * Establece el nivel de log
 */
export function setLogLevel(level: ErrorLevel): void {
  debugConfig.logLevel = level;
  
  logError(
    `Nivel de log establecido a: ${level}`,
    ErrorLevel.INFO,
    'System'
  );
}

/**
 * Obtiene la configuración actual de depuración
 */
export function getDebugConfig(): DebugConfig {
  return { ...debugConfig };
}

/**
 * Hook para usar la configuración de depuración
 */
export function useDebugConfig() {
  return {
    config: getDebugConfig(),
    updateConfig: updateDebugConfig,
    setLogsEnabled,
    setLogLevel
  };
}
