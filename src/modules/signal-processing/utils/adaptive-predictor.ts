
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Implementación de predictor adaptativo
 * Utiliza datos históricos para predecir valores futuros
 */
import { SignalProcessingOptions } from '../types';

export interface PredictionResult {
  predictedValue: number;
  confidence: number;
  predictedTimestamp?: number;
}

export interface AdaptivePredictor {
  addValue(value: number): void;
  predict(timestamp?: number): PredictionResult;
  reset(): void;
  getState(): any;
  update(timestamp: number, value: number, weight: number): void;
  configure(options: SignalProcessingOptions): void;
}

class DefaultAdaptivePredictor implements AdaptivePredictor {
  private values: number[] = [];
  private maxValues: number = 20;
  private timestamps: number[] = [];
  
  // Pesos de diferentes modelos
  private linearWeight = 0.5;
  private avgWeight = 0.3;
  private lastValueWeight = 0.2;
  
  constructor() {
    this.reset();
  }
  
  /**
   * Añade un valor al historial
   */
  public addValue(value: number): void {
    this.values.push(value);
    this.timestamps.push(Date.now());
    
    // Mantener buffers con tamaño limitado
    if (this.values.length > this.maxValues) {
      this.values.shift();
      this.timestamps.shift();
    }
  }
  
  /**
   * Actualiza el predictor con un nuevo valor
   */
  public update(timestamp: number, value: number, weight: number): void {
    this.addValue(value);
  }
  
  /**
   * Predice el próximo valor
   */
  public predict(timestamp?: number): PredictionResult {
    if (this.values.length < 3) {
      return { 
        predictedValue: this.values.length > 0 ? this.values[this.values.length - 1] : 0, 
        confidence: 0 
      };
    }
    
    // Predicción por tendencia lineal
    const linearPrediction = this.predictLinear();
    
    // Predicción por promedio móvil
    const movingAvg = this.predictMovingAverage();
    
    // Último valor conocido
    const lastValue = this.values[this.values.length - 1];
    
    // Combinar predicciones
    const predictedValue = 
      linearPrediction.value * this.linearWeight + 
      movingAvg.value * this.avgWeight + 
      lastValue * this.lastValueWeight;
    
    // Calcular confianza basada en consistencia de datos recientes
    const confidence = this.calculateConfidence();
    
    return {
      predictedValue,
      confidence
    };
  }
  
  /**
   * Reinicia el predictor
   */
  public reset(): void {
    this.values = [];
    this.timestamps = [];
  }
  
  /**
   * Obtiene el estado actual del predictor
   */
  public getState(): any {
    return {
      values: this.values,
      timestamps: this.timestamps,
      weights: {
        linearWeight: this.linearWeight,
        avgWeight: this.avgWeight,
        lastValueWeight: this.lastValueWeight
      }
    };
  }
  
  /**
   * Configura el predictor
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.adaptationRate !== undefined) {
      // Ajustar pesos según tasa de adaptación
      this.linearWeight = 0.5 - options.adaptationRate * 0.2;
      this.avgWeight = 0.3 + options.adaptationRate * 0.1;
      this.lastValueWeight = 0.2 + options.adaptationRate * 0.1;
    }
    
    if (options.maxMemoryUsage !== undefined) {
      // Ajustar tamaño máximo de buffer según uso de memoria
      this.maxValues = Math.max(10, Math.min(50, 20 + 
        Math.floor(options.maxMemoryUsage / 10)));
    }
  }
  
  /**
   * Predice usando regresión lineal simple
   */
  private predictLinear(): { value: number, confidence: number } {
    if (this.values.length < 3) {
      return { value: this.values[this.values.length - 1], confidence: 0 };
    }
    
    // Usar solo los últimos N valores para la predicción
    const n = Math.min(8, this.values.length);
    const recentValues = this.values.slice(-n);
    const recentTimestamps = this.timestamps.slice(-n).map(
      (t, i) => i // Usar índices como timestamps simplificados
    );
    
    // Calcular pendiente y punto de corte
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += recentTimestamps[i];
      sumY += recentValues[i];
      sumXY += recentTimestamps[i] * recentValues[i];
      sumX2 += recentTimestamps[i] * recentTimestamps[i];
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predecir próximo valor
    const nextX = n; // Siguiente índice
    const predictedValue = slope * nextX + intercept;
    
    // Calcular calidad de la predicción (R²)
    let meanY = sumY / n;
    let SST = 0, SSE = 0;
    
    for (let i = 0; i < n; i++) {
      const fitted = slope * recentTimestamps[i] + intercept;
      SST += Math.pow(recentValues[i] - meanY, 2);
      SSE += Math.pow(recentValues[i] - fitted, 2);
    }
    
    const r2 = SST > 0 ? 1 - (SSE / SST) : 0;
    
    return {
      value: predictedValue,
      confidence: Math.max(0, Math.min(1, r2))
    };
  }
  
  /**
   * Predice usando promedio móvil
   */
  private predictMovingAverage(): { value: number, confidence: number } {
    if (this.values.length < 2) {
      return { value: this.values[0], confidence: 0 };
    }
    
    // Promedio de los últimos valores
    const n = Math.min(5, this.values.length);
    const sum = this.values.slice(-n).reduce((a, b) => a + b, 0);
    const avg = sum / n;
    
    // Calcular varianza como medida de confianza (menor varianza = mayor confianza)
    let variance = 0;
    const recentValues = this.values.slice(-n);
    for (const val of recentValues) {
      variance += Math.pow(val - avg, 2);
    }
    variance /= n;
    
    // Normalizar confianza: menor varianza = mayor confianza
    const confidence = Math.max(0, Math.min(1, 1 / (1 + variance * 10)));
    
    return {
      value: avg,
      confidence
    };
  }
  
  /**
   * Calcula confianza basada en consistencia de datos
   */
  private calculateConfidence(): number {
    if (this.values.length < 3) {
      return 0.1;
    }
    
    // Calcular variación en últimos valores
    const recentValues = this.values.slice(-5);
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    let variance = 0;
    for (const val of recentValues) {
      variance += Math.pow(val - avg, 2);
    }
    variance /= recentValues.length;
    
    // Calcular estabilidad de período (variación en intervalos de tiempo)
    let timeVariance = 0;
    if (this.timestamps.length > 3) {
      const intervals = [];
      for (let i = 1; i < this.timestamps.length; i++) {
        intervals.push(this.timestamps[i] - this.timestamps[i-1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      for (const interval of intervals) {
        timeVariance += Math.pow(interval - avgInterval, 2);
      }
      timeVariance /= intervals.length;
    }
    
    // Normalizar factores y combinar para confianza general
    const valueStability = Math.max(0, Math.min(1, 1 / (1 + variance * 20)));
    const timeStability = Math.max(0, Math.min(1, 1 / (1 + timeVariance * 0.01)));
    
    return valueStability * 0.7 + timeStability * 0.3;
  }
}

// Singleton
let predictor: AdaptivePredictor | null = null;

/**
 * Obtiene la instancia del predictor adaptativo
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  if (!predictor) {
    predictor = new DefaultAdaptivePredictor();
  }
  return predictor;
}
