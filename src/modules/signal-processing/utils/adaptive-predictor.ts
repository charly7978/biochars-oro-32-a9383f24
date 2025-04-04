
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Módulo de predicción adaptativa para señales PPG
 * Implementa predicción basada en modelos adaptativos
 */
import { SignalProcessingOptions } from '../types';
import { BayesianOptimizer } from './bayesian-optimization';

/**
 * Resultado de una predicción
 */
export interface PredictionResult {
  predictedValue: number;
  confidence: number;
  predictedTimestamp: number;
}

/**
 * Modelo de predicción adaptativa
 */
export interface AdaptivePredictor {
  /**
   * Actualiza el modelo con un nuevo valor
   */
  update(timestamp: number, value: number, confidence: number): void;
  
  /**
   * Predice el valor para un timestamp dado
   */
  predict(timestamp: number): PredictionResult;
  
  /**
   * Obtiene el estado actual del predictor
   */
  getState(): any;
  
  /**
   * Configura el predictor
   */
  configure(options: SignalProcessingOptions): void;
  
  /**
   * Reinicia el predictor
   */
  reset(): void;
}

/**
 * Implementación de predictor adaptativo
 */
class DefaultAdaptivePredictor implements AdaptivePredictor {
  // Historia de valores para el modelo
  private values: Array<{ timestamp: number; value: number; confidence: number }> = [];
  
  // Capacidad del buffer de historia
  private readonly bufferCapacity: number = 30;
  
  // Factores de adaptación
  private adaptationRate: number = 0.2;
  private confidenceThreshold: number = 0.4;
  
  // Modelo de tendencia
  private trendModel: { a: number; b: number } = { a: 0, b: 0 }; // y = a + b*x
  
  // Estado de adaptación
  private lastUpdateTime: number = 0;
  
  // Optimizador bayesiano para parámetros
  private optimizer: BayesianOptimizer | null = null;
  
  constructor() {
    // Inicialización
  }
  
  /**
   * Actualiza el modelo con un nuevo valor
   * @param timestamp Marca de tiempo
   * @param value Valor de la señal
   * @param confidence Confianza en el valor (0-1)
   */
  public update(timestamp: number, value: number, confidence: number): void {
    // Almacenar el valor
    this.values.push({ timestamp, value, confidence });
    
    // Limitar tamaño del buffer
    if (this.values.length > this.bufferCapacity) {
      this.values.shift();
    }
    
    // Si la confianza está por encima del umbral, actualizar el modelo
    if (confidence >= this.confidenceThreshold && this.values.length >= 3) {
      this.updateModel();
    }
    
    this.lastUpdateTime = timestamp;
  }
  
  /**
   * Actualiza el modelo adaptativo
   */
  private updateModel(): void {
    if (this.values.length < 3) return;
    
    // Filtrar valores con confianza suficiente
    const validValues = this.values.filter(v => v.confidence >= this.confidenceThreshold);
    if (validValues.length < 3) return;
    
    // Calcular regresión lineal ponderada por confianza
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumWeight = 0;
    
    // Normalizar timestamps
    const firstTime = validValues[0].timestamp;
    
    validValues.forEach(point => {
      const x = (point.timestamp - firstTime) / 1000; // Normalizar a segundos
      const y = point.value;
      const weight = point.confidence;
      
      sumX += x * weight;
      sumY += y * weight;
      sumXY += x * y * weight;
      sumX2 += x * x * weight;
      sumWeight += weight;
    });
    
    // Evitar división por cero
    if (sumWeight === 0 || sumX2 * sumWeight - sumX * sumX === 0) return;
    
    // Calcular coeficientes de regresión lineal
    const meanX = sumX / sumWeight;
    const meanY = sumY / sumWeight;
    
    const b = (sumXY - sumX * sumY / sumWeight) / (sumX2 - sumX * sumX / sumWeight);
    const a = meanY - b * meanX;
    
    // Actualizar modelo con adaptación gradual
    this.trendModel.a = (1 - this.adaptationRate) * this.trendModel.a + this.adaptationRate * a;
    this.trendModel.b = (1 - this.adaptationRate) * this.trendModel.b + this.adaptationRate * b;
  }
  
  /**
   * Predice el valor para un timestamp dado
   * @param timestamp Marca de tiempo para la predicción
   */
  public predict(timestamp: number): PredictionResult {
    // Si no hay suficientes datos, devolver predicción de baja confianza
    if (this.values.length < 3) {
      return {
        predictedValue: this.values.length > 0 ? this.values[this.values.length - 1].value : 0,
        confidence: 0.1,
        predictedTimestamp: timestamp
      };
    }
    
    // Normalizar timestamp
    const firstTime = this.values[0].timestamp;
    const x = (timestamp - firstTime) / 1000; // Normalizar a segundos
    
    // Predicción lineal
    const predictedValue = this.trendModel.a + this.trendModel.b * x;
    
    // Calcular confianza basada en:
    // - Recencia de los datos (decae con el tiempo)
    // - Estabilidad del modelo
    const timeSinceUpdate = (timestamp - this.lastUpdateTime) / 1000; // segundos
    const timeDecay = Math.exp(-timeSinceUpdate / 2); // decae exponencialmente
    
    // Variabilidad del modelo (menor variabilidad, mayor confianza)
    const recentValues = this.values.slice(-5);
    let variability = 0;
    
    if (recentValues.length >= 3) {
      const values = recentValues.map(v => v.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      variability = Math.sqrt(variance) / Math.abs(mean || 1);
    }
    
    // Combinar factores para la confianza final
    const stableModelFactor = Math.max(0, 1 - Math.min(1, variability * 5));
    
    // Confianza final (0-1)
    const confidence = Math.min(0.95, timeDecay * 0.7 + stableModelFactor * 0.3);
    
    return {
      predictedValue,
      confidence,
      predictedTimestamp: timestamp
    };
  }
  
  /**
   * Obtiene el estado interno del predictor
   */
  public getState(): any {
    return {
      valuesCount: this.values.length,
      model: { ...this.trendModel },
      adaptationRate: this.adaptationRate,
      confidenceThreshold: this.confidenceThreshold,
      lastUpdateTime: this.lastUpdateTime
    };
  }
  
  /**
   * Configura el predictor con parámetros personalizados
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.adaptationRate !== undefined) {
      this.adaptationRate = Math.max(0.05, Math.min(0.5, options.adaptationRate));
    }
    
    // Usar propiedad custom para el umbral de confianza
    if (options.signalQualityThreshold !== undefined) {
      this.confidenceThreshold = Math.max(0.1, Math.min(0.9, options.signalQualityThreshold / 100));
    }
  }
  
  /**
   * Reinicia el predictor
   */
  public reset(): void {
    this.values = [];
    this.trendModel = { a: 0, b: 0 };
    this.lastUpdateTime = 0;
  }
}

/**
 * Instancia singleton del predictor adaptativo
 */
let adaptivePredictor: AdaptivePredictor | null = null;

/**
 * Obtiene la instancia del predictor adaptativo
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  if (!adaptivePredictor) {
    adaptivePredictor = new DefaultAdaptivePredictor();
  }
  return adaptivePredictor;
}
