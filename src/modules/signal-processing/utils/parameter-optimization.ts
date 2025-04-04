
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Optimizador de parámetros para procesamiento de señal
 * Utiliza optimización bayesiana para encontrar los mejores parámetros
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { 
  createBayesianOptimizer,
  DEFAULT_PPG_PARAMETERS,
  type BayesianOptimizer,
  type OptimizationParameter,
  type BayesianOptimizerConfig
} from './bayesian-optimization';

/**
 * Estados del optimizador
 */
export enum OptimizationState {
  IDLE = 'idle',
  OPTIMIZING = 'optimizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COLLECTING = 'collecting',
  EVALUATING = 'evaluating',
  APPLYING = 'applying'
}

/**
 * Métricas de optimización para monitoreo
 */
export interface OptimizationMetrics {
  currentScore: number;
  bestScore: number;
  improvementPercentage: number;
  optimizationCycles: number;
  lastOptimizationTime: number | null;
  paramsHistory: Array<{
    timestamp: number;
    score: number;
    params: Record<string, any>;
  }>;
}

/**
 * Interfaz para optimizador de parámetros
 */
export interface SignalParameterOptimizer {
  // Comienza optimización
  startOptimization(objectiveFunction?: (params: Record<string, number>) => number): Promise<Record<string, number>>;
  
  // Detiene optimización en curso
  stopOptimization(): void;
  
  // Obtiene parámetros actuales
  getCurrentParameters(): Record<string, number>;
  
  // Obtiene estado actual
  getState(): OptimizationState;
  
  // Obtiene resultados de optimización
  getOptimizationResults(): Array<{
    iteration: number;
    params: Record<string, number>;
    value: number;
  }>;
  
  // Reinicia optimizador
  reset(): void;
  
  // Obtiene métricas de optimización
  getMetrics(): OptimizationMetrics;
  
  // Configura función de puntuación
  setScoreFunction(scoreFunction: (params: Record<string, number>) => number): void;
  
  // Configura función para aplicar parámetros
  setApplyFunction(applyFunction: (params: Record<string, number>) => void): void;
  
  // Configura observación
  configureObservation(observationsNeeded: number): void;
  
  // Añade observación
  addObservation(qualityScore: number): void;
  
  // Añade puntuación de evaluación
  addEvaluationScore(qualityScore: number): void;
  
  // Obtiene mejores parámetros
  getBestParameters(): Record<string, number>;
}

/**
 * Implementación del optimizador de parámetros
 */
class DefaultSignalParameterOptimizer implements SignalParameterOptimizer {
  private optimizer: BayesianOptimizer;
  private state: OptimizationState = OptimizationState.IDLE;
  private currentParams: Record<string, number> = {};
  private results: Array<{
    iteration: number;
    params: Record<string, number>;
    value: number;
  }> = [];
  private stopRequested: boolean = false;
  private parameters: OptimizationParameter[];
  private scoreFunction: (params: Record<string, number>) => number = () => 0;
  private applyFunction: (params: Record<string, number>) => void = () => {};
  private observationsNeeded: number = 5;
  private observations: number[] = [];
  private lastOptimizationTime: number | null = null;
  private optimizationCycles: number = 0;
  private bestScore: number = 0;
  private paramsHistory: Array<{
    timestamp: number;
    score: number;
    params: Record<string, any>;
  }> = [];
  
  /**
   * Constructor
   */
  constructor(parameters: OptimizationParameter[], config: BayesianOptimizerConfig) {
    this.parameters = parameters;
    
    // Inicializar con parámetros predeterminados
    this.reset();
    
    // Crear optimizador bayesiano
    this.optimizer = createBayesianOptimizer(
      parameters,
      this.currentParams,
      config
    );
  }
  
  /**
   * Configura función de puntuación
   */
  public setScoreFunction(scoreFunction: (params: Record<string, number>) => number): void {
    this.scoreFunction = scoreFunction;
  }
  
  /**
   * Configura función para aplicar parámetros
   */
  public setApplyFunction(applyFunction: (params: Record<string, number>) => void): void {
    this.applyFunction = applyFunction;
  }
  
  /**
   * Configura observación
   */
  public configureObservation(observationsNeeded: number): void {
    this.observationsNeeded = observationsNeeded;
  }
  
  /**
   * Añade observación
   */
  public addObservation(qualityScore: number): void {
    this.observations.push(qualityScore);
    
    if (this.observations.length >= this.observationsNeeded) {
      this.state = OptimizationState.IDLE;
    }
  }
  
  /**
   * Añade puntuación de evaluación
   */
  public addEvaluationScore(qualityScore: number): void {
    // Log for debugging
    logError(
      `Evaluation score added: ${qualityScore}`,
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
    
    // Add to history
    this.paramsHistory.push({
      timestamp: Date.now(),
      score: qualityScore,
      params: { ...this.currentParams }
    });
    
    // Update best score if better
    if (qualityScore > this.bestScore) {
      this.bestScore = qualityScore;
    }
    
    // Reset state
    this.state = OptimizationState.IDLE;
  }
  
  /**
   * Obtiene métricas de optimización
   */
  public getMetrics(): OptimizationMetrics {
    // Calculate improvement percentage
    const initialScore = this.paramsHistory.length > 0 ? this.paramsHistory[0].score : 0;
    const improvementPercentage = initialScore > 0 
      ? ((this.bestScore - initialScore) / initialScore) * 100
      : 0;
    
    return {
      currentScore: this.paramsHistory.length > 0 
        ? this.paramsHistory[this.paramsHistory.length - 1].score 
        : 0,
      bestScore: this.bestScore,
      improvementPercentage,
      optimizationCycles: this.optimizationCycles,
      lastOptimizationTime: this.lastOptimizationTime,
      paramsHistory: [...this.paramsHistory]
    };
  }
  
  /**
   * Obtiene mejores parámetros
   */
  public getBestParameters(): Record<string, number> {
    return { ...this.currentParams };
  }
  
  /**
   * Inicia proceso de optimización
   */
  public async startOptimization(
    objectiveFunction?: (params: Record<string, number>) => number
  ): Promise<Record<string, number>> {
    if (this.state === OptimizationState.OPTIMIZING) {
      logError(
        "Ya hay una optimización en curso",
        ErrorLevel.INFO,
        "ParameterOptimizer"
      );
      return this.currentParams;
    }
    
    this.state = OptimizationState.OPTIMIZING;
    this.stopRequested = false;
    
    try {
      // Usar función proporcionada o la configurada previamente
      const objFunction = objectiveFunction || this.scoreFunction;
      
      // Ejecutar optimización bayesiana
      const bestResult = await this.optimizer.optimize(
        (params) => {
          // Detener si se solicitó
          if (this.stopRequested) {
            return -Infinity; // Valor bajo para evitar seleccionar este punto
          }
          
          // Evaluar función objetivo
          return objFunction(params);
        },
        30, // Iteraciones máximas
        (iteration, params, value) => {
          // Guardar resultados
          this.results.push({
            iteration,
            params: { ...params },
            value
          });
          
          // Actualizar parámetros actuales si mejoró
          if (
            value > -Infinity && 
            (this.results.length <= 1 || 
             value > this.results[this.results.length - 2].value)
          ) {
            this.currentParams = { ...params };
          }
        }
      );
      
      // Actualizar estado y parámetros finales
      this.state = OptimizationState.COMPLETED;
      this.lastOptimizationTime = Date.now();
      this.optimizationCycles++;
      
      if (bestResult && bestResult.params) {
        this.currentParams = { ...bestResult.params };
      }
      
      return this.currentParams;
    } catch (error) {
      this.state = OptimizationState.FAILED;
      logError(
        `Error durante optimización: ${error}`,
        ErrorLevel.ERROR,
        "ParameterOptimizer"
      );
      return this.currentParams;
    }
  }
  
  /**
   * Detiene la optimización actual
   */
  public stopOptimization(): void {
    this.stopRequested = true;
    
    // La optimización se detendrá en la próxima evaluación
    logError(
      "Optimización detenida por solicitud",
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
  }
  
  /**
   * Obtiene parámetros actuales
   */
  public getCurrentParameters(): Record<string, number> {
    return { ...this.currentParams };
  }
  
  /**
   * Obtiene estado actual
   */
  public getState(): OptimizationState {
    return this.state;
  }
  
  /**
   * Obtiene resultados de optimización
   */
  public getOptimizationResults(): Array<{
    iteration: number;
    params: Record<string, number>;
    value: number;
  }> {
    return [...this.results];
  }
  
  /**
   * Reinicia optimizador
   */
  public reset(): void {
    // Reiniciar estado
    this.state = OptimizationState.IDLE;
    this.results = [];
    
    // Reiniciar optimizador
    if (this.optimizer) {
      this.optimizer.reset();
    }
    
    // Reiniciar parámetros a valores predeterminados
    this.currentParams = {};
    for (const param of this.parameters) {
      this.currentParams[param.name] = param.default;
    }
    
    logError(
      "Optimizador de parámetros reiniciado",
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
  }
}

/**
 * Crea un optimizador de parámetros de señal
 */
export function createSignalParameterOptimizer(
  parameters: OptimizationParameter[] = DEFAULT_PPG_PARAMETERS,
  options: BayesianOptimizerConfig = {}
): SignalParameterOptimizer {
  return new DefaultSignalParameterOptimizer(parameters, {
    explorationWeight: 0.25,
    maxIterations: 50,
    ...options
  });
}
