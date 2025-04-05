
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para usar el sistema adaptativo en componentes React
 * Proporciona una interfaz para usar el sistema de coordinación adaptativa
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getAdaptiveSystemCoordinator, 
  AdaptiveSystemConfig 
} from '@/modules/signal-processing/utils/adaptive-system-coordinator';
import { ErrorLevel, logError } from '@/utils/debugUtils';

/**
 * Hook para usar el sistema adaptativo
 */
export function useAdaptiveSystem(initialConfig?: Partial<AdaptiveSystemConfig>) {
  // Obtener el coordinador
  const coordinator = useRef(getAdaptiveSystemCoordinator(initialConfig));
  
  // Estado para componentes React
  const [systemState, setSystemState] = useState(coordinator.current.getSystemState());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<any>(null);
  
  /**
   * Procesa un valor con el sistema adaptativo
   */
  const processValue = useCallback((value: number, quality: number, timestamp: number = Date.now()) => {
    try {
      const result = coordinator.current.processValue(value, quality, timestamp);
      
      // Si hay resultado de optimización, actualizar estado
      if (result.optimizationStatus) {
        setIsOptimizing(true);
        setLastOptimization(result.optimizationStatus);
        
        // Restaurar estado después de un breve periodo
        setTimeout(() => {
          setIsOptimizing(false);
        }, 500);
      }
      
      return result;
    } catch (error) {
      logError(
        `Error en procesamiento adaptativo: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
      
      // Devolver resultado por defecto en caso de error
      return {
        processedValue: value,
        prediction: { predictedValue: value, confidence: 0 },
        optimizationStatus: null
      };
    }
  }, []);
  
  /**
   * Envía un mensaje al sistema
   */
  const sendMessage = useCallback((destination: string, type: string, payload: any, priority: 'high' | 'medium' | 'low' = 'medium') => {
    coordinator.current.sendMessage({
      source: 'react-component',
      destination,
      type,
      payload,
      priority
    });
  }, []);
  
  /**
   * Actualiza la configuración
   */
  const updateConfig = useCallback((newConfig: Partial<AdaptiveSystemConfig>) => {
    coordinator.current.updateConfig(newConfig);
    setSystemState(coordinator.current.getSystemState());
  }, []);
  
  /**
   * Reinicia el sistema
   */
  const resetSystem = useCallback(() => {
    coordinator.current.reset();
    setSystemState(coordinator.current.getSystemState());
    setIsOptimizing(false);
    setLastOptimization(null);
  }, []);
  
  /**
   * Actualiza periódicamente el estado del sistema para la UI
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      setSystemState(coordinator.current.getSystemState());
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  /**
   * Obtiene el estado actual
   */
  const getSystemStateSnapshot = useCallback(() => {
    return coordinator.current.getSystemState();
  }, []);
  
  return {
    processValue,
    sendMessage,
    updateConfig,
    resetSystem,
    systemState,
    isOptimizing,
    lastOptimization,
    getSystemStateSnapshot
  };
}
