
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Parameter optimization system for signal processing
 * Connects the Bayesian optimizer with signal processing pipeline
 */

import { BayesianOptimizer, OptimizationParameter, createBayesianOptimizer } from './bayesian-optimization';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { safeExecute } from '@/utils/errorPrevention/utils';

// Optimization cycle states
export enum OptimizationState {
  IDLE = 'idle',
  COLLECTING = 'collecting',
  OPTIMIZING = 'optimizing',
  APPLYING = 'applying',
  EVALUATING = 'evaluating',
}

// Memory-efficient storage for optimization metrics
export interface OptimizationMetrics {
  currentScore: number;
  bestScore: number;
  improvementPercentage: number;
  optimizationCycles: number;
  lastOptimizationTime: number | null;
  paramsHistory: Array<{
    timestamp: number;
    params: Record<string, number>;
    score: number;
  }>;
}

/**
 * Manager class that integrates Bayesian optimization with signal processing
 */
export class SignalParameterOptimizer {
  private optimizer: BayesianOptimizer;
  private state: OptimizationState = OptimizationState.IDLE;
  private metrics: OptimizationMetrics;
  private readonly MAX_HISTORY_SIZE = 20;
  
  // Observation collection config
  private observationCounter: number = 0;
  private observationsNeeded: number = 10;
  private currentParams: Record<string, number> = {};
  private scoringFunction: ((params: Record<string, number>) => number) | null = null;
  private applyFunction: ((params: Record<string, number>) => void) | null = null;
  
  constructor(parameters: OptimizationParameter[]) {
    this.optimizer = createBayesianOptimizer(parameters);
    
    // Initialize current params
    parameters.forEach(p => {
      this.currentParams[p.name] = p.current;
    });
    
    // Initialize metrics with empty history
    this.metrics = {
      currentScore: 0,
      bestScore: 0,
      improvementPercentage: 0,
      optimizationCycles: 0,
      lastOptimizationTime: null,
      paramsHistory: []
    };
    
    logError(
      "SignalParameterOptimizer: Initialized with Bayesian optimizer",
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
  }
  
  /**
   * Set the function that calculates the quality score for parameters
   */
  public setScoreFunction(fn: (params: Record<string, number>) => number): void {
    this.scoringFunction = fn;
  }
  
  /**
   * Set the function that applies new parameters to the signal processor
   */
  public setApplyFunction(fn: (params: Record<string, number>) => void): void {
    this.applyFunction = fn;
  }
  
  /**
   * Configure observation collection settings
   */
  public configureObservation(observationsNeeded: number): void {
    this.observationsNeeded = Math.max(5, observationsNeeded);
  }
  
  /**
   * Start the optimization cycle
   */
  public startOptimization(): boolean {
    if (this.state !== OptimizationState.IDLE) {
      logError(
        `SignalParameterOptimizer: Cannot start optimization in ${this.state} state`,
        ErrorLevel.WARNING,
        "ParameterOptimizer"
      );
      return false;
    }
    
    if (!this.scoringFunction || !this.applyFunction) {
      logError(
        "SignalParameterOptimizer: Cannot start optimization without score and apply functions",
        ErrorLevel.ERROR,
        "ParameterOptimizer"
      );
      return false;
    }
    
    // Start collecting observations
    this.state = OptimizationState.COLLECTING;
    this.observationCounter = 0;
    
    logError(
      `SignalParameterOptimizer: Starting optimization cycle - collecting ${this.observationsNeeded} observations`,
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
    
    return true;
  }
  
  /**
   * Add a quality score observation using current parameters
   */
  public addObservation(qualityScore: number): void {
    if (this.state !== OptimizationState.COLLECTING) return;
    
    this.observationCounter++;
    
    // Add observation to optimizer
    safeExecute(
      () => {
        this.optimizer.addObservation(this.currentParams, qualityScore);
        this.metrics.currentScore = qualityScore;
        
        // Update best score if needed
        if (qualityScore > this.metrics.bestScore) {
          this.metrics.bestScore = qualityScore;
        }
      },
      (error) => {
        logError(
          `Error adding observation: ${error instanceof Error ? error.message : String(error)}`,
          ErrorLevel.ERROR,
          "ParameterOptimizer"
        );
      },
      "ParameterOptimizer",
      "addObservation"
    );
    
    // If we've collected enough observations, move to optimizing
    if (this.observationCounter >= this.observationsNeeded) {
      this.state = OptimizationState.OPTIMIZING;
      this.runOptimizationStep();
    }
  }
  
  /**
   * Run one optimization step to generate new parameters
   */
  private runOptimizationStep(): void {
    if (this.state !== OptimizationState.OPTIMIZING) return;
    
    logError(
      "SignalParameterOptimizer: Running optimization step",
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
    
    // Get parameter suggestions
    safeExecute(
      () => {
        const result = this.optimizer.suggestNextParameters(15);
        this.currentParams = result.parameters;
        
        // Move to applying phase
        this.state = OptimizationState.APPLYING;
        
        // Apply new parameters
        if (this.applyFunction) {
          this.applyFunction(this.currentParams);
        }
        
        // Record metrics
        this.metrics.optimizationCycles++;
        this.metrics.lastOptimizationTime = Date.now();
        
        // Store in history (memory-optimized)
        this.metrics.paramsHistory.push({
          timestamp: Date.now(),
          params: {...this.currentParams},
          score: this.metrics.currentScore
        });
        
        // Maintain bounded history size
        if (this.metrics.paramsHistory.length > this.MAX_HISTORY_SIZE) {
          this.metrics.paramsHistory.shift();
        }
        
        // Move to evaluation state after parameters are applied
        this.state = OptimizationState.EVALUATING;
        
        // Reset observation counter for evaluation
        this.observationCounter = 0;
      },
      (error) => {
        logError(
          `Error in optimization step: ${error instanceof Error ? error.message : String(error)}`,
          ErrorLevel.ERROR,
          "ParameterOptimizer"
        );
        // Reset to idle on error
        this.state = OptimizationState.IDLE;
      },
      "ParameterOptimizer",
      "runOptimizationStep"
    );
  }
  
  /**
   * Add an evaluation score for the newly applied parameters
   */
  public addEvaluationScore(qualityScore: number): void {
    if (this.state !== OptimizationState.EVALUATING) return;
    
    this.observationCounter++;
    this.metrics.currentScore = qualityScore;
    
    // Add to optimizer
    this.optimizer.addObservation(this.currentParams, qualityScore);
    
    // Update best score if improved
    if (qualityScore > this.metrics.bestScore) {
      const prevBest = this.metrics.bestScore;
      this.metrics.bestScore = qualityScore;
      
      // Calculate improvement
      if (prevBest > 0) {
        this.metrics.improvementPercentage = ((qualityScore - prevBest) / prevBest) * 100;
      }
      
      logError(
        `SignalParameterOptimizer: New best score ${qualityScore.toFixed(2)} (${this.metrics.improvementPercentage.toFixed(1)}% improvement)`,
        ErrorLevel.INFO,
        "ParameterOptimizer"
      );
    }
    
    // After sufficient evaluations, reset to idle
    if (this.observationCounter >= 5) {
      this.state = OptimizationState.IDLE;
      
      logError(
        "SignalParameterOptimizer: Optimization cycle completed",
        ErrorLevel.INFO,
        "ParameterOptimizer"
      );
    }
  }
  
  /**
   * Get current optimization metrics
   */
  public getMetrics(): OptimizationMetrics {
    return {...this.metrics};
  }
  
  /**
   * Get current optimization state
   */
  public getState(): OptimizationState {
    return this.state;
  }
  
  /**
   * Get the best parameters found so far
   */
  public getBestParameters(): Record<string, number> | null {
    return this.optimizer.getBestParameters();
  }
  
  /**
   * Reset the optimizer
   */
  public reset(): void {
    this.optimizer.reset();
    this.state = OptimizationState.IDLE;
    this.observationCounter = 0;
    this.metrics.paramsHistory = [];
    
    logError(
      "SignalParameterOptimizer: Reset",
      ErrorLevel.INFO,
      "ParameterOptimizer"
    );
  }
}

/**
 * Create a new signal parameter optimizer
 */
export function createSignalParameterOptimizer(
  parameters: OptimizationParameter[]
): SignalParameterOptimizer {
  return new SignalParameterOptimizer(parameters);
}
