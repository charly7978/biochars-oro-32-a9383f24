/**
 * HeartBeat Processor 
 * Processes filtered PPG signals to extract cardiac information
 */
import { 
  ProcessedHeartbeatSignal, 
  SignalProcessingOptions, 
  ISignalProcessor
} from './types';

// Export the class directly
export class HeartBeatProcessor implements ISignalProcessor<ProcessedHeartbeatSignal> {
  // Almacenamiento de valores y picos
  private values: number[] = [];
  private peakTimes: number[] = [];
  private rrIntervals: number[] = [];
  
  // Detección de picos
  private lastPeakTime: number | null = null;
  private lastPeakValue: number = 0;
  private peakThreshold: number = 0.2;
  private minPeakDistance: number = 250; // ms
  
  // Configuración
  private adaptiveToPeakHistory: boolean = true;
  private dynamicThresholdFactor: number = 0.6;
  
  // Predictive modeling and adaptive control
  private adaptivePredictor: any;
  private useAdaptiveControl: boolean = true;
  private qualityEnhancedByPrediction: boolean = true;
  private averageBPM: number = 0;
  private lastRRInterval: number | null = null;
  private heartRateVariability: number | null = null;
  private instantBPM: number | null = null;
  private peakConfidence: number = 0;
  private isPeak: boolean = false;
  
  constructor() {
    this.adaptivePredictor = {};
  }
  
  /**
   * Process a PPG signal to extract heartbeat information
   * @param value Filtered PPG signal value
   * @returns Processed heartbeat information
   */
  processSignal(value: number): ProcessedHeartbeatSignal {
    const timestamp = Date.now();
    
    // Apply adaptive prediction and control if enabled
    let enhancedValue = value;
    let predictionQuality = 0;
    
    // Almacenar valor en buffer
    this.values.push(enhancedValue);
    if (this.values.length > 30) {
      this.values.shift();
    }
    
    // Comprobar si es un posible pico
    let isPeak = false;
    let peakConfidence = 0;
    let instantaneousBPM: number | null = null;
    let rrInterval: number | null = null;
    
    // Verificar condiciones para detección de pico
    if (this.isPotentialPeak(enhancedValue, timestamp)) {
      // Verificar si es un pico válido con análisis de forma de onda
      const { isValidPeak, confidence } = this.validatePeak(enhancedValue);
      
      if (isValidPeak) {
        isPeak = true;
        peakConfidence = confidence;
        
        // Calcular intervalo RR si hay un pico anterior
        if (this.lastPeakTime !== null) {
          rrInterval = timestamp - this.lastPeakTime;
          
          // Calcular BPM instantáneo a partir del intervalo RR
          if (rrInterval > 0) {
            instantaneousBPM = 60000 / rrInterval;
            
            // Almacenar intervalo RR para análisis de variabilidad
            this.rrIntervals.push(rrInterval);
            if (this.rrIntervals.length > 10) {
              this.rrIntervals.shift();
            }
          }
        }
        
        // Actualizar referencias del pico
        this.lastPeakTime = timestamp;
        this.lastPeakValue = enhancedValue;
        this.peakTimes.push(timestamp);
        
        // Limitar el historial de tiempos de picos
        if (this.peakTimes.length > 10) {
          this.peakTimes.shift();
        }
        
        // Adaptar el umbral basado en el historial de picos
        if (this.adaptiveToPeakHistory && this.values.length > 10) {
          this.adaptThreshold();
        }
      }
    }
    
    // Calcular variabilidad del ritmo cardíaco
    const heartRateVariability = this.calculateHRV();
    
    // Enhance confidence with prediction quality if enabled
    
    
    return {
      timestamp: Date.now(),
      bpm: this.averageBPM,
      confidence: peakConfidence,
      isPeak,
      rrInterval: this.lastRRInterval,
      heartRateVariability: this.heartRateVariability,
      instantaneousBPM: instantaneousBPM,
      peakConfidence: peakConfidence
    };
  }
  
  /**
   * Verifica si un valor cumple las condiciones básicas para ser un pico
   */
  private isPotentialPeak(value: number, timestamp: number): boolean {
    // Aplicar umbral y distancia mínima entre picos
    const timeSinceLastPeak = this.lastPeakTime ? timestamp - this.lastPeakTime : Number.MAX_VALUE;
    
    if (value < this.peakThreshold || timeSinceLastPeak < this.minPeakDistance) {
      return false;
    }
    
    // Verificar si es un máximo local (mayor que valores anteriores y posteriores)
    if (this.values.length < 3) return false;
    
    const recent = this.values.slice(-3);
    return recent[1] > recent[0] && recent[1] >= value;
  }
  
  /**
   * Valida un pico usando análisis de forma de onda
   */
  private validatePeak(value: number): { isValidPeak: boolean, confidence: number } {
    if (this.values.length < 5) {
      return { isValidPeak: false, confidence: 0 };
    }
    
    // Comprobar la forma de onda alrededor del potencial pico
    const segment = this.values.slice(-5);
    
    // Verificar patrón ascendente-descendente típico de un latido cardíaco real
    const hasCardiacPattern = 
      segment[0] < segment[1] && 
      segment[1] < segment[2] && 
      segment[2] > segment[3] && 
      segment[3] > segment[4];
    
    if (!hasCardiacPattern) {
      return { isValidPeak: false, confidence: 0 };
    }
    
    // Calcular la prominencia del pico (diferencia con valores circundantes)
    const prominence = Math.min(
      segment[2] - segment[0],
      segment[2] - segment[4]
    );
    
    // Normalizar la prominencia para obtener la confianza (0-1)
    const confidence = Math.min(1, prominence / (this.peakThreshold * 2));
    
    return { 
      isValidPeak: confidence > 0.5,
      confidence 
    };
  }
  
  /**
   * Adapta el umbral de detección basado en el historial de picos
   */
  private adaptThreshold(): void {
    if (this.values.length < 10) return;
    
    // Calcular la media y desviación estándar de los valores recientes
    const recent = this.values.slice(-20);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    let variance = 0;
    for (const val of recent) {
      variance += Math.pow(val - mean, 2);
    }
    variance /= recent.length;
    
    const stdDev = Math.sqrt(variance);
    
    // Ajustar umbral basado en la distribución de la señal
    // Uso de factor dinámico para mejor adaptación
    this.peakThreshold = mean + (stdDev * this.dynamicThresholdFactor);
    
    // Limitar a valores razonables
    this.peakThreshold = Math.max(0.1, Math.min(0.8, this.peakThreshold));
  }
  
  /**
   * Calcula la variabilidad del ritmo cardíaco (HRV)
   */
  private calculateHRV(): number | null {
    if (this.rrIntervals.length < 3) return null;
    
    // Método RMSSD (Root Mean Square of Successive Differences)
    let sumSquaredDiffs = 0;
    for (let i = 1; i < this.rrIntervals.length; i++) {
      const diff = this.rrIntervals[i] - this.rrIntervals[i - 1];
      sumSquaredDiffs += diff * diff;
    }
    
    return Math.sqrt(sumSquaredDiffs / (this.rrIntervals.length - 1));
  }
  
  /**
   * Configura el procesador con opciones personalizadas
   */
  public configure(options: SignalProcessingOptions): void {
    if (options.amplificationFactor !== undefined) {
      this.dynamicThresholdFactor = Math.max(0.3, Math.min(0.9, options.amplificationFactor / 2));
    }
    
    if (options.filterStrength !== undefined) {
      // Ajustar la distancia mínima entre picos según la fuerza de filtrado
      this.minPeakDistance = 250 + (options.filterStrength * 100);
    }
    
    // Configure adaptive control options
    if (options.useAdaptiveControl !== undefined) {
      this.useAdaptiveControl = options.useAdaptiveControl;
    }
    
    if (options.qualityEnhancedByPrediction !== undefined) {
      this.qualityEnhancedByPrediction = options.qualityEnhancedByPrediction;
    }
    
    // Also configure the adaptive predictor
    
  }
  
  /**
   * Reinicia el procesador y todos sus buffers
   */
  public reset(): void {
    this.values = [];
    this.peakTimes = [];
    this.rrIntervals = [];
    this.lastPeakTime = null;
    this.lastPeakValue = 0;
    this.peakThreshold = 0.2;
    
    // Reset adaptive predictor
    
  }
  
  /**
   * Get the state of the adaptive predictor for debugging
   */
  public getAdaptivePredictorState(): any {
    return {};
  }
}

/**
 * Crea una nueva instancia del procesador de señal cardíaca
 */
export function createHeartbeatProcessor(): HeartBeatProcessor {
  return new HeartBeatProcessor();
}
