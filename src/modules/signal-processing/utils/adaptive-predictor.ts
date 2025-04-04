/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Predictor adaptativo para señales PPG y cardíacas
 */
import { CircularBuffer } from './circular-buffer';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Export type for PredictionResult
export type PredictionResult = {
  predictedValue: number;
  confidence: number;
  predictedTimestamp?: number;
};

/**
 * Configuración del predictor adaptativo
 */
interface AdaptivePredictorConfig {
  learningRate?: number; // Tasa de aprendizaje (0-1)
  momentum?: number;     // Factor de momentum (0-1)
  noiseTolerance?: number; // Tolerancia al ruido (0-1)
  minObservations?: number; // Mínimo de observaciones para predecir
  maxHistory?: number;    // Máximo de valores históricos a mantener
}

/**
 * Estado interno del predictor
 */
interface PredictorState {
  lastValue: number;
  lastTimestamp: number;
  trend: number;
  confidence: number;
  history: { value: number; timestamp: number; }[];
}

/**
 * Implementación de predictor adaptativo
 */
class AdaptivePredictor {
  private config: Required<AdaptivePredictorConfig>;
  private state: PredictorState;
  private valueBuffer: CircularBuffer<number>;
  
  /**
   * Constructor del predictor
   */
  constructor(config?: AdaptivePredictorConfig) {
    this.config = {
      learningRate: config?.learningRate ?? 0.1,
      momentum: config?.momentum ?? 0.8,
      noiseTolerance: config?.noiseTolerance ?? 0.2,
      minObservations: config?.minObservations ?? 5,
      maxHistory: config?.maxHistory ?? 20
    };
    
    this.state = {
      lastValue: 0,
      lastTimestamp: 0,
      trend: 0,
      confidence: 0.5,
      history: []
    };
    
    // Buffer circular para valores recientes
    this.valueBuffer = new CircularBuffer<number>(this.config.maxHistory, true, true);
  }
  
  /**
   * Actualiza el predictor con un nuevo valor
   * @param timestamp Marca de tiempo del valor
   * @param value Valor a agregar
   * @param stability Estabilidad de la señal (0-1)
   */
  public update(timestamp: number, value: number, stability: number = 0.75): void {
    try {
      // Agregar al buffer
      this.valueBuffer.push(value);
      
      // Calcular diferencia con el valor anterior
      const delta = value - this.state.lastValue;
      const timeDelta = timestamp - this.state.lastTimestamp;
      
      // Estimar tendencia
      let currentTrend = timeDelta > 0 ? delta / timeDelta : 0;
      
      // Aplicar filtro de ruido
      if (Math.abs(currentTrend) < this.config.noiseTolerance) {
        currentTrend = 0;
      }
      
      // Combinar tendencia actual con la anterior usando momentum
      this.state.trend = this.config.momentum * this.state.trend +
                         (1 - this.config.momentum) * currentTrend;
      
      // Ajustar confianza basada en la estabilidad
      this.state.confidence = this.config.learningRate * stability +
                              (1 - this.config.learningRate) * this.state.confidence;
      
      // Limitar confianza a 0-1
      this.state.confidence = Math.max(0, Math.min(1, this.state.confidence));
      
      // Actualizar estado
      this.state.lastValue = value;
      this.state.lastTimestamp = timestamp;
      
      // Agregar al historial
      this.state.history.push({ value, timestamp });
      
      // Limitar tamaño del historial
      if (this.state.history.length > this.config.maxHistory) {
        this.state.history.shift();
      }
    } catch (error) {
      logError(
        `Error al actualizar predictor adaptativo: ${error}`,
        ErrorLevel.WARNING,
        "AdaptivePredictor"
      );
    }
  }
  
  /**
   * Predice el siguiente valor
   * @param timestamp Marca de tiempo para la predicción
   */
  public predict(timestamp: number): PredictionResult {
    try {
      // Verificar si hay suficientes observaciones
      if (this.valueBuffer.getSize() < this.config.minObservations) {
        return {
          predictedValue: this.state.lastValue,
          confidence: 0.2,
          predictedTimestamp: timestamp
        };
      }
      
      // Estimar tiempo desde la última actualización
      const timeSinceLastUpdate = timestamp - this.state.lastTimestamp;
      
      // Proyectar el valor basado en la tendencia
      let predictedValue = this.state.lastValue + this.state.trend * timeSinceLastUpdate;
      
      // Aplicar corrección basada en el promedio reciente
      const avgRecentValue = this.valueBuffer.getAverage();
      const blendFactor = Math.min(1, this.state.confidence * 0.5);
      
      predictedValue = blendFactor * predictedValue +
                       (1 - blendFactor) * avgRecentValue;
      
      return {
        predictedValue,
        confidence: this.state.confidence,
        predictedTimestamp: timestamp
      };
    } catch (error) {
      logError(
        `Error al predecir valor: ${error}`,
        ErrorLevel.WARNING,
        "AdaptivePredictor"
      );
      
      // Retornar fallback seguro
      return {
        predictedValue: this.state.lastValue,
        confidence: 0.1,
        predictedTimestamp: timestamp
      };
    }
  }
  
  /**
   * Obtiene el estado actual del predictor
   */
  public getState(): any {
    return {
      lastValue: this.state.lastValue,
      lastTimestamp: this.state.lastTimestamp,
      trend: this.state.trend,
      confidence: this.state.confidence,
      historySize: this.state.history.length,
      bufferState: this.valueBuffer.getState()
    };
  }
  
  /**
   * Resetea el predictor a su estado inicial
   */
  public reset(): void {
    this.state = {
      lastValue: 0,
      lastTimestamp: 0,
      trend: 0,
      confidence: 0.5,
      history: []
    };
    this.valueBuffer.clear();
  }
}

// Crear instancia singleton
const defaultPredictor = new AdaptivePredictor();

/**
 * Obtiene la instancia singleton del predictor adaptativo
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  return defaultPredictor;
}
