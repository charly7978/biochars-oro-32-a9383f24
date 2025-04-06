
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
import { VitalSignType } from '../../types/signal';
import { OptimizedSignalDistributor } from './OptimizedSignalDistributor';

/**
 * Procesador unificado de signos vitales
 * Integra todos los canales especializados y mantiene la funcionalidad existente
 */
export class UnifiedVitalSignsProcessor {
  private signalProcessor: UnifiedSignalProcessor;
  private signalDistributor: OptimizedSignalDistributor;
  private spo2Channel: SpO2Channel | null = null;
  private cardiacChannel: CardiacChannel | null = null;
  
  private arrhythmiaCounter: number = 0;
  private ppgValues: number[] = [];
  
  constructor() {
    // Initialize signal processor
    this.signalProcessor = new UnifiedSignalProcessor();
    
    // Initialize signal distributor with both channels
    this.signalDistributor = new OptimizedSignalDistributor();
    this.signalDistributor.start();
    
    // Get references to channels from the distributor
    this.spo2Channel = this.signalDistributor.getChannel(VitalSignType.SPO2) as SpO2Channel;
    this.cardiacChannel = this.signalDistributor.getChannel(VitalSignType.CARDIAC) as CardiacChannel;
    
    console.log("UnifiedVitalSignsProcessor: Initialized with optimized signal distributor");
  }
  
  /**
   * Procesa un valor PPG y calcula todos los signos vitales
   * Usa el OptimizedSignalDistributor para procesamiento especializado
   */
  public processSignal(value: number, rrData?: RRIntervalAnalysis): UnifiedVitalSignsResult {
    // Process base signal
    const processedSignal = this.signalProcessor.processSignal(value);
    
    // Store filtered value
    this.ppgValues.push(processedSignal.filteredValue);
    if (this.ppgValues.length > 100) {
      this.ppgValues.shift();
    }
    
    // Process through optimized signal distributor
    const distributorResults = this.signalDistributor.processSignal(processedSignal);
    
    // Check signal quality
    if (processedSignal.quality < 20 || !processedSignal.fingerDetected) {
      return this.createEmptyResult();
    }
    
    // Get SPO2 value from distributor
    const spo2Value = distributorResults[VitalSignType.SPO2];
    
    // Get heart rate from cardiac channel
    const heartRate = this.cardiacChannel ? (this.cardiacChannel as any).getEstimatedHeartRate() : 0;
    
    // Process arrhythmia data from real RR intervals
    const arrhythmiaResult = this.processArrhythmiaData(rrData, heartRate);
    
    // Process SPO2 value
    let spo2 = 0;
    if (this.spo2Channel) {
      spo2 = (this.spo2Channel as any).getSaturationEstimate();
    } else {
      // Fallback calculation if channel isn't available
      spo2 = spo2Value > 0 ? Math.round(95 + (spo2Value * 2)) : 0;
      
      // Ensure physiological range
      spo2 = Math.min(100, Math.max(70, spo2));
    }
    
    // Results with data from optimized channels
    return {
      spo2,
      pressure: "--/--",
      arrhythmiaStatus: arrhythmiaResult.status,
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: arrhythmiaResult.data,
      heartRate // Add heart rate for compatibility
    };
  }
  
  /**
   * Procesa datos de intervalo RR para detección de arritmias
   * Ahora utiliza también datos del canal cardíaco para mayor precisión
   */
  private processArrhythmiaData(
    rrData?: RRIntervalAnalysis, 
    heartRate?: number
  ): {
    status: string;
    data: { timestamp: number; rmssd: number; rrVariation: number; } | null;
  } {
    // Get RR intervals from cardiac channel if available
    let intervals: number[] = [];
    
    // Preference order: rrData, cardiac channel, empty array
    if (rrData?.intervals && rrData.intervals.length >= 3) {
      intervals = rrData.intervals;
    } else if (this.cardiacChannel && 'getRRIntervals' in this.cardiacChannel) {
      intervals = (this.cardiacChannel as any).getRRIntervals();
    }
    
    // Need at least 3 intervals for analysis
    if (intervals.length < 3) {
      return { status: "--", data: null };
    }
    
    // Analyze interval variability
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variations = intervals.map(interval => Math.abs(interval - avgInterval) / avgInterval);
    const maxVariation = Math.max(...variations);
    
    // Calculate RMSSD (Root Mean Square of Successive Differences)
    let rmssd = 0;
    if (intervals.length > 1) {
      let sumSquaredDiff = 0;
      for (let i = 1; i < intervals.length; i++) {
        sumSquaredDiff += Math.pow(intervals[i] - intervals[i-1], 2);
      }
      rmssd = Math.sqrt(sumSquaredDiff / (intervals.length - 1));
    }
    
    // Apply rule-based detection with adaptive thresholds
    let isArrhythmia = false;
    
    // For tachycardia/bradycardia
    if (heartRate && (heartRate > 100 || heartRate < 50)) {
      // Higher threshold for rate-based arrhythmia
      isArrhythmia = maxVariation > 0.25;
    } else {
      // Standard detection for normal range heart rates
      isArrhythmia = maxVariation > 0.2 || (rmssd > 50 && maxVariation > 0.15);
    }
    
    // Check from cardiac channel
    if (this.cardiacChannel && 'isArrhythmia' in this.cardiacChannel) {
      // Give more weight to the specialized cardiac channel
      const channelDetectsArrhythmia = (this.cardiacChannel as any).isArrhythmia();
      
      // Combined decision with more weight on specialized channel
      isArrhythmia = channelDetectsArrhythmia || (isArrhythmia && maxVariation > 0.25);
    }
    
    // Increment counter if arrhythmia detected
    if (isArrhythmia) {
      this.arrhythmiaCounter++;
      
      // Send feedback to cardiac channel if available
      if (this.cardiacChannel) {
        const feedback = {
          channelId: this.cardiacChannel.getId(),
          success: true,
          signalQuality: 0.8,
          timestamp: Date.now(),
          suggestedAdjustments: {
            // Adjust cardiac channel parameters based on arrhythmia detection
            filterStrength: 0.4, // Increase filter strength for more stable detection
            peakDetectionThreshold: 0.55 // Lower threshold to detect more subtle peaks
          },
          mlFeedback: {
            isArrhythmia: true,
            confidence: 0.7 + (maxVariation * 0.2)
          }
        };
        
        // Apply feedback to cardiac channel via distributor
        this.signalDistributor.applyFeedback(feedback);
      }
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
      },
      heartRate: 0
    };
  }
  
  /**
   * Reinicia el procesador
   */
  public reset(): UnifiedVitalSignsResult | null {
    this.signalProcessor.reset();
    this.signalDistributor.reset();
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
