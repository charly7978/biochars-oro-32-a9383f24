
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador de signos vitales unificado
 * Consolida la funcionalidad de múltiples procesadores mientras mantiene todas las características
 */

import { UnifiedVitalSignsResult, RRIntervalAnalysis } from '../../types/signal-processing';
import { UnifiedSignalProcessor } from './UnifiedSignalProcessor';
import { SpO2Channel } from './channels/SpO2Channel';
import { VitalSignType } from '../../types/signal';

/**
 * Procesador unificado de signos vitales
 * Integra todos los canales especializados y mantiene la funcionalidad existente
 */
export class UnifiedVitalSignsProcessor {
  private signalProcessor: UnifiedSignalProcessor;
  private spo2Channel: SpO2Channel;
  
  private arrhythmiaCounter: number = 0;
  private ppgValues: number[] = [];
  
  constructor() {
    // Inicializar procesadores especializados
    this.signalProcessor = new UnifiedSignalProcessor();
    this.spo2Channel = new SpO2Channel();
    
    console.log("UnifiedVitalSignsProcessor: Initialized");
  }
  
  /**
   * Procesa un valor PPG y calcula todos los signos vitales
   * Centrándose primero solo en SpO2 para simplificar
   */
  public processSignal(value: number, rrData?: RRIntervalAnalysis): UnifiedVitalSignsResult {
    // Procesar señal base
    const processedSignal = this.signalProcessor.processSignal(value);
    
    // Guardar valor filtrado
    this.ppgValues.push(processedSignal.filteredValue);
    if (this.ppgValues.length > 100) {
      this.ppgValues.shift();
    }
    
    // Verificar calidad de señal
    if (processedSignal.quality < 20 || !processedSignal.fingerDetected) {
      return this.createEmptyResult();
    }
    
    // Procesar datos de arritmia si están disponibles
    const arrhythmiaResult = this.processArrhythmiaData(rrData);
    
    // Procesar canales - por ahora solo SpO2
    const spo2 = this.spo2Channel.process(this.ppgValues);
    
    // Resultados simplificados para depuración
    return {
      spo2,
      pressure: "--/--",
      arrhythmiaStatus: arrhythmiaResult.status,
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: arrhythmiaResult.data
    };
  }
  
  /**
   * Procesa datos de intervalo RR para detección de arritmias
   */
  private processArrhythmiaData(rrData?: RRIntervalAnalysis): {
    status: string;
    data: { timestamp: number; rmssd: number; rrVariation: number; } | null;
  } {
    if (!rrData || !rrData.intervals || rrData.intervals.length < 3) {
      return { status: "--", data: null };
    }
    
    // Analizar variabilidad de intervalos
    const intervals = rrData.intervals.slice(-5);
    const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variations = intervals.map(interval => Math.abs(interval - avg) / avg);
    const maxVariation = Math.max(...variations);
    
    // Calcular RMSSD (Root Mean Square of Successive Differences)
    let rmssd = 0;
    if (intervals.length > 1) {
      let sumSquaredDiff = 0;
      for (let i = 1; i < intervals.length; i++) {
        sumSquaredDiff += Math.pow(intervals[i] - intervals[i-1], 2);
      }
      rmssd = Math.sqrt(sumSquaredDiff / (intervals.length - 1));
    }
    
    // Determinar si hay arritmia
    const isArrhythmia = maxVariation > 0.2 || (rmssd > 50 && maxVariation > 0.15);
    
    // Incrementar contador si hay arritmia
    if (isArrhythmia) {
      this.arrhythmiaCounter++;
    }
    
    return {
      status: isArrhythmia ? `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      data: isArrhythmia ? {
        timestamp: Date.now(),
        rmssd,
        rrVariation: maxVariation
      } : null
    };
  }
  
  /**
   * Crea un resultado vacío cuando no hay datos suficientes
   */
  private createEmptyResult(): UnifiedVitalSignsResult {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      }
    };
  }
  
  /**
   * Reinicia el procesador
   */
  public reset(): UnifiedVitalSignsResult | null {
    this.signalProcessor.reset();
    this.spo2Channel.reset();
    this.ppgValues = [];
    
    console.log("UnifiedVitalSignsProcessor: Reset complete");
    return null;
  }
  
  /**
   * Reinicio completo del procesador
   */
  public fullReset(): void {
    this.reset();
    this.arrhythmiaCounter = 0;
    console.log("UnifiedVitalSignsProcessor: Full reset complete");
  }
  
  /**
   * Obtiene el contador de arritmias
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Obtiene el último resultado válido
   */
  public getLastValidResults(): UnifiedVitalSignsResult | null {
    return null; // Siempre devuelve null para forzar mediciones frescas
  }
}
