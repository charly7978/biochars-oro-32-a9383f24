
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Predictor adaptativo para señales biométricas
 * Implementa algoritmos de predicción para mejorar la calidad de señal
 */
import { PredictionResult, SignalProcessingOptions } from '../types';
import { CircularBuffer } from './circular-buffer';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Interfaz del predictor adaptativo
 */
export interface AdaptivePredictor {
  update(timestamp: number, value: number, confidence: number): void;
  predict(timestamp: number): PredictionResult;
  reset(): void;
  configure(options: Partial<SignalProcessingOptions>): void;
  getState(): any;
}

/**
 * Implementación predeterminada del predictor adaptativo
 */
class DefaultAdaptivePredictor implements AdaptivePredictor {
  private valuesBuffer: CircularBuffer<{ timestamp: number; value: number; confidence: number }>;
  private lastPrediction: PredictionResult | null = null;
  private adaptationRate: number = 0.25;
  private modelWeights: number[] = [0.5, 0.3, 0.15, 0.05];
  private confidenceThreshold: number = 0.5;
  
  constructor() {
    this.valuesBuffer = new CircularBuffer(20, true, true);
  }
  
  /**
   * Actualiza el modelo con un nuevo valor observado
   */
  public update(timestamp: number, value: number, confidence: number): void {
    try {
      // Almacenar valor con timestamp y confianza
      this.valuesBuffer.push({ timestamp, value, confidence });
      
      // Actualizar pesos del modelo si la confianza es alta
      if (confidence > this.confidenceThreshold && this.valuesBuffer.getSize() >= 4) {
        this.updateModelWeights();
      }
    } catch (error) {
      logError(
        `Error actualizando predictor adaptativo: ${error}`,
        ErrorLevel.WARNING,
        "AdaptivePredictor"
      );
    }
  }
  
  /**
   * Predice el valor para un timestamp dado
   */
  public predict(timestamp: number): PredictionResult {
    try {
      // Si no hay suficientes datos, no se puede predecir
      if (this.valuesBuffer.getSize() < 2) {
        const lastValue = this.valuesBuffer.getSize() > 0 
          ? this.valuesBuffer.getLastN(1)[0].value 
          : 0;
          
        return {
          predictedValue: lastValue,
          confidence: 0.1
        };
      }
      
      // Obtener valores recientes
      const recentValues = this.valuesBuffer.getLastN(4);
      
      // Calcular intervalos de tiempo para ajustar la predicción
      const intervals: number[] = [];
      for (let i = 1; i < recentValues.length; i++) {
        intervals.push(recentValues[i].timestamp - recentValues[i-1].timestamp);
      }
      
      // Calcular intervalo promedio
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / 
                         Math.max(1, intervals.length);
      
      // Calcular tiempo transcurrido desde la última muestra
      const mostRecent = recentValues[recentValues.length - 1];
      const elapsed = timestamp - mostRecent.timestamp;
      
      // Ajustar predicción según tiempo transcurrido
      let timeWeight = Math.min(1, elapsed / (avgInterval * 2));
      
      // Modelo de predicción ponderado
      let predictedValue = 0;
      let totalWeight = 0;
      
      for (let i = 0; i < Math.min(this.modelWeights.length, recentValues.length); i++) {
        const index = recentValues.length - 1 - i;
        const weight = this.modelWeights[i] * recentValues[index].confidence;
        predictedValue += recentValues[index].value * weight;
        totalWeight += weight;
      }
      
      // Normalizar por peso total
      if (totalWeight > 0) {
        predictedValue /= totalWeight;
      } else {
        predictedValue = recentValues[recentValues.length - 1].value;
      }
      
      // Calcular confianza basada en consistencia y tiempo
      const valueVariability = this.calculateVariability(recentValues.map(v => v.value));
      const timeVariability = intervals.length > 1 ? 
        this.calculateVariability(intervals) : 1;
        
      // Menor variabilidad = mayor confianza
      const consistencyFactor = Math.max(0, 1 - valueVariability);
      const timingFactor = Math.max(0, 1 - timeVariability);
      const timeDecay = Math.max(0, 1 - timeWeight);
      
      // Combinar factores para confianza final
      const confidence = 0.7 * consistencyFactor + 
                        0.2 * timingFactor + 
                        0.1 * timeDecay;
      
      // Guardar predicción
      this.lastPrediction = {
        predictedValue,
        confidence,
        predictedTimestamp: timestamp
      };
      
      return this.lastPrediction;
    } catch (error) {
      logError(
        `Error en predicción adaptativa: ${error}`,
        ErrorLevel.WARNING,
        "AdaptivePredictor"
      );
      
      // Valor por defecto en caso de error
      const fallbackValue = this.valuesBuffer.getSize() > 0 
        ? this.valuesBuffer.getLastN(1)[0].value 
        : 0;
        
      return {
        predictedValue: fallbackValue,
        confidence: 0.1,
        predictedTimestamp: timestamp
      };
    }
  }
  
  /**
   * Actualiza los pesos del modelo basados en datos recientes
   */
  private updateModelWeights(): void {
    // Solo actualizar si hay suficientes datos
    if (this.valuesBuffer.getSize() < 4) return;
    
    try {
      // Obtener valores recientes
      const recentValues = this.valuesBuffer.getLastN(6);
      
      // Calcular error de predicción anterior si existe
      if (this.lastPrediction && this.lastPrediction.predictedTimestamp) {
        // Buscar valor real para el timestamp predicho
        const predictedTime = this.lastPrediction.predictedTimestamp;
        
        // Encontrar muestras que rodean el tiempo de predicción
        let lowerIndex = -1;
        let upperIndex = -1;
        
        for (let i = 0; i < recentValues.length - 1; i++) {
          if (recentValues[i].timestamp <= predictedTime && 
              recentValues[i+1].timestamp >= predictedTime) {
            lowerIndex = i;
            upperIndex = i + 1;
            break;
          }
        }
        
        // Si encontramos muestras que rodean la predicción
        if (lowerIndex >= 0 && upperIndex >= 0) {
          // Interpolar para obtener el valor estimado real
          const lowerValue = recentValues[lowerIndex];
          const upperValue = recentValues[upperIndex];
          
          const timeFraction = (predictedTime - lowerValue.timestamp) / 
                              (upperValue.timestamp - lowerValue.timestamp);
                              
          const estimatedRealValue = lowerValue.value + 
            timeFraction * (upperValue.value - lowerValue.value);
          
          // Calcular error
          const predictionError = Math.abs(estimatedRealValue - this.lastPrediction.predictedValue);
          
          // Ajustar pesos según el error (menor error = menos ajuste)
          const errorFactor = Math.min(1, predictionError / (Math.abs(estimatedRealValue) + 0.0001));
          
          // Aplicar adaptación
          for (let i = 0; i < this.modelWeights.length; i++) {
            // Los pesos más recientes se ajustan más cuando hay error
            const weightIndex = this.modelWeights.length - 1 - i;
            const adjustmentFactor = this.adaptationRate * errorFactor * (1 - i * 0.2);
            
            // Ajustar hacia mayor influencia de valores más recientes si el error es alto
            if (i === 0) {
              this.modelWeights[weightIndex] += adjustmentFactor * 0.1;
            } else {
              this.modelWeights[weightIndex] -= adjustmentFactor * 0.05;
            }
            
            // Asegurar que el peso esté en rango [0.01, 0.7]
            this.modelWeights[weightIndex] = Math.max(0.01, 
              Math.min(0.7, this.modelWeights[weightIndex]));
          }
          
          // Normalizar pesos
          const totalWeight = this.modelWeights.reduce((sum, w) => sum + w, 0);
          for (let i = 0; i < this.modelWeights.length; i++) {
            this.modelWeights[i] /= totalWeight;
          }
        }
      }
    } catch (error) {
      logError(
        `Error actualizando pesos del modelo: ${error}`,
        ErrorLevel.WARNING,
        "AdaptivePredictor"
      );
    }
  }
  
  /**
   * Calcula la variabilidad normalizada de un conjunto de valores
   */
  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    if (Math.abs(mean) < 0.0001) return 1; // Evitar división por cero
    
    const sumSquaredDiff = values.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0);
    
    // Coeficiente de variación normalizado a [0,1]
    const cv = Math.sqrt(sumSquaredDiff / values.length) / Math.abs(mean);
    return Math.min(1, cv);
  }
  
  /**
   * Configura el predictor
   */
  public configure(options: Partial<SignalProcessingOptions>): void {
    if (options.adaptationRate !== undefined) {
      this.adaptationRate = Math.max(0.1, Math.min(0.5, options.adaptationRate));
    }
    
    if (options.confidenceThreshold !== undefined) {
      this.confidenceThreshold = Math.max(0.2, Math.min(0.8, options.confidenceThreshold));
    }
  }
  
  /**
   * Reinicia el predictor
   */
  public reset(): void {
    this.valuesBuffer.clear();
    this.lastPrediction = null;
    this.modelWeights = [0.5, 0.3, 0.15, 0.05];
  }
  
  /**
   * Obtiene el estado actual del predictor
   */
  public getState(): any {
    return {
      bufferSize: this.valuesBuffer.getSize(),
      adaptationRate: this.adaptationRate,
      modelWeights: [...this.modelWeights],
      confidenceThreshold: this.confidenceThreshold,
      lastPrediction: this.lastPrediction,
      bufferStats: this.valuesBuffer.getState()
    };
  }
}

// Instancia singleton
let adaptivePredictor: AdaptivePredictor | null = null;

/**
 * Obtiene o crea la instancia del predictor adaptativo
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  if (!adaptivePredictor) {
    adaptivePredictor = new DefaultAdaptivePredictor();
  }
  
  return adaptivePredictor;
}

// Re-exportar interfaz para uso externo
export { PredictionResult };
