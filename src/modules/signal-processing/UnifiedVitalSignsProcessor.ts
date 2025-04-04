
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador de signos vitales unificado
 * Consolida la funcionalidad de múltiples procesadores mientras mantiene todas las características
 */

import { UnifiedVitalSignsResult, RRIntervalAnalysis } from '../../types/signal-processing';
import { UnifiedSignalProcessor } from './UnifiedSignalProcessor';
import { SpO2Channel } from './channels/SpO2Channel';
import { CardiacChannel } from './channels/CardiacChannel';
import { GlucoseChannel } from './channels/GlucoseChannel';
import { LipidsChannel } from './channels/LipidsChannel';
import { BloodPressureChannel } from './channels/BloodPressureChannel';

/**
 * Procesador unificado de signos vitales
 * Integra todos los canales especializados y mantiene la funcionalidad existente
 */
export class UnifiedVitalSignsProcessor {
  private signalProcessor: UnifiedSignalProcessor;
  private spo2Channel: SpO2Channel;
  private cardiacChannel: CardiacChannel;
  private glucoseChannel: GlucoseChannel;
  private lipidsChannel: LipidsChannel;
  private bpChannel: BloodPressureChannel;
  
  private arrhythmiaCounter: number = 0;
  private ppgValues: number[] = [];
  
  constructor() {
    // Inicializar procesadores especializados
    this.signalProcessor = new UnifiedSignalProcessor();
    this.spo2Channel = new SpO2Channel();
    this.cardiacChannel = new CardiacChannel();
    this.glucoseChannel = new GlucoseChannel();
    this.lipidsChannel = new LipidsChannel();
    this.bpChannel = new BloodPressureChannel();
    
    console.log("UnifiedVitalSignsProcessor: Initialized");
  }
  
  /**
   * Procesa un valor PPG y calcula todos los signos vitales
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
    
    // Procesar canales especializados
    const spo2 = this.spo2Channel.process(this.ppgValues);
    const pressure = this.bpChannel.process(this.ppgValues, rrData);
    const glucose = this.glucoseChannel.process(this.ppgValues);
    const lipids = this.lipidsChannel.process(this.ppgValues);
    
    // Calcular confianza
    const glucoseConfidence = this.calculateConfidence(this.ppgValues);
    const lipidsConfidence = this.calculateConfidence(this.ppgValues) * 0.9; // Lipids slightly less confident
    
    // Overall confidence
    const overallConfidence = (glucoseConfidence + lipidsConfidence) / 2;
    
    // Resultado final
    return {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaResult.status,
      glucose,
      lipids: {
        totalCholesterol: lipids.totalCholesterol,
        triglycerides: lipids.triglycerides
      },
      confidence: {
        glucose: glucoseConfidence,
        lipids: lipidsConfidence,
        overall: overallConfidence
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
   * Calcula nivel de confianza basado en la calidad de la señal
   */
  private calculateConfidence(values: number[]): number {
    if (values.length < 10) {
      return 0;
    }
    
    // Calcular amplitud de señal
    const recentValues = values.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Calcular estabilidad (menor varianza = mayor estabilidad)
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentValues.length;
    const stability = Math.max(0, 1 - Math.sqrt(variance) * 5);
    
    // Confianza combinada
    const rawConfidence = (amplitude * 2 + stability) / 3;
    return Math.min(1, Math.max(0, rawConfidence));
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
    this.spo2Channel = new SpO2Channel();
    this.cardiacChannel = new CardiacChannel();
    this.glucoseChannel = new GlucoseChannel();
    this.lipidsChannel = new LipidsChannel();
    this.bpChannel = new BloodPressureChannel();
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
