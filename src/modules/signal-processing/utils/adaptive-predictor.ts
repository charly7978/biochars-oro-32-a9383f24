
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Adaptive predictor for signal processing
 */

import { SignalProcessingOptions, AdaptivePredictor } from '../types';
import { CircularBuffer } from './circular-buffer';

interface DataPoint {
  timestamp: number;
  value: number;
  confidence: number;
}

/**
 * Simple implementation of adaptive prediction for signal processing
 */
class SimpleAdaptivePredictor implements AdaptivePredictor {
  private dataPoints: CircularBuffer<DataPoint>;
  private lastPrediction: { value: number; confidence: number } = { value: 0, confidence: 0 };
  private adaptationRate: number = 0.15;
  private predictionHorizon: number = 100; // ms
  
  constructor() {
    // Initialize buffer with 30 data points capacity
    this.dataPoints = new CircularBuffer<DataPoint>(30);
  }
  
  /**
   * Update the predictor with a new data point
   */
  update(timestamp: number, value: number, confidence: number): void {
    this.dataPoints.push({ timestamp, value, confidence });
  }
  
  /**
   * Predict the next value based on observed patterns
   */
  predict(timestamp?: number): { predictedValue: number; confidence: number } {
    if (this.dataPoints.getSize() < 3) {
      // Not enough data to make a prediction
      return { predictedValue: 0, confidence: 0 };
    }
    
    const data = this.dataPoints.toArray();
    const recent = data.slice(-3);
    
    // Compute trend based on recent data
    const trend = (recent[2].value - recent[0].value) / 2;
    
    // Use weighted average for prediction
    const baseValue = recent[2].value;
    const adaptedValue = baseValue + trend * this.adaptationRate;
    
    // Calculate confidence based on consistency
    let confidenceSum = 0;
    for (const point of recent) {
      confidenceSum += point.confidence;
    }
    
    const confidence = confidenceSum / recent.length;
    this.lastPrediction = { value: adaptedValue, confidence };
    
    return {
      predictedValue: adaptedValue,
      confidence
    };
  }

  /**
   * Get the current state of the predictor
   */
  getState(): any {
    return {
      adaptationRate: this.adaptationRate,
      predictionHorizon: this.predictionHorizon,
      lastPrediction: this.lastPrediction,
      dataPointCount: this.dataPoints.getSize()
    };
  }
  
  /**
   * Reset the predictor's state
   */
  reset(): void {
    this.dataPoints.clear();
    this.lastPrediction = { value: 0, confidence: 0 };
  }
  
  /**
   * Configure the predictor with options
   */
  configure(options: SignalProcessingOptions): void {
    if (options.adaptationRate !== undefined) {
      this.adaptationRate = Math.max(0.01, Math.min(1.0, options.adaptationRate));
    }
    
    if (options.predictionHorizon !== undefined) {
      this.predictionHorizon = Math.max(10, Math.min(1000, options.predictionHorizon));
    }
  }
}

/**
 * Create and return an adaptive predictor instance
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  return new SimpleAdaptivePredictor();
}
