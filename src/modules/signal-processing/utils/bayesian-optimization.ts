/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE
 * 
 * Bayesian Optimization utility for PPG signal processing
 * Provides utilities for parameter optimization using Bayesian methods
 */

/**
 * Interface for optimization parameters
 */
export interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  current: number;
}

/**
 * Result of an optimization iteration
 */
export interface OptimizationResult {
  parameters: Record<string, number>;
  expectedImprovement: number;
  uncertainty: number;
}

/**
 * Bayesian optimization engine for signal processing
 */
export class BayesianOptimizer {
  private parameters: OptimizationParameter[] = [];
  private observedValues: Array<{params: Record<string, number>, score: number}> = [];
  private explorationFactor: number = 0.1;
  private readonly MAX_HISTORY_SIZE = 50;

  /**
   * Create a new optimizer with a set of parameters to optimize
   */
  constructor(parameters: OptimizationParameter[]) {
    this.parameters = parameters;
    console.log("BayesianOptimizer: Created with parameters", 
      parameters.map(p => `${p.name}: ${p.min}-${p.max}, current: ${p.current}`));
  }

  /**
   * Add an observation with current parameter values and resulting score
   */
  public addObservation(paramValues: Record<string, number>, score: number): void {
    this.observedValues.push({params: {...paramValues}, score});
    
    // Keep history bounded - memory optimization
    if (this.observedValues.length > this.MAX_HISTORY_SIZE) {
      this.observedValues.shift();
    }
    
    console.log("BayesianOptimizer: Added observation with score", score);
  }

  /**
   * Compute expected improvement for a parameter set based on observed values
   */
  private computeExpectedImprovement(paramValues: Record<string, number>): number {
    if (this.observedValues.length < 3) return 0.5;
    
    // Find best score so far
    const bestScore = Math.max(...this.observedValues.map(obs => obs.score));
    
    // Simple calculation for expected improvement (simplified Bayesian approach)
    let improvement = 0;
    
    // Calculate similarity to each observed point
    const similarityScores = this.observedValues.map(obs => {
      let similarity = 0;
      let totalWeight = 0;
      
      // Calculate distance-weighted similarity across all parameters
      for (const param of this.parameters) {
        const paramName = param.name;
        const distance = Math.abs(paramValues[paramName] - obs.params[paramName]);
        const normalizedDistance = distance / (param.max - param.min);
        const weight = 1 / (1 + normalizedDistance * 10);
        
        similarity += weight * obs.score;
        totalWeight += weight;
      }
      
      return totalWeight > 0 ? similarity / totalWeight : 0;
    });
    
    // Average similarity-weighted improvement potential
    improvement = Math.max(0, Math.max(...similarityScores) - bestScore);
    
    // Add exploration bonus
    const uncertaintyFactor = 1 - Math.min(1, this.observedValues.length / 20);
    const explorationBonus = this.explorationFactor * uncertaintyFactor;
    
    return improvement + explorationBonus;
  }

  /**
   * Calculate the uncertainty/exploration value for a parameter set
   */
  private calculateUncertainty(paramValues: Record<string, number>): number {
    if (this.observedValues.length < 2) return 1.0;
    
    // Calculate average distance to observed points
    const distances = this.observedValues.map(obs => {
      let sumSquaredDistance = 0;
      
      for (const param of this.parameters) {
        const paramName = param.name;
        const normalizedCurrent = (paramValues[paramName] - param.min) / (param.max - param.min);
        const normalizedObserved = (obs.params[paramName] - param.min) / (param.max - param.min);
        sumSquaredDistance += Math.pow(normalizedCurrent - normalizedObserved, 2);
      }
      
      return Math.sqrt(sumSquaredDistance / this.parameters.length);
    });
    
    // Uncertainty is higher when we're far from observed points
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    return Math.min(1.0, avgDistance * 2);
  }

  /**
   * Get next parameter suggestions based on observations 
   * with memory optimized processing
   */
  public suggestNextParameters(sampleCount: number = 10): OptimizationResult {
    if (this.observedValues.length === 0) {
      // If no observations yet, return initial parameter values
      const parameters: Record<string, number> = {};
      this.parameters.forEach(p => {
        parameters[p.name] = p.current;
      });
      
      return {
        parameters,
        expectedImprovement: 0.5,
        uncertainty: 1.0
      };
    }
    
    // Generate candidate parameter sets
    const candidates: Array<{
      params: Record<string, number>;
      improvement: number;
      uncertainty: number;
    }> = [];
    
    // Sample parameters with some randomness
    for (let i = 0; i < sampleCount; i++) {
      const paramSet: Record<string, number> = {};
      
      // Mix of current best and random exploration
      for (const param of this.parameters) {
        // Find best observed value for this parameter
        const bestObs = [...this.observedValues].sort((a, b) => b.score - a.score)[0];
        const bestValue = bestObs ? bestObs.params[param.name] : param.current;
        
        // Random with bias toward best values
        const useRandom = Math.random() < 0.3 + (0.4 * (i / sampleCount));
        if (useRandom) {
          // Random value within range
          paramSet[param.name] = param.min + Math.random() * (param.max - param.min);
        } else {
          // Small variation around best value
          const range = (param.max - param.min) * 0.2;
          let value = bestValue + (Math.random() - 0.5) * range;
          paramSet[param.name] = Math.min(param.max, Math.max(param.min, value));
        }
      }
      
      // Calculate improvement and uncertainty
      const improvement = this.computeExpectedImprovement(paramSet);
      const uncertainty = this.calculateUncertainty(paramSet);
      
      candidates.push({
        params: paramSet,
        improvement,
        uncertainty
      });
    }
    
    // Rank candidates by a combination of improvement and uncertainty
    candidates.sort((a, b) => {
      const scoreA = a.improvement + this.explorationFactor * a.uncertainty;
      const scoreB = b.improvement + this.explorationFactor * a.uncertainty;
      return scoreB - scoreA;
    });
    
    // Return best candidate
    const best = candidates[0];
    return {
      parameters: best.params,
      expectedImprovement: best.improvement,
      uncertainty: best.uncertainty
    };
  }

  /**
   * Set the exploration/exploitation tradeoff
   */
  public setExplorationFactor(factor: number): void {
    this.explorationFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Get the current best parameters
   */
  public getBestParameters(): Record<string, number> | null {
    if (this.observedValues.length === 0) return null;
    
    // Find best score
    const bestObservation = [...this.observedValues].sort((a, b) => b.score - a.score)[0];
    return {...bestObservation.params};
  }

  /**
   * Reset the optimizer
   */
  public reset(): void {
    this.observedValues = [];
    // We keep the parameters but reset the observations
    console.log("BayesianOptimizer: Reset");
  }
}

/**
 * Create a new Bayesian optimizer instance
 */
export function createBayesianOptimizer(parameters: OptimizationParameter[]): BayesianOptimizer {
  return new BayesianOptimizer(parameters);
}
