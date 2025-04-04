
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Optimizador bayesiano unificado para procesamiento adaptativo de señales
 * Implementa algoritmos de optimización bayesiana para ajuste automático de parámetros
 */
import { BayesianDataPoint, OptimizationParameter } from '../types';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Configuración del optimizador bayesiano
 */
export interface BayesianOptimizerConfig {
  parameters: OptimizationParameter[];
  explorationFactor?: number; // Equilibrio exploración/explotación (0-1)
  maxObservations?: number;   // Número máximo de observaciones a mantener
  convergenceThreshold?: number; // Umbral para considerar convergencia
  adaptiveExploration?: boolean; // Si se debe adaptar el factor de exploración
  memoryOptimization?: boolean; // Si se debe optimizar el uso de memoria
}

/**
 * Resultado de la sugerencia del optimizador
 */
export interface OptimizationSuggestion {
  params: Record<string, number>;
  expectedImprovement: number;
  confidence: number;
  explorationFactor: number;
}

/**
 * Estado interno del optimizador
 */
interface OptimizerState {
  observations: BayesianDataPoint[];
  bestObservation: BayesianDataPoint | null;
  explorationFactor: number;
  iterations: number;
  lastImprovement: number;
  convergenceScore: number;
}

/**
 * Implementación de optimizador bayesiano con memoria optimizada
 */
export class BayesianOptimizer {
  private config: Required<BayesianOptimizerConfig>;
  private state: OptimizerState;
  
  /**
   * Constructor del optimizador
   */
  constructor(config: BayesianOptimizerConfig) {
    // Configuración por defecto
    this.config = {
      parameters: config.parameters,
      explorationFactor: config.explorationFactor ?? 0.3,
      maxObservations: config.maxObservations ?? 50,
      convergenceThreshold: config.convergenceThreshold ?? 0.01,
      adaptiveExploration: config.adaptiveExploration ?? true,
      memoryOptimization: config.memoryOptimization ?? true
    };
    
    // Estado inicial
    this.state = {
      observations: [],
      bestObservation: null,
      explorationFactor: this.config.explorationFactor,
      iterations: 0,
      lastImprovement: 0,
      convergenceScore: 0
    };
  }
  
  /**
   * Agrega una observación al modelo
   */
  public addObservation(params: Record<string, number>, value: number, metadata?: BayesianDataPoint['metadata']): void {
    try {
      // Crear punto de datos
      const observation: BayesianDataPoint = {
        params: { ...params },
        value,
        metadata: metadata || {
          timestamp: Date.now(),
          quality: 1.0,
          source: 'manual'
        }
      };
      
      // Agregar a observaciones
      this.state.observations.push(observation);
      
      // Actualizar mejor observación
      if (!this.state.bestObservation || value > this.state.bestObservation.value) {
        this.state.bestObservation = observation;
        this.state.lastImprovement = this.state.iterations;
      }
      
      // Incrementar iteraciones
      this.state.iterations++;
      
      // Ajustar factor de exploración si está habilitado
      if (this.config.adaptiveExploration) {
        this.adaptExplorationFactor();
      }
      
      // Optimizar memoria si está habilitado
      if (this.config.memoryOptimization && this.state.observations.length > this.config.maxObservations) {
        this.optimizeMemory();
      }
      
      // Actualizar puntuación de convergencia
      this.updateConvergenceScore();
    } catch (error) {
      logError(
        `Error al añadir observación al optimizador bayesiano: ${error}`,
        ErrorLevel.ERROR,
        "BayesianOptimizer"
      );
    }
  }
  
  /**
   * Optimiza el uso de memoria reduciendo observaciones menos relevantes
   */
  private optimizeMemory(): void {
    if (this.state.observations.length <= this.config.maxObservations) return;
    
    try {
      // Ordenar observaciones por relevancia
      const sortedObservations = [...this.state.observations].sort((a, b) => {
        // Criterios de relevancia:
        
        // 1. Calidad: mayor calidad es más relevante
        const qualityA = a.metadata?.quality ?? 0.5;
        const qualityB = b.metadata?.quality ?? 0.5;
        
        // 2. Tiempo: observaciones más recientes son más relevantes
        const timeA = a.metadata?.timestamp ?? 0;
        const timeB = b.metadata?.timestamp ?? 0;
        
        // 3. Valor: valores más altos son más relevantes
        const valueA = a.value;
        const valueB = b.value;
        
        // Cálculo de relevancia (mayor es mejor)
        // Peso de calidad: 0.5, peso de recencia: 0.3, peso de valor: 0.2
        const relevanceA = qualityA * 0.5 + (timeA / Date.now()) * 0.3 + (valueA / (this.state.bestObservation?.value || 1)) * 0.2;
        const relevanceB = qualityB * 0.5 + (timeB / Date.now()) * 0.3 + (valueB / (this.state.bestObservation?.value || 1)) * 0.2;
        
        // Orden descendente (mayor relevancia primero)
        return relevanceB - relevanceA;
      });
      
      // Mantener solo las observaciones más relevantes
      this.state.observations = sortedObservations.slice(0, this.config.maxObservations);
    } catch (error) {
      logError(
        `Error en optimización de memoria: ${error}`,
        ErrorLevel.WARNING,
        "BayesianOptimizer"
      );
    }
  }
  
  /**
   * Adapta el factor de exploración según el progreso
   */
  private adaptExplorationFactor(): void {
    // Número de iteraciones sin mejora
    const iterationsWithoutImprovement = this.state.iterations - this.state.lastImprovement;
    
    // Si no hay mejora en varias iteraciones, aumentar exploración
    if (iterationsWithoutImprovement > 5) {
      this.state.explorationFactor = Math.min(0.8, this.state.explorationFactor * 1.2);
    } 
    // Si hubo mejora reciente, reducir exploración gradualmente
    else if (iterationsWithoutImprovement <= 2) {
      this.state.explorationFactor = Math.max(0.1, this.state.explorationFactor * 0.9);
    }
  }
  
  /**
   * Actualiza la puntuación de convergencia
   */
  private updateConvergenceScore(): void {
    try {
      if (this.state.observations.length < 3) {
        this.state.convergenceScore = 0;
        return;
      }
      
      // Obtener últimas N observaciones
      const recentObservations = this.state.observations.slice(-5);
      
      // Calcular varianza normalizada de valores
      const values = recentObservations.map(o => o.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const normalizedVariance = variance / Math.pow(mean || 1, 2);
      
      // Convertir a puntuación de convergencia (menor varianza = mayor convergencia)
      this.state.convergenceScore = Math.max(0, 1 - Math.min(1, normalizedVariance * 10));
    } catch (error) {
      logError(
        `Error al actualizar puntuación de convergencia: ${error}`,
        ErrorLevel.WARNING,
        "BayesianOptimizer"
      );
      this.state.convergenceScore = 0;
    }
  }
  
  /**
   * Verifica si el optimizador ha convergido
   */
  public hasConverged(): boolean {
    return this.state.convergenceScore >= this.config.convergenceThreshold &&
           this.state.iterations > 10;
  }
  
  /**
   * Obtiene el siguiente punto para evaluar
   */
  public nextPointToEvaluate(): Record<string, number> {
    const suggestion = this.suggestParams();
    return suggestion.params;
  }
  
  /**
   * Sugiere nuevos parámetros para exploración/explotación
   */
  public suggestParams(): OptimizationSuggestion {
    try {
      // Si no hay suficientes observaciones, explorar parámetros por defecto
      if (this.state.observations.length < 2) {
        const defaultParams: Record<string, number> = {};
        this.config.parameters.forEach(param => {
          defaultParams[param.name] = param.default;
        });
        
        return {
          params: defaultParams,
          expectedImprovement: 0,
          confidence: 0.5,
          explorationFactor: this.state.explorationFactor
        };
      }
      
      // Determinar si explorar o explotar
      const shouldExplore = Math.random() < this.state.explorationFactor;
      
      if (shouldExplore) {
        // Exploración: generar parámetros aleatorios
        return this.exploreRandomParams();
      } else {
        // Explotación: refinar alrededor de mejores parámetros
        return this.exploitBestParams();
      }
    } catch (error) {
      logError(
        `Error al sugerir parámetros: ${error}`,
        ErrorLevel.ERROR,
        "BayesianOptimizer"
      );
      
      // Retornar parámetros por defecto en caso de error
      const defaultParams: Record<string, number> = {};
      this.config.parameters.forEach(param => {
        defaultParams[param.name] = param.default;
      });
      
      return {
        params: defaultParams,
        expectedImprovement: 0,
        confidence: 0.5,
        explorationFactor: this.state.explorationFactor
      };
    }
  }
  
  /**
   * Explora parámetros aleatorios con distribución uniforme
   */
  private exploreRandomParams(): OptimizationSuggestion {
    const params: Record<string, number> = {};
    
    this.config.parameters.forEach(param => {
      const range = param.max - param.min;
      
      // Generar valor aleatorio en el rango
      let value = param.min + Math.random() * range;
      
      // Aplicar paso si está definido
      if (param.step) {
        value = Math.round(value / param.step) * param.step;
      }
      
      // Asegurar que está en rango
      value = Math.max(param.min, Math.min(param.max, value));
      
      params[param.name] = value;
    });
    
    return {
      params,
      expectedImprovement: 0.2,
      confidence: 0.3,
      explorationFactor: this.state.explorationFactor
    };
  }
  
  /**
   * Explota alrededor de los mejores parámetros conocidos
   */
  private exploitBestParams(): OptimizationSuggestion {
    const params: Record<string, number> = {};
    
    // Si no hay mejor observación, usar valores por defecto
    if (!this.state.bestObservation) {
      this.config.parameters.forEach(param => {
        params[param.name] = param.default;
      });
      
      return {
        params,
        expectedImprovement: 0,
        confidence: 0.5,
        explorationFactor: this.state.explorationFactor
      };
    }
    
    // Partir de los mejores parámetros conocidos
    const bestParams = this.state.bestObservation.params;
    
    // Perturbar ligeramente cada parámetro
    this.config.parameters.forEach(param => {
      const currentValue = bestParams[param.name] ?? param.default;
      const range = param.max - param.min;
      
      // Pequeña perturbación alrededor del valor actual
      // Menor explorationFactor = menor perturbación
      const perturbationScale = 0.1 * this.state.explorationFactor;
      const perturbation = (Math.random() * 2 - 1) * range * perturbationScale;
      
      let value = currentValue + perturbation;
      
      // Aplicar paso si está definido
      if (param.step) {
        value = Math.round(value / param.step) * param.step;
      }
      
      // Asegurar que está en rango
      value = Math.max(param.min, Math.min(param.max, value));
      
      params[param.name] = value;
    });
    
    // Estimar mejora esperada (mayor confianza = mayor mejora esperada)
    const confidence = Math.max(0.5, 1 - this.state.explorationFactor);
    
    return {
      params,
      expectedImprovement: 0.1 * (1 / this.state.explorationFactor),
      confidence,
      explorationFactor: this.state.explorationFactor
    };
  }
  
  /**
   * Obtiene los mejores parámetros conocidos
   */
  public getBestParameters(): Record<string, number> | null {
    return this.state.bestObservation ? { ...this.state.bestObservation.params } : null;
  }
  
  /**
   * Obtiene el valor óptimo conocido
   */
  public getBestValue(): number | null {
    return this.state.bestObservation?.value ?? null;
  }
  
  /**
   * Obtiene todas las observaciones
   */
  public getObservations(): BayesianDataPoint[] {
    return [...this.state.observations];
  }
  
  /**
   * Obtiene las N mejores observaciones
   */
  public getTopObservations(n: number = 5): BayesianDataPoint[] {
    return [...this.state.observations]
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }
  
  /**
   * Obtiene el estado actual del optimizador
   */
  public getState(): any {
    return {
      observations: this.state.observations.length,
      bestValue: this.state.bestObservation?.value ?? null,
      explorationFactor: this.state.explorationFactor,
      iterations: this.state.iterations,
      convergenceScore: this.state.convergenceScore,
      hasConverged: this.hasConverged()
    };
  }
  
  /**
   * Resetea el optimizador
   */
  public reset(): void {
    this.state = {
      observations: [],
      bestObservation: null,
      explorationFactor: this.config.explorationFactor,
      iterations: 0,
      lastImprovement: 0,
      convergenceScore: 0
    };
  }
}

/**
 * Define conjuntos de parámetros predeterminados para procesamiento PPG
 */
export const DEFAULT_PPG_PARAMETERS: OptimizationParameter[] = [
  {
    name: 'amplificationFactor',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    default: 1.2,
    description: 'Factor de amplificación de señal'
  },
  {
    name: 'filterStrength',
    min: 0.1,
    max: 0.9,
    step: 0.05,
    default: 0.25,
    description: 'Fuerza del filtrado adaptativo'
  },
  {
    name: 'fingerDetectionSensitivity',
    min: 0.3,
    max: 0.9,
    step: 0.05,
    default: 0.6,
    description: 'Sensibilidad para detección de dedos'
  },
  {
    name: 'adaptationRate',
    min: 0.1,
    max: 0.5,
    step: 0.05,
    default: 0.25,
    description: 'Tasa de adaptación para ajustes dinámicos'
  }
];

/**
 * Define conjuntos de parámetros predeterminados para procesamiento de latidos
 */
export const DEFAULT_HEARTBEAT_PARAMETERS: OptimizationParameter[] = [
  {
    name: 'peakDetectionSensitivity',
    min: 0.2,
    max: 0.8,
    step: 0.05,
    default: 0.4,
    description: 'Sensibilidad para detección de picos'
  },
  {
    name: 'minPeakDistance',
    min: 200,
    max: 600,
    step: 10,
    default: 250,
    description: 'Distancia mínima entre picos (ms)'
  },
  {
    name: 'dynamicThresholdFactor',
    min: 0.3,
    max: 0.8,
    step: 0.05,
    default: 0.5,
    description: 'Factor para umbral dinámico'
  }
];

/**
 * Función para crear un optimizador bayesiano con parámetros PPG predeterminados
 */
export function createDefaultPPGOptimizer(): BayesianOptimizer {
  return new BayesianOptimizer({
    parameters: DEFAULT_PPG_PARAMETERS,
    explorationFactor: 0.3,
    maxObservations: 50,
    adaptiveExploration: true
  });
}

/**
 * Función para crear un optimizador bayesiano con parámetros de latidos predeterminados
 */
export function createHeartbeatOptimizer(): BayesianOptimizer {
  return new BayesianOptimizer({
    parameters: DEFAULT_HEARTBEAT_PARAMETERS,
    explorationFactor: 0.25,
    maxObservations: 40,
    adaptiveExploration: true
  });
}

/**
 * Crea un nuevo optimizador bayesiano con parámetros personalizados
 */
export function createBayesianOptimizer(config: BayesianOptimizerConfig): BayesianOptimizer {
  return new BayesianOptimizer(config);
}
