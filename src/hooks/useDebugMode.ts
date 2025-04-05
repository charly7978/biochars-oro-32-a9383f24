
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para gestionar el modo de depuración
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ErrorLevel, setLogsEnabled, setLogLevel } from '@/utils/debugUtils';

// Interface para el modo de depuración
export interface DebugModeConfig {
  enabled: boolean;
  showDiagnostics: boolean;
  verboseLogging: boolean;
  showPerformanceMetrics: boolean;
  logToConsole: boolean;
  logLevel: ErrorLevel;
}

// Configuración por defecto
const DEFAULT_DEBUG_CONFIG: DebugModeConfig = {
  enabled: false,
  showDiagnostics: false,
  verboseLogging: false,
  showPerformanceMetrics: false,
  logToConsole: false,
  logLevel: ErrorLevel.WARNING
};

/**
 * Hook para usar el modo de depuración
 */
export function useDebugMode() {
  // Cargar configuración del almacenamiento local
  const [storedConfig, setStoredConfig] = useLocalStorage<DebugModeConfig>(
    'debug-mode-config',
    DEFAULT_DEBUG_CONFIG
  );
  
  // Estado local
  const [debugConfig, setDebugConfig] = useState<DebugModeConfig>(storedConfig);
  
  // Aplicar configuración al sistema de logs
  useEffect(() => {
    setLogsEnabled(debugConfig.logToConsole);
    setLogLevel(debugConfig.logLevel);
    
    // Log inicial al activar
    if (debugConfig.enabled && debugConfig.logToConsole) {
      console.log('Modo de depuración activado', { 
        config: debugConfig,
        timestamp: new Date().toISOString()
      });
    }
  }, [debugConfig]);
  
  // Actualizar configuración
  const updateDebugConfig = useCallback((newConfig: Partial<DebugModeConfig>) => {
    setDebugConfig(prev => {
      const updated = { ...prev, ...newConfig };
      setStoredConfig(updated); // Guardar en almacenamiento local
      return updated;
    });
  }, [setStoredConfig]);
  
  // Alternar modo de depuración
  const toggleDebugMode = useCallback(() => {
    updateDebugConfig({ enabled: !debugConfig.enabled });
  }, [debugConfig.enabled, updateDebugConfig]);
  
  // Alternar diagnósticos
  const toggleDiagnostics = useCallback(() => {
    updateDebugConfig({ showDiagnostics: !debugConfig.showDiagnostics });
  }, [debugConfig.showDiagnostics, updateDebugConfig]);
  
  // Alternar métricas de rendimiento
  const togglePerformanceMetrics = useCallback(() => {
    updateDebugConfig({ showPerformanceMetrics: !debugConfig.showPerformanceMetrics });
  }, [debugConfig.showPerformanceMetrics, updateDebugConfig]);
  
  // Alternar logging verboso
  const toggleVerboseLogging = useCallback(() => {
    updateDebugConfig({ 
      verboseLogging: !debugConfig.verboseLogging,
      logLevel: !debugConfig.verboseLogging ? ErrorLevel.INFO : ErrorLevel.WARNING
    });
  }, [debugConfig.verboseLogging, updateDebugConfig]);
  
  // Retornar interfaz del hook
  return {
    ...debugConfig,
    updateDebugConfig,
    toggleDebugMode,
    toggleDiagnostics,
    togglePerformanceMetrics,
    toggleVerboseLogging,
    isDebugEnabled: debugConfig.enabled
  };
}
