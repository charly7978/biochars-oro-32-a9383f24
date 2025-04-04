
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Implementación de optimización bayesiana para ajustar parámetros
 * Optimiza parámetros de procesamiento de señales basados en métricas de calidad
 * No usa simulación, solo optimiza parámetros basados en datos reales
 */

/**
 * Tipo para definir un parámetro a optimizar con sus rangos y paso
 */
export interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  step: number;
  initialValue?: number;
}

/**
 * Tipo para un punto de datos observado
 */
export interface DataPoint {
  params: Record<string, number>;
  score: number;
}

/**
 * Optimizador bayesiano que ajusta parámetros basados en observaciones
 */
export class BayesianOptimizer {
  private parameters: OptimizationParameter[];
  private observations: DataPoint[] = [];
  private bestObservation: DataPoint | null = null;
  private explorationFactor: number = 0.3;
  private maxObservationsStored: number = 50;
  
  /**
   * Constructor del optimizador
   * @param parameters Lista de parámetros a optimizar
   */
  constructor(parameters: OptimizationParameter[]) {
    this.parameters = [...parameters];
  }
  
  /**
   * Añade una observación al optimizador
   * @param params Valores de parámetros 
   * @param score Puntuación de calidad obtenida
   */
  public addObservation(params: Record<string, number>, score: number): void {
    const observation: DataPoint = { params: { ...params }, score };
    this.observations.push(observation);
    
    // Actualizar la mejor observación
    if (!this.bestObservation || score > this.bestObservation.score) {
      this.bestObservation = observation;
    }
    
    // Limitar el número de observaciones almacenadas
    this.pruneObservations();
  }
  
  /**
   * Limita el número de observaciones almacenadas, manteniendo las mejores y más recientes
   */
  private pruneObservations(): void {
    if (this.observations.length <= this.maxObservationsStored) {
      return;
    }
    
    // Ordenar observaciones por puntuación de mayor a menor
    const sortedObservations = [...this.observations].sort((a, b) => b.score - a.score);
    
    // Mantener el 50% de las mejores observaciones
    const topHalf = sortedObservations.slice(0, Math.floor(this.maxObservationsStored / 2));
    
    // Mantener las observaciones más recientes para el otro 50%
    const recentHalf = this.observations.slice(-Math.floor(this.maxObservationsStored / 2));
    
    // Combinar y eliminar duplicados
    const combined = [...topHalf];
    recentHalf.forEach(obs => {
      if (!combined.some(existing => this.areParamsEqual(existing.params, obs.params))) {
        combined.push(obs);
      }
    });
    
    // Limitar al máximo permitido
    this.observations = combined.slice(0, this.maxObservationsStored);
  }
  
  /**
   * Compara si dos conjuntos de parámetros son iguales
   */
  private areParamsEqual(params1: Record<string, number>, params2: Record<string, number>): boolean {
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      params1[key] === params2[key] || 
      (Math.abs(params1[key] - params2[key]) < 0.001)
    );
  }
  
  /**
   * Genera el siguiente punto a evaluar, balanceando exploración y explotación
   */
  public nextPointToEvaluate(): Record<string, number> {
    // Si no hay suficientes observaciones, explorar el espacio de parámetros
    if (this.observations.length < 5) {
      return this.generateRandomPoint();
    }
    
    // Decidir si explorar o explotar basado en el factor de exploración
    const shouldExplore = Math.random() < this.explorationFactor;
    
    if (shouldExplore) {
      // Exploración: generar un punto aleatorio lejos de los observados
      return this.generateExplorationPoint();
    } else {
      // Explotación: usar regresión gaussiana para predecir el mejor punto
      return this.exploitBestRegion();
    }
  }
  
  /**
   * Genera un punto completamente aleatorio dentro de los rangos
   */
  private generateRandomPoint(): Record<string, number> {
    const point: Record<string, number> = {};
    
    this.parameters.forEach(param => {
      const numSteps = Math.floor((param.max - param.min) / param.step);
      const randomStep = Math.floor(Math.random() * numSteps);
      point[param.name] = param.min + randomStep * param.step;
    });
    
    return point;
  }
  
  /**
   * Genera un punto de exploración lejos de los observados
   */
  private generateExplorationPoint(): Record<string, number> {
    // Intentar varias veces generar un punto distante
    let bestDistance = -1;
    let bestPoint: Record<string, number> = {};
    
    for (let i = 0; i < 10; i++) {
      const candidatePoint = this.generateRandomPoint();
      const minDistance = this.getMinDistanceToObservations(candidatePoint);
      
      if (minDistance > bestDistance) {
        bestDistance = minDistance;
        bestPoint = candidatePoint;
      }
    }
    
    return bestPoint;
  }
  
  /**
   * Calcula la distancia mínima de un punto a todas las observaciones
   */
  private getMinDistanceToObservations(point: Record<string, number>): number {
    if (this.observations.length === 0) return Infinity;
    
    return Math.min(...this.observations.map(obs => 
      this.calculateDistance(point, obs.params)
    ));
  }
  
  /**
   * Calcula la distancia euclidiana normalizada entre dos puntos
   */
  private calculateDistance(point1: Record<string, number>, point2: Record<string, number>): number {
    let sumSquaredDiffs = 0;
    
    this.parameters.forEach(param => {
      const name = param.name;
      const diff = (point1[name] - point2[name]) / (param.max - param.min);
      sumSquaredDiffs += diff * diff;
    });
    
    return Math.sqrt(sumSquaredDiffs);
  }
  
  /**
   * Explota la mejor región observada basándose en los datos
   */
  private exploitBestRegion(): Record<string, number> {
    if (this.observations.length < 3 || !this.bestObservation) {
      return this.generateRandomPoint();
    }
    
    // Usar la mejor observación como base
    const bestParams = this.bestObservation.params;
    const result: Record<string, number> = {};
    
    // Para cada parámetro, perturbar ligeramente cerca del mejor valor
    this.parameters.forEach(param => {
      const name = param.name;
      const bestValue = bestParams[name];
      
      // Calcular rango de perturbación (más pequeño cuantas más observaciones)
      const perturbationRange = Math.max(
        param.step,
        (param.max - param.min) * (10 / (this.observations.length + 10))
      );
      
      // Perturbar el valor dentro del rango permitido
      let newValue = bestValue + (Math.random() * 2 - 1) * perturbationRange;
      
      // Asegurar que el valor está dentro de los límites y es múltiplo del paso
      newValue = Math.max(param.min, Math.min(param.max, newValue));
      const steps = Math.round((newValue - param.min) / param.step);
      newValue = param.min + steps * param.step;
      
      result[name] = newValue;
    });
    
    return result;
  }
  
  /**
   * Obtiene los mejores parámetros encontrados hasta ahora
   */
  public getBestParameters(): Record<string, number> | null {
    return this.bestObservation ? { ...this.bestObservation.params } : null;
  }
  
  /**
   * Obtiene la mejor puntuación encontrada hasta ahora
   */
  public getBestScore(): number {
    return this.bestObservation ? this.bestObservation.score : 0;
  }
  
  /**
   * Obtiene todas las observaciones almacenadas
   */
  public getObservations(): DataPoint[] {
    return [...this.observations];
  }
  
  /**
   * Ajusta el factor de exploración
   * @param factor Valor entre 0 (solo explotación) y 1 (solo exploración)
   */
  public setExplorationFactor(factor: number): void {
    this.explorationFactor = Math.max(0, Math.min(1, factor));
  }
  
  /**
   * Ajusta el número máximo de observaciones a almacenar
   */
  public setMaxObservationsStored(max: number): void {
    this.maxObservationsStored = Math.max(10, max);
    this.pruneObservations();
  }
  
  /**
   * Reinicia el optimizador manteniendo los parámetros
   */
  public reset(): void {
    this.observations = [];
    this.bestObservation = null;
  }
}

/**
 * Crea un optimizador para señales PPG con parámetros preconfigurados
 */
export function createDefaultPPGOptimizer(): BayesianOptimizer {
  // Parámetros comunes para procesamiento de señales PPG
  const parameters: OptimizationParameter[] = [
    {
      name: 'amplificationFactor',
      min: 0.8,
      max: 2.0,
      step: 0.05,
      initialValue: 1.2
    },
    {
      name: 'filterStrength',
      min: 0.1,
      max: 0.7,
      step: 0.05,
      initialValue: 0.25
    },
    {
      name: 'qualityThreshold',
      min: 15,
      max: 50,
      step: 2.5,
      initialValue: 30
    },
    {
      name: 'fingerDetectionSensitivity',
      min: 0.3,
      max: 0.95,
      step: 0.05,
      initialValue: 0.6
    }
  ];
  
  return new BayesianOptimizer(parameters);
}

/**
 * Crea un optimizador para detección de picos cardíacos
 */
export function createHeartbeatOptimizer(): BayesianOptimizer {
  const parameters: OptimizationParameter[] = [
    {
      name: 'peakThreshold',
      min: 0.05,
      max: 0.3,
      step: 0.01,
      initialValue: 0.15
    },
    {
      name: 'dynamicThresholdFactor',
      min: 0.3,
      max: 0.9,
      step: 0.05,
      initialValue: 0.5
    },
    {
      name: 'minPeakDistance',
      min: 200,
      max: 500,
      step: 10,
      initialValue: 230
    }
  ];
  
  return new BayesianOptimizer(parameters);
}
