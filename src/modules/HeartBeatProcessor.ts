
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  isArrhythmia: boolean;
  rrData: {
    intervals: number[];
    lastPeakTime: number | null;
  };
  diagnosticData?: {
    [key: string]: any;
  };
}

/**
 * Procesador principal de latidos cardíacos
 * SOLO MEDICIÓN REAL - SIN SIMULACIÓN
 */
export class HeartBeatProcessor {
  private isMonitoring: boolean = false;
  private ppgBuffer: number[] = [];
  private peakTimes: number[] = [];
  private rrIntervals: number[] = [];
  private lastPeakTime: number | null = null;
  private arrhythmiaCounter: number = 0;
  private confidenceHistory: number[] = [];
  
  // Parámetros optimizados para detección real
  private readonly MIN_PEAK_DISTANCE = 300; // ms
  private readonly PEAK_THRESHOLD = 0.08;
  private readonly CONFIDENCE_THRESHOLD = 0.4;
  private readonly BUFFER_SIZE = 30;
  
  constructor() {
    console.log("HeartBeatProcessor: Inicializado - SOLO medición REAL");
  }
  
  /**
   * Procesar señal PPG real
   */
  processSignal(ppgValue: number): HeartBeatResult {
    if (!this.isMonitoring) {
      return this.getEmptyResult();
    }
    
    // Agregar valor al buffer
    this.ppgBuffer.push(ppgValue);
    if (this.ppgBuffer.length > this.BUFFER_SIZE) {
      this.ppgBuffer.shift();
    }
    
    const now = Date.now();
    let isPeak = false;
    let currentBPM = 0;
    let confidence = 0;
    let isArrhythmia = false;
    
    // Detectar pico REAL
    if (this.detectRealPeak(ppgValue, now)) {
      isPeak = true;
      
      // Calcular BPM a partir de intervalos RR REALES
      if (this.lastPeakTime !== null) {
        const rrInterval = now - this.lastPeakTime;
        
        if (rrInterval >= this.MIN_PEAK_DISTANCE && rrInterval <= 2000) {
          this.rrIntervals.push(rrInterval);
          this.peakTimes.push(now);
          
          // Mantener historial acotado
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
            this.peakTimes.shift();
          }
          
          // Calcular BPM REAL
          currentBPM = 60000 / rrInterval;
          
          // Detectar ARRITMIA REAL
          isArrhythmia = this.detectRealArrhythmia();
          if (isArrhythmia) {
            this.arrhythmiaCounter++;
          }
          
          // Calcular confianza basada en consistencia REAL
          confidence = this.calculateRealConfidence();
          
          this.confidenceHistory.push(confidence);
          if (this.confidenceHistory.length > 5) {
            this.confidenceHistory.shift();
          }
        }
      }
      
      this.lastPeakTime = now;
    }
    
    return {
      bpm: currentBPM,
      confidence,
      isPeak,
      arrhythmiaCount: this.arrhythmiaCounter,
      isArrhythmia,
      rrData: {
        intervals: [...this.rrIntervals],
        lastPeakTime: this.lastPeakTime
      },
      diagnosticData: {
        signalStrength: Math.abs(ppgValue) * 100,
        lastProcessedTime: now,
        bufferSize: this.ppgBuffer.length
      }
    };
  }
  
  /**
   * Detectar pico REAL sin simulación
   */
  private detectRealPeak(value: number, timestamp: number): boolean {
    if (this.ppgBuffer.length < 3) return false;
    
    // Verificar si es un máximo local REAL
    const recent = this.ppgBuffer.slice(-3);
    const isLocalMax = recent[1] > recent[0] && 
                       recent[1] >= value && 
                       recent[1] > this.PEAK_THRESHOLD;
    
    // Verificar distancia temporal mínima
    const timeSinceLastPeak = this.lastPeakTime ? 
      timestamp - this.lastPeakTime : Number.MAX_VALUE;
    
    return isLocalMax && timeSinceLastPeak >= this.MIN_PEAK_DISTANCE;
  }
  
  /**
   * Detectar arritmia REAL basada en intervalos RR
   */
  private detectRealArrhythmia(): boolean {
    if (this.rrIntervals.length < 3) return false;
    
    const recentIntervals = this.rrIntervals.slice(-3);
    const avgInterval = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
    
    // Detectar variación significativa REAL
    const variations = recentIntervals.map(interval => 
      Math.abs(interval - avgInterval) / avgInterval
    );
    
    const maxVariation = Math.max(...variations);
    
    // Umbral conservador para arritmia REAL
    return maxVariation > 0.25;
  }
  
  /**
   * Calcular confianza REAL basada en consistencia
   */
  private calculateRealConfidence(): number {
    if (this.rrIntervals.length < 2) return 0.1;
    
    const recentIntervals = this.rrIntervals.slice(-5);
    const avg = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
    const variance = recentIntervals.reduce((sum, val) => 
      sum + Math.pow(val - avg, 2), 0) / recentIntervals.length;
    const stdDev = Math.sqrt(variance);
    const consistency = 1 - (stdDev / avg);
    
    return Math.max(0.1, Math.min(1.0, consistency));
  }
  
  /**
   * Resultado vacío para estados inválidos
   */
  private getEmptyResult(): HeartBeatResult {
    return {
      bpm: 0,
      confidence: 0,
      isPeak: false,
      arrhythmiaCount: this.arrhythmiaCounter,
      isArrhythmia: false,
      rrData: {
        intervals: [],
        lastPeakTime: null
      }
    };
  }
  
  /**
   * Obtener intervalos RR REALES
   */
  getRRIntervals(): { intervals: number[]; lastPeakTime: number | null } {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }
  
  /**
   * Contador de arritmias
   */
  getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Establecer estado de monitoreo
   */
  setMonitoring(monitoring: boolean): void {
    this.isMonitoring = monitoring;
    console.log(`HeartBeatProcessor: Monitoreo ${monitoring ? 'INICIADO' : 'DETENIDO'}`);
  }
  
  /**
   * Reset completo
   */
  reset(): void {
    this.ppgBuffer = [];
    this.peakTimes = [];
    this.rrIntervals = [];
    this.lastPeakTime = null;
    this.confidenceHistory = [];
    console.log("HeartBeatProcessor: Reset completo - iniciando medición REAL");
  }
}
