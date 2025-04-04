
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Implementación del optimizador de parámetros de señal
 * Utiliza optimización bayesiana para ajustar parámetros de procesamiento
 */
import { BayesianOptimizer, BayesianOptimizerConfig, createBayesianOptimizer } from './bayesian-optimization';

/**
 * Estados del optimizador durante el ciclo de optimización
 */
export enum OptimizationState {
  IDLE = 'idle',
  COLLECTING = 'collecting',
  OPTIMIZING = 'optimizing',
  APPLYING = 'applying',
  EVALUATING = 'evaluating'
}

/**
 * Tipo para un punto en el historial de parámetros
 */
export interface ParameterHistoryEntry {
  timestamp: number;
  params: Record<string, number>;
  score: number;
}

/**
 * Métricas del optimizador para supervisión
 */
export interface OptimizationMetrics {
  currentScore: number;
  bestScore: number;
  improvementPercentage: number;
  optimizationCycles: number;
  lastOptimizationTime: number | null;
  paramsHistory: ParameterHistoryEntry[];
}

/**
 * Optimizador de parámetros de señal
 * Gestiona el ciclo completo de optimización bayesiana
 */
export class SignalParameterOptimizer {
  // Optimizador bayesiano interno
  private optimizer: BayesianOptimizer;
  
  // Estado actual del optimizador
  private state: OptimizationState = OptimizationState.IDLE;
  
  // Función para calcular puntuación de calidad
  private scoreFunction: ((params: Record<string, number>) => number) | null = null;
  
  // Función para aplicar nuevos parámetros
  private applyFunction: ((params: Record<string, number>) => void) | null = null;
  
  // Historial de optimización
  private history: ParameterHistoryEntry[] = [];
  
  // Contador de ciclos de optimización
  private cycleCount: number = 0;
  
  // Tiempo de la última optimización
  private lastOptimizationTime: number | null = null;
  
  // Parámetros actuales y mejores
  private currentParams: Record<string, number> = {};
  private currentScore: number = 0;
  private bestScore: number = 0;
  
  // Configuración para recolección de observaciones
  private observationsNeeded: number = 5;
  private currentObservationCount: number = 0;
  
  // Almacén temporal de observaciones para evaluación
  private tempObservations: number[] = [];
  
  /**
   * Constructor del optimizador
   * @param config Configuración del optimizador bayesiano
   */
  constructor(config: BayesianOptimizerConfig) {
    // Create bayesian optimizer with provided parameters
    if (config.parameters && config.parameters.length > 0) {
      this.optimizer = createBayesianOptimizer(config.parameters, {}, config);
      
      // Initialize current parameters with default values
      config.parameters.forEach(param => {
        this.currentParams[param.name] = param.initialValue !== undefined ? 
          param.initialValue : param.default;
      });
    } else {
      throw new Error("Parameter optimizer requires parameter definitions");
    }
  }
  
  /**
   * Configura la función para calcular la puntuación de calidad
   */
  public setScoreFunction(func: (params: Record<string, number>) => number): void {
    this.scoreFunction = func;
  }
  
  /**
   * Configura la función para aplicar nuevos parámetros
   */
  public setApplyFunction(func: (params: Record<string, number>) => void): void {
    this.applyFunction = func;
  }
  
  /**
   * Configura el número de observaciones necesarias para evaluación
   */
  public configureObservation(count: number): void {
    this.observationsNeeded = Math.max(3, count);
  }
  
  /**
   * Inicia el ciclo de optimización
   */
  public startOptimization(): boolean {
    if (this.state !== OptimizationState.IDLE) {
      console.warn('Optimization already in progress');
      return false;
    }
    
    if (!this.scoreFunction || !this.applyFunction) {
      console.error('Score or apply function not set');
      return false;
    }
    
    // Comenzar recolección de observaciones
    this.state = OptimizationState.COLLECTING;
    this.currentObservationCount = 0;
    this.tempObservations = [];
    
    console.log('Parameter optimization started: COLLECTING observations');
    return true;
  }
  
  /**
   * Añade una observación durante la fase de recolección
   */
  public addObservation(quality: number): void {
    if (this.state !== OptimizationState.COLLECTING) {
      return;
    }
    
    this.tempObservations.push(quality);
    this.currentObservationCount++;
    
    // Comprobar si tenemos suficientes observaciones
    if (this.currentObservationCount >= this.observationsNeeded) {
      this.proceedToOptimization();
    }
  }
  
  /**
   * Avanza al siguiente paso: optimización
   */
  private proceedToOptimization(): void {
    // Calcular puntuación media de las observaciones
    const avgQuality = this.tempObservations.reduce((sum, q) => sum + q, 0) / 
                      this.tempObservations.length;
    
    // Añadir observación al optimizador con los parámetros actuales
    this.optimizer.addObservation(this.currentParams, avgQuality);
    this.currentScore = avgQuality;
    
    // Actualizar mejor puntuación
    if (this.cycleCount === 0 || avgQuality > this.bestScore) {
      this.bestScore = avgQuality;
    }
    
    // Añadir al historial
    this.history.push({
      timestamp: Date.now(),
      params: { ...this.currentParams },
      score: avgQuality
    });
    
    // Limitar tamaño del historial
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
    
    // Cambiar estado a optimización
    this.state = OptimizationState.OPTIMIZING;
    console.log('Optimization phase: OPTIMIZING parameters', { currentScore: avgQuality });
    
    // Ejecutar optimización
    this.runOptimization();
  }
  
  /**
   * Ejecuta el algoritmo de optimización
   */
  private runOptimization(): void {
    // Get next parameters to try
    this.optimizer.suggest(this.scoreFunction!).then(nextParams => {
      // Actualizar parámetros actuales
      this.currentParams = { ...nextParams };
      
      // Cambiar estado a aplicación
      this.state = OptimizationState.APPLYING;
      console.log('Optimization phase: APPLYING new parameters', nextParams);
      
      // Aplicar nuevos parámetros
      if (this.applyFunction) {
        this.applyFunction(nextParams);
      }
      
      // Cambiar estado a evaluación
      this.state = OptimizationState.EVALUATING;
      console.log('Optimization phase: EVALUATING new parameters');
      
      // Reiniciar contadores para evaluación
      this.currentObservationCount = 0;
      this.tempObservations = [];
      
      // Actualizar tiempos y contadores
      this.lastOptimizationTime = Date.now();
      this.cycleCount++;
    }).catch(error => {
      console.error('Error during optimization:', error);
      this.state = OptimizationState.IDLE;
    });
  }
  
  /**
   * Añade una puntuación para la evaluación de nuevos parámetros
   */
  public addEvaluationScore(quality: number): void {
    if (this.state !== OptimizationState.EVALUATING) {
      return;
    }
    
    this.tempObservations.push(quality);
    this.currentObservationCount++;
    
    // Comprobar si tenemos suficientes observaciones
    if (this.currentObservationCount >= this.observationsNeeded) {
      this.finishEvaluation();
    }
  }
  
  /**
   * Finaliza la evaluación y el ciclo de optimización
   */
  private finishEvaluation(): void {
    // Calcular puntuación media de las observaciones
    const avgQuality = this.tempObservations.reduce((sum, q) => sum + q, 0) / 
                      this.tempObservations.length;
    
    // Añadir observación al optimizador con los parámetros actuales
    this.optimizer.addObservation(this.currentParams, avgQuality);
    this.currentScore = avgQuality;
    
    // Actualizar mejor puntuación
    if (avgQuality > this.bestScore) {
      this.bestScore = avgQuality;
    }
    
    // Añadir al historial
    this.history.push({
      timestamp: Date.now(),
      params: { ...this.currentParams },
      score: avgQuality
    });
    
    // Volver a estado inactivo
    this.state = OptimizationState.IDLE;
    console.log('Optimization cycle completed', { 
      newScore: avgQuality, 
      bestScore: this.bestScore,
      cycles: this.cycleCount
    });
  }
  
  /**
   * Obtiene el estado actual del optimizador
   */
  public getState(): OptimizationState {
    return this.state;
  }
  
  /**
   * Obtiene las métricas del optimizador para visualización
   */
  public getMetrics(): OptimizationMetrics {
    const improvementPercentage = this.cycleCount > 0 && this.bestScore > 0 ?
      ((this.bestScore / Math.max(0.1, this.history[0]?.score || 0.1)) - 1) * 100 : 0;
    
    return {
      currentScore: this.currentScore,
      bestScore: this.bestScore,
      improvementPercentage,
      optimizationCycles: this.cycleCount,
      lastOptimizationTime: this.lastOptimizationTime,
      paramsHistory: [...this.history]
    };
  }
  
  /**
   * Obtiene los mejores parámetros encontrados
   */
  public getBestParameters(): Record<string, number> | null {
    return this.optimizer.getCurrentBest()?.params || null;
  }
  
  /**
   * Reinicia el optimizador
   */
  public reset(): void {
    this.optimizer.reset();
    this.state = OptimizationState.IDLE;
    this.cycleCount = 0;
    this.lastOptimizationTime = null;
    this.currentScore = 0;
    this.bestScore = 0;
    this.history = [];
    this.tempObservations = [];
    this.currentObservationCount = 0;
  }
}

/**
 * Crea un nuevo optimizador de parámetros de señal
 */
export function createSignalParameterOptimizer(
  config: BayesianOptimizerConfig
): SignalParameterOptimizer {
  return new SignalParameterOptimizer(config);
}
