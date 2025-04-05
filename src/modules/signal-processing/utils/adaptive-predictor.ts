/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades para predicción adaptativa de señales
 * Implementa un filtro de Kalman adaptativo para predecir valores futuros
 */

/**
 * Interface for adaptive prediction of signal values
 */
export interface AdaptivePredictor {
  predict(timestamp: number): { predictedValue: number; confidence: number };
  update(timestamp: number, value: number, weight: number): void;
  configure(options: any): void;
  reset(): void;
  getState(): any;
}

/**
 * Implementación del filtro de Kalman adaptativo
 */
class KalmanFilter implements AdaptivePredictor {
  private processNoise: number = 0.01;
  private measurementNoise: number = 0.1;
  private errorEstimate: number = 1;
  private kalmanGain: number = 0;
  private currentValue: number = 0;
  private lastTimestamp: number = 0;
  private adaptationRate: number = 0.1;
  private confidenceThreshold: number = 0.5;
  
  /**
   * Predice el siguiente valor de la señal
   */
  public predict(timestamp: number): { predictedValue: number; confidence: number } {
    // Calcular el tiempo transcurrido desde la última actualización
    const timeDiff = timestamp - this.lastTimestamp;
    
    // Proyectar el estado actual hacia el futuro
    const predictedValue = this.currentValue;
    
    // La confianza es inversamente proporcional al tiempo transcurrido
    let confidence = Math.max(0, 1 - (timeDiff / 1000));
    
    // Ajustar la confianza basada en el umbral
    confidence = confidence > this.confidenceThreshold ? confidence : 0;
    
    return { predictedValue, confidence };
  }
  
  /**
   * Actualiza el filtro con un nuevo valor
   */
  public update(timestamp: number, value: number, weight: number): void {
    // Calcular la ganancia de Kalman
    this.kalmanGain = this.errorEstimate / (this.errorEstimate + this.measurementNoise);
    
    // Corregir la estimación actual
    this.currentValue += this.kalmanGain * (value - this.currentValue);
    
    // Actualizar la estimación del error
    this.errorEstimate = (1 - this.kalmanGain) * this.errorEstimate + 
                         Math.abs(value - this.currentValue) * this.processNoise;
    
    // Recordar el timestamp actual
    this.lastTimestamp = timestamp;
    
    // Adaptar los parámetros del filtro
    this.processNoise = this.processNoise * (1 - this.adaptationRate) + 0.001 * this.adaptationRate;
    this.measurementNoise = this.measurementNoise * (1 - this.adaptationRate) + 0.01 * this.adaptationRate;
    
    // Limitar los valores de los parámetros
    this.processNoise = Math.max(0.0001, Math.min(0.1, this.processNoise));
    this.measurementNoise = Math.max(0.01, Math.min(1, this.measurementNoise));
  }
  
  /**
   * Configura el filtro con opciones personalizadas
   */
  public configure(options: any): void {
    if (options.adaptationRate !== undefined) {
      this.adaptationRate = Math.max(0.01, Math.min(0.5, options.adaptationRate));
    }
    
    if (options.confidenceThreshold !== undefined) {
      this.confidenceThreshold = Math.max(0.1, Math.min(0.9, options.confidenceThreshold));
    }
  }
  
  /**
   * Reinicia el filtro a su estado inicial
   */
  public reset(): void {
    this.errorEstimate = 1;
    this.kalmanGain = 0;
    this.currentValue = 0;
    this.lastTimestamp = 0;
  }
  
  /**
   * Obtiene el estado actual del filtro
   */
  public getState(): any {
    return {
      processNoise: this.processNoise,
      measurementNoise: this.measurementNoise,
      errorEstimate: this.errorEstimate,
      kalmanGain: this.kalmanGain,
      currentValue: this.currentValue,
      lastTimestamp: this.lastTimestamp,
      adaptationRate: this.adaptationRate,
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

// Singleton
let adaptivePredictor: AdaptivePredictor | null = null;

/**
 * Obtiene una instancia del filtro de Kalman adaptativo
 */
export function getAdaptivePredictor(): AdaptivePredictor {
  if (!adaptivePredictor) {
    adaptivePredictor = new KalmanFilter();
  }
  return adaptivePredictor;
}
