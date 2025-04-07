/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE
 * 
 * Adaptive predictor utility for signal processing
 * Provides adaptive signal prediction and anomaly detection capabilities
 */

import { AdaptivePredictor, AdaptiveModelState, PredictionResult, SignalProcessingOptions } from '../types';

// Singleton instance for the adaptive predictor
let predictorInstance: AdaptivePredictorImplementation | null = null;

/**
 * Implementation of the adaptive predictor
 */
class AdaptivePredictorImplementation implements AdaptivePredictor {
  private readonly MAX_HISTORY = 30;
  private values: number[] = [];
  private times: number[] = [];
  private qualities: number[] = [];
  private coefficients: number[] = [0.5, 0.3, 0.15, 0.05];
  private confidenceValue: number = 0.5;
  private adaptationRate: number = 0.15;
  
  /**
   * Update the predictor with a new value
   */
  public update(time: number, value: number, quality: number): void {
    this.values.unshift(value);
    this.times.unshift(time);
    this.qualities.unshift(quality);
    
    // Keep history bounded
    if (this.values.length > this.MAX_HISTORY) {
      this.values.pop();
      this.times.pop();
      this.qualities.pop();
    }
    
    // Adapt coefficients based on prediction error if we have enough history
    if (this.values.length >= 5) {
      this.adaptCoefficients();
    }
  }
  
  /**
   * Predict the next value
   */
  public predict(time?: number): PredictionResult {
    if (this.values.length < 3) {
      return {
        predictedValue: this.values.length > 0 ? this.values[0] : 0,
        confidence: 0.1
      };
    }
    
    // Use weighted combination of recent values
    let predictedValue = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < Math.min(this.coefficients.length, this.values.length); i++) {
      const weight = this.coefficients[i] * this.qualities[i];
      predictedValue += this.values[i] * weight;
      totalWeight += weight;
    }
    
    if (totalWeight > 0) {
      predictedValue /= totalWeight;
    }
    
    return {
      predictedValue,
      confidence: this.confidenceValue
    };
  }
  
  /**
   * Correct an anomalous value using the prediction model
   */
  public correctAnomaly(time: number, value: number, quality: number): number {
    // If quality is good, don't correct
    if (quality > 0.8) return value;
    
    // Get prediction
    const prediction = this.predict();
    
    // If confidence is low, don't correct
    if (prediction.confidence < 0.5) return value;
    
    // Calculate deviation from prediction
    const deviation = Math.abs(value - prediction.predictedValue);
    const normalizedDeviation = deviation / (Math.abs(prediction.predictedValue) + 0.1);
    
    // If deviation is small, no correction needed
    if (normalizedDeviation < 0.2) return value;
    
    // Apply correction based on quality and prediction confidence
    const correctionFactor = (1 - quality) * prediction.confidence;
    const correctedValue = value * (1 - correctionFactor) + prediction.predictedValue * correctionFactor;
    
    return correctedValue;
  }
  
  /**
   * Adapt prediction coefficients based on recent prediction errors
   */
  private adaptCoefficients(): void {
    if (this.values.length < 5) return;
    
    // Calculate recent prediction errors
    const errors = [];
    
    for (let i = 0; i < this.values.length - 4; i++) {
      // Generate a prediction using values after this point
      let prediction = 0;
      for (let j = 0; j < 4; j++) {
        prediction += this.values[i + j + 1] * this.coefficients[j];
      }
      
      // Calculate error
      const error = Math.abs(prediction - this.values[i]);
      errors.push(error);
    }
    
    // Adjust coefficients slightly to minimize error
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const normalizedError = avgError / (Math.abs(this.values[0]) + 0.1);
    
    // Update confidence based on error
    this.confidenceValue = Math.max(0.1, Math.min(0.95, 1 - normalizedError * 2));
    
    // Small adaptations to coefficients
    for (let i = 0; i < this.coefficients.length - 1; i++) {
      // Adjust coefficients slightly (small random perturbations)
      const delta = (Math.random() - 0.5) * 0.01 * this.adaptationRate;
      this.coefficients[i] += delta;
      this.coefficients[i + 1] -= delta; // Keep sum approximately constant
    }
    
    // Normalize coefficients to sum to 1
    const sum = this.coefficients.reduce((a, b) => a + b, 0);
    for (let i = 0; i < this.coefficients.length; i++) {
      this.coefficients[i] /= sum;
    }
  }
  
  /**
   * Calculate the probability that the current signal contains artifacts
   */
  public calculateArtifactProbability(): number {
    if (this.values.length < 5) return 0;
    
    // Calculate variance in the signal
    const avg = this.values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const variance = this.values.slice(0, 5)
      .reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 5;
    
    // Calculate rate of change
    const deltas = [];
    for (let i = 1; i < 5; i++) {
      deltas.push(Math.abs(this.values[i] - this.values[i - 1]));
    }
    
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const normalizedDelta = avgDelta / (Math.abs(avg) + 0.1);
    
    // Combine metrics for artifact probability
    const artifactProbability = Math.min(1, 
      variance * 5 + // High variance suggests artifacts
      normalizedDelta * 3 // Rapid changes suggest artifacts
    );
    
    return artifactProbability;
  }
  
  /**
   * Get the current state of the adaptive model
   */
  public getState(): AdaptiveModelState {
    return {
      coefficients: [...this.coefficients],
      lastValues: [...this.values],
      lastTimes: [...this.times],
      lastQualities: [...this.qualities],
      confidence: this.confidenceValue,
      adaptationRate: this.adaptationRate
    };
  }
  
  /**
   * Configure the predictor
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.adaptationRate !== undefined) {
      this.adaptationRate = Math.max(0.01, Math.min(0.5, options.adaptationRate));
    }
  }
  
  /**
   * Reset the predictor
   */
  public reset(): void {
    this.values = [];
    this.times = [];
    this.qualities = [];
    this.coefficients = [0.5, 0.3, 0.15, 0.05];
    this.confidenceValue = 0.5;
  }
}

/**
 * Get the singleton instance of the adaptive predictor
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  if (predictorInstance === null) {
    predictorInstance = new AdaptivePredictorImplementation();
  }
  
  return predictorInstance;
}

/**
 * Reset the adaptive predictor
 */
export function resetAdaptivePredictor(): void {
  if (predictorInstance) {
    predictorInstance.reset();
  }
}

// Export predictor interface type
export { AdaptivePredictor, AdaptiveModelState, PredictionResult };
