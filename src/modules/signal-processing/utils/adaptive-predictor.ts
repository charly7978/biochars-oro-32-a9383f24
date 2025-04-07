
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Adaptive predictor for signal processing
 */

/**
 * Result of a prediction
 */
export interface PredictionResult {
  predictedValue: number;
  confidence: number;
  error?: number;
}

/**
 * Adaptive predictor parameters
 */
export interface AdaptivePredictorParams {
  windowSize?: number;
  learningRate?: number;
  adaptationRate?: number;
}

/**
 * Simple adaptive predictor using moving average
 */
export class AdaptivePredictor {
  private values: number[] = [];
  private weights: number[] = [];
  private lastPrediction: number | null = null;
  private confidence: number = 0;
  
  private readonly windowSize: number;
  private readonly learningRate: number;
  private readonly adaptationRate: number;
  
  constructor({
    windowSize = 10,
    learningRate = 0.1,
    adaptationRate = 0.05
  }: AdaptivePredictorParams = {}) {
    this.windowSize = windowSize;
    this.learningRate = learningRate;
    this.adaptationRate = adaptationRate;
    
    // Initialize weights to equal distribution
    this.weights = Array(windowSize).fill(1 / windowSize);
  }
  
  /**
   * Add a value to the predictor
   */
  public addValue(value: number): void {
    this.values.push(value);
    
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }
    
    // Update weights based on prediction error
    if (this.lastPrediction !== null) {
      const error = Math.abs(value - this.lastPrediction);
      this.updateWeights(error);
      
      // Update confidence based on error
      const normalizedError = Math.min(1, error / Math.abs(value));
      this.confidence = (1 - normalizedError) * 0.9 + this.confidence * 0.1;
    } else {
      this.confidence = 0.5; // Initial confidence
    }
  }
  
  /**
   * Predict the next value
   */
  public predict(): PredictionResult {
    if (this.values.length === 0) {
      return { predictedValue: 0, confidence: 0 };
    }
    
    if (this.values.length < this.windowSize) {
      // Not enough data, use simple average
      const avg = this.values.reduce((sum, val) => sum + val, 0) / this.values.length;
      this.lastPrediction = avg;
      return { predictedValue: avg, confidence: 0.5 };
    }
    
    // Weighted prediction
    let prediction = 0;
    for (let i = 0; i < this.values.length; i++) {
      prediction += this.values[i] * this.weights[i];
    }
    
    this.lastPrediction = prediction;
    return { 
      predictedValue: prediction, 
      confidence: this.confidence
    };
  }
  
  /**
   * Update weights based on prediction error
   */
  private updateWeights(error: number): void {
    if (this.values.length < this.windowSize) {
      return;
    }
    
    // Normalize error
    const normalizedError = Math.min(1, error / Math.abs(this.lastPrediction || 1));
    
    // Update weights - reduce weight for values that contributed more to error
    const sumValues = this.values.reduce((sum, val) => sum + Math.abs(val), 0);
    
    for (let i = 0; i < this.weights.length; i++) {
      const contribution = Math.abs(this.values[i]) / sumValues;
      const adjustment = this.learningRate * normalizedError * contribution;
      
      // Reduce weight proportionally to contribution
      this.weights[i] = Math.max(0.01, this.weights[i] - adjustment);
    }
    
    // Normalize weights to sum to 1
    const sumWeights = this.weights.reduce((sum, w) => sum + w, 0);
    this.weights = this.weights.map(w => w / sumWeights);
  }
  
  /**
   * Reset the predictor
   */
  public reset(): void {
    this.values = [];
    this.weights = Array(this.windowSize).fill(1 / this.windowSize);
    this.lastPrediction = null;
    this.confidence = 0;
  }
  
  /**
   * Get current state
   */
  public getState(): {
    values: number[];
    weights: number[];
    lastPrediction: number | null;
    confidence: number;
  } {
    return {
      values: [...this.values],
      weights: [...this.weights],
      lastPrediction: this.lastPrediction,
      confidence: this.confidence
    };
  }
}

/**
 * Get a shared adaptive predictor instance
 */
let sharedPredictor: AdaptivePredictor | null = null;

export function getAdaptivePredictor(params?: AdaptivePredictorParams): AdaptivePredictor {
  if (!sharedPredictor) {
    sharedPredictor = new AdaptivePredictor(params);
  }
  
  return sharedPredictor;
}
