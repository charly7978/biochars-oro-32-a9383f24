/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para integrar el optimizador bayesiano con el procesamiento de señales
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SignalParameterOptimizer, 
  OptimizationState
} from '@/modules/signal-processing/utils/parameter-optimization';
import { BayesianOptimizerConfig } from '@/modules/signal-processing/utils/bayesian-optimization';
import { useErrorPrevention } from '@/utils/errorPrevention/integration';
import { logError, ErrorLevel } from '@/utils/debugUtils';

export interface OptimizationMetrics {
  currentScore: number;
  bestScore: number;
  improvementPercentage: number;
  optimizationCycles: number;
  lastOptimizationTime: number | null;
  paramsHistory: any[];
}

export interface SignalOptimizerConfig {
  // Función para calcular la puntuación de calidad
  scoreFunction: (params: Record<string, number>) => number;
  
  // Función para aplicar nuevos parámetros
  applyFunction: (params: Record<string, number>) => void;
  
  // Parámetros a optimizar
  parameters: BayesianOptimizerConfig;
  
  // Configuración avanzada
  observationsNeeded?: number;
  autoOptimize?: boolean;
  optimizationInterval?: number;
}

/**
 * Hook para usar el optimizador de parámetros de señal en componentes React
 */
export function useSignalParameterOptimizer(config: SignalOptimizerConfig) {
  const errorPrevention = useErrorPrevention();
  const [isReady, setIsReady] = useState(false);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [state, setState] = useState<OptimizationState>(OptimizationState.IDLE);
  const optimizerRef = useRef<SignalParameterOptimizer | null>(null);
  const autoOptimizeRef = useRef<boolean>(config.autoOptimize !== false);
  const optimizationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inicializar el optimizador
  useEffect(() => {
    try {
      // Crear optimizador y configurarlo
      const optimizer = createSignalParameterOptimizer(config.parameters);
      optimizer.setScoreFunction(config.scoreFunction);
      optimizer.setApplyFunction(config.applyFunction);
      
      if (config.observationsNeeded) {
        optimizer.configureObservation(config.observationsNeeded);
      }
      
      // Guardar referencia
      optimizerRef.current = optimizer;
      setIsReady(true);
      
      // Actualizar métricas
      setMetrics(optimizer.getMetrics());
      setState(optimizer.getState());
      
      logError(
        "useSignalParameterOptimizer: Optimizer initialized",
        ErrorLevel.INFO,
        "ParameterOptimizer"
      );
    } catch (error) {
      errorPrevention.registerError(
        `Error initializing signal optimizer: ${error instanceof Error ? error.message : String(error)}`,
        "useSignalParameterOptimizer",
        { error, parameters: config.parameters },
        ErrorLevel.ERROR
      );
    }
    
    return () => {
      // Limpiar interval al desmontar
      if (optimizationIntervalRef.current) {
        clearInterval(optimizationIntervalRef.current);
      }
    };
  }, []);
  
  // Configurar intervalo de optimización automática
  useEffect(() => {
    if (!isReady || !autoOptimizeRef.current) return;
    
    // Limpiar intervalo anterior si existe
    if (optimizationIntervalRef.current) {
      clearInterval(optimizationIntervalRef.current);
    }
    
    // Crear nuevo intervalo
    const interval = config.optimizationInterval || 60000; // Default 1 min
    optimizationIntervalRef.current = setInterval(() => {
      tryStartOptimization();
    }, interval);
    
    return () => {
      if (optimizationIntervalRef.current) {
        clearInterval(optimizationIntervalRef.current);
      }
    };
  }, [isReady, config.optimizationInterval]);
  
  // Actualizar parámetros si cambian
  useEffect(() => {
    if (!optimizerRef.current) return;
    
    // Actualizar funciones si cambian
    optimizerRef.current.setScoreFunction(config.scoreFunction);
    optimizerRef.current.setApplyFunction(config.applyFunction);
    
    if (config.observationsNeeded) {
      optimizerRef.current.configureObservation(config.observationsNeeded);
    }
  }, [config.scoreFunction, config.applyFunction, config.observationsNeeded]);
  
  // Intentar iniciar optimización
  const tryStartOptimization = useCallback(() => {
    if (!optimizerRef.current) return false;
    
    if (optimizerRef.current.getState() !== OptimizationState.IDLE) {
      return false;
    }
    
    const success = optimizerRef.current.startOptimization();
    if (success) {
      setState(optimizerRef.current.getState());
      setMetrics(optimizerRef.current.getMetrics());
    }
    
    return success;
  }, []);
  
  // Añadir observación
  const addQualityObservation = useCallback((qualityScore: number) => {
    if (!optimizerRef.current) return;
    
    const currentState = optimizerRef.current.getState();
    
    if (currentState === OptimizationState.COLLECTING) {
      optimizerRef.current.addObservation(qualityScore);
    } else if (currentState === OptimizationState.EVALUATING) {
      optimizerRef.current.addEvaluationScore(qualityScore);
    }
    
    // Actualizar estado y métricas
    setState(optimizerRef.current.getState());
    setMetrics(optimizerRef.current.getMetrics());
  }, []);
  
  // Activar/desactivar optimización automática
  const setAutoOptimize = useCallback((enabled: boolean) => {
    autoOptimizeRef.current = enabled;
    
    // Limpiar intervalo existente
    if (optimizationIntervalRef.current) {
      clearInterval(optimizationIntervalRef.current);
      optimizationIntervalRef.current = null;
    }
    
    // Si está habilitado, configurar nuevo intervalo
    if (enabled && optimizerRef.current) {
      const interval = config.optimizationInterval || 60000;
      optimizationIntervalRef.current = setInterval(() => {
        tryStartOptimization();
      }, interval);
    }
  }, [config.optimizationInterval, tryStartOptimization]);
  
  // Reiniciar el optimizador
  const resetOptimizer = useCallback(() => {
    if (!optimizerRef.current) return;
    
    optimizerRef.current.reset();
    setState(OptimizationState.IDLE);
    setMetrics(optimizerRef.current.getMetrics());
  }, []);
  
  // Obtener los mejores parámetros
  const getBestParameters = useCallback(() => {
    if (!optimizerRef.current) return null;
    
    return optimizerRef.current.getBestParameters();
  }, []);
  
  return {
    isReady,
    state,
    metrics,
    addQualityObservation,
    startOptimization: tryStartOptimization,
    setAutoOptimize,
    reset: resetOptimizer,
    getBestParameters
  };
}
