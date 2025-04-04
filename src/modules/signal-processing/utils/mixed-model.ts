
/**
 * Mixed model utility for signal processing
 * Provides utility functions for working with mixed models
 */

export interface MixedModel {
  predict: (input: number) => number;
  update: (input: number, target: number) => void;
  reset: () => void;
  getConfidence: () => number;
}

class SimpleMixedModel implements MixedModel {
  private readonly HISTORY_SIZE = 50;
  private inputs: number[] = [];
  private targets: number[] = [];
  private learningRate: number = 0.01;
  private lastConfidence: number = 0.5;
  
  constructor() {
    this.reset();
  }
  
  predict(input: number): number {
    if (this.inputs.length < 5) {
      return input;
    }
    
    // Very simple prediction for now
    const predictionSum = this.inputs.reduce((sum, val, i) => {
      const weight = Math.exp(-(this.inputs.length - i) * 0.1);
      return sum + (val * weight);
    }, 0);
    
    const weightSum = this.inputs.reduce((sum, _, i) => {
      return sum + Math.exp(-(this.inputs.length - i) * 0.1);
    }, 0);
    
    return predictionSum / weightSum;
  }
  
  update(input: number, target: number): void {
    // Store values
    this.inputs.push(input);
    this.targets.push(target);
    
    // Maintain history size
    if (this.inputs.length > this.HISTORY_SIZE) {
      this.inputs.shift();
      this.targets.shift();
    }
    
    // Update confidence based on prediction accuracy
    if (this.inputs.length > 10) {
      const predictions = this.inputs.slice(0, -1).map(this.predict.bind(this));
      const targetValues = this.targets.slice(1);
      
      // Calculate mean squared error
      let mse = 0;
      for (let i = 0; i < predictions.length; i++) {
        mse += Math.pow(predictions[i] - targetValues[i], 2);
      }
      mse /= predictions.length;
      
      // Convert MSE to confidence (lower MSE = higher confidence)
      this.lastConfidence = Math.max(0.1, Math.min(0.9, 1 - (mse * 10)));
    }
  }
  
  reset(): void {
    this.inputs = [];
    this.targets = [];
    this.lastConfidence = 0.5;
  }
  
  getConfidence(): number {
    return this.lastConfidence;
  }
}

let mixedModelInstance: MixedModel | null = null;

export function getMixedModel(): MixedModel {
  if (!mixedModelInstance) {
    mixedModelInstance = new SimpleMixedModel();
  }
  return mixedModelInstance;
}

export function resetMixedModel(): void {
  if (mixedModelInstance) {
    mixedModelInstance.reset();
  }
}
