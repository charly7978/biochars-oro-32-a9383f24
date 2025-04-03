
import { HeartBeatResult, RRIntervalData } from '@/types/heart-rate';

export class HeartBeatProcessor {
  private bpm: number = 0;
  private confidence: number = 0;
  private lastPeakTime: number | null = null;
  private rrIntervals: number[] = [];
  private arrhythmiaCounter: number = 0;
  private signalBuffer: number[] = [];
  private bufferSize: number = 100;
  private threshold: number = 0.5;
  
  constructor() {
    this.reset();
  }
  
  public processSignal(value: number): HeartBeatResult {
    // Simplemente devolvemos el resultado del procesamiento
    // En una implementación real, aquí habría un algoritmo de detección de picos
    
    // Añadir valor al buffer
    this.signalBuffer.push(value);
    if (this.signalBuffer.length > this.bufferSize) {
      this.signalBuffer.shift();
    }
    
    // Determinar si hay un pico con un umbral dinámico
    const min = Math.min(...this.signalBuffer.slice(-20));
    const max = Math.max(...this.signalBuffer.slice(-20));
    const range = max - min;
    
    const isPeak = range > 0 && 
                value > min + (range * this.threshold) && 
                this.signalBuffer.length > 10;
    
    // Actualizar intervalos RR si es un pico
    if (isPeak) {
      const now = Date.now();
      
      if (this.lastPeakTime !== null) {
        const interval = now - this.lastPeakTime;
        
        // Solo considerar intervalos razonables (30-240 BPM)
        if (interval >= 250 && interval <= 2000) {
          this.rrIntervals.push(interval);
          
          // Mantener solo los últimos 10 intervalos
          if (this.rrIntervals.length > 10) {
            this.rrIntervals.shift();
          }
          
          // Calcular BPM a partir de intervalos RR
          if (this.rrIntervals.length >= 3) {
            const avgInterval = this.rrIntervals.reduce((sum, val) => sum + val, 0) / 
                              this.rrIntervals.length;
            
            this.bpm = Math.round(60000 / avgInterval);
            
            // Limitar BPM a rango razonable
            this.bpm = Math.max(30, Math.min(220, this.bpm));
            
            // Calcular confianza basada en la estabilidad de los intervalos
            const stdDev = Math.sqrt(
              this.rrIntervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / 
              this.rrIntervals.length
            );
            
            // Confianza inversamente proporcional a la desviación estándar relativa
            const relativeStdDev = stdDev / avgInterval;
            this.confidence = Math.max(0, Math.min(100, 100 - (relativeStdDev * 100)));
            
            // Detección simple de arritmias
            if (relativeStdDev > 0.2) {
              this.arrhythmiaCounter++;
            }
          }
        }
      }
      
      this.lastPeakTime = now;
    }
    
    return {
      bpm: this.bpm,
      confidence: this.confidence,
      isPeak,
      arrhythmiaCount: this.arrhythmiaCounter,
      rrData: {
        intervals: [...this.rrIntervals],
        lastPeakTime: this.lastPeakTime
      }
    };
  }
  
  public reset(): void {
    this.bpm = 0;
    this.confidence = 0;
    this.lastPeakTime = null;
    this.rrIntervals = [];
    this.arrhythmiaCounter = 0;
    this.signalBuffer = [];
  }
  
  public getBPM(): number {
    return this.bpm;
  }
  
  public getConfidence(): number {
    return this.confidence;
  }
  
  public getArrhythmiaCount(): number {
    return this.arrhythmiaCounter;
  }
  
  public getRRIntervals(): RRIntervalData {
    return {
      intervals: [...this.rrIntervals],
      lastPeakTime: this.lastPeakTime
    };
  }
}
