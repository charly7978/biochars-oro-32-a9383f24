
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE
 * 
 * Parameter optimization utilities for signal processing
 */

import { BayesianOptimizer } from './bayesian-optimization';
import { BayesianOptimizerConfig } from '../types';

/**
 * Interface for optimization results
 */
export interface OptimizationState {
  iteration: number;
  currentBest: {
    params: Record<string, number>;
    score: number;
  };
  lastParams: Record<string, number>;
  improvement: number;
  terminated: boolean;
}

/**
 * Parameter optimization manager
 */
export class ParameterOptimizer {
  private optimizer: BayesianOptimizer;
  private state: OptimizationState;
  private maxIterations: number;
  private minImprovement: number;
  
  /**
   * Create a new parameter optimizer
   * 
   * @param config Configuration for the Bayesian optimizer
   * @param maxIterations Maximum number of iterations
   * @param minImprovement Minimum relative improvement to continue
   */
  constructor(
    config: Array<{
      name: string;
      min: number;
      max: number;
      current: number;
    }>,
    maxIterations: number = 50,
    minImprovement: number = 0.02
  ) {
    this.optimizer = new BayesianOptimizer(config);
    
    this.state = {
      iteration: 0,
      currentBest: {
        params: {},
        score: -Infinity
      },
      lastParams: {},
      improvement: 1.0,
      terminated: false
    };
    
    this.maxIterations = maxIterations;
    this.minImprovement = minImprovement;
    
    // Initialize with default values
    config.forEach(param => {
      this.state.lastParams[param.name] = param.current;
    });
  }
  
  /**
   * Get the next set of parameters to try
   */
  public getNextParameters(): Record<string, number> {
    if (this.isTerminated()) {
      return this.state.currentBest.params;
    }
    
    const result = this.optimizer.suggestNextParameters();
    this.state.lastParams = result.parameters;
    return result.parameters;
  }
  
  /**
   * Add a score for the last suggested parameters
   */
  public addScore(score: number): void {
    this.optimizer.addObservation(this.state.lastParams, score);
    
    // Update current best if improved
    if (score > this.state.currentBest.score) {
      const relativeImprovement = 
        this.state.currentBest.score === -Infinity ? 
          1.0 : 
          (score - this.state.currentBest.score) / Math.abs(this.state.currentBest.score + 0.000001);
      
      this.state.improvement = relativeImprovement;
      this.state.currentBest = {
        params: { ...this.state.lastParams },
        score
      };
    } else {
      this.state.improvement = 0;
    }
    
    // Increment iteration counter
    this.state.iteration++;
    
    // Check termination conditions
    if (
      this.state.iteration >= this.maxIterations ||
      this.state.improvement < this.minImprovement
    ) {
      this.state.terminated = true;
    }
  }
  
  /**
   * Check if the optimization has terminated
   */
  public isTerminated(): boolean {
    return this.state.terminated;
  }
  
  /**
   * Get the current optimization state
   */
  public getState(): OptimizationState {
    return { ...this.state };
  }
  
  /**
   * Reset the optimizer
   */
  public reset(): void {
    this.optimizer.reset();
    this.state.iteration = 0;
    this.state.improvement = 1.0;
    this.state.terminated = false;
    this.state.currentBest = {
      params: {},
      score: -Infinity
    };
  }
}

/**
 * Factory function to create a parameter optimizer
 */
export function createParameterOptimizer(
  config: Array<{
    name: string;
    min: number;
    max: number;
    current: number;
  }>,
  maxIterations?: number,
  minImprovement?: number
): ParameterOptimizer {
  return new ParameterOptimizer(
    config,
    maxIterations,
    minImprovement
  );
}
