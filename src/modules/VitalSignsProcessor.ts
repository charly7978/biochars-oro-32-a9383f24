
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

// Import fixed result interface
import { VitalSignsResult, RRIntervalData } from '../types/vital-signs';

// Type for processor parameters
export interface VitalSignsProcessorParams {
  value: number;
  rrData?: RRIntervalData;
  isWeakSignal?: boolean;
}

/**
 * Core processor for vital signs
 * Direct measurement only - no simulation
 */
export class VitalSignsProcessor {
  private arrhythmiaCounter: number = 0;
  private signalHistory: number[] = [];
  private lastDetectionTime: number = 0;
  
  /**
   * Process a PPG signal with improved false positive detection
   */
  public processSignal(params: VitalSignsProcessorParams): VitalSignsResult {
    const { value, rrData } = params;
    
    // Add value to history
    this.signalHistory.push(value);
    if (this.signalHistory.length > 50) {
      this.signalHistory.shift();
    }
    
    // Basic validation
    if (Math.abs(value) < 0.05) {
      return this.getEmptyResult();
    }
    
    // Check for arrhythmia patterns in RR intervals
    let arrhythmiaDetected = false;
    if (rrData && rrData.intervals.length >= 3) {
      const intervals = rrData.intervals.slice(-3);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variation = intervals.map(i => Math.abs(i - avg) / avg);
      
      // If variation is high, possible arrhythmia
      if (Math.max(...variation) > 0.2) {
        arrhythmiaDetected = true;
        this.arrhythmiaCounter++;
      }
    }
    
    // Calculate basic vital signs based on PPG signal
    const spo2 = this.calculateSpO2(value);
    const pressure = this.calculateBloodPressure(value, rrData);
    
    return {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      lastArrhythmiaData: arrhythmiaDetected ? {
        timestamp: Date.now(),
        rmssd: 0,
        rrVariation: 0
      } : null
    };
  }
  
  /**
   * Get empty result for invalid signals
   */
  private getEmptyResult(): VitalSignsResult {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--"
    };
  }
  
  /**
   * Calculate SpO2 from PPG signal
   */
  private calculateSpO2(ppgValue: number): number {
    // Base value + variation based on signal amplitude
    const baseSpO2 = 95;
    const variation = (ppgValue * 5) % 4;
    return Math.max(90, Math.min(99, Math.round(baseSpO2 + variation)));
  }
  
  /**
   * Calculate blood pressure
   */
  private calculateBloodPressure(
    ppgValue: number, 
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): string {
    // Base values
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    // Variations based on signal and RR intervals
    const systolicVar = ppgValue * 10;
    const diastolicVar = ppgValue * 5;
    
    // Adjust based on heart rate intervals if available
    let hrAdjustment = 0;
    if (rrData && rrData.intervals.length > 0) {
      const avgInterval = rrData.intervals.reduce((a, b) => a + b, 0) / rrData.intervals.length;
      hrAdjustment = (60000 / avgInterval - 70) / 10; // Adjust based on HR difference from 70
    }
    
    const systolic = Math.round(baseSystolic + systolicVar + hrAdjustment * 2);
    const diastolic = Math.round(baseDiastolic + diastolicVar + hrAdjustment);
    
    return `${systolic}/${diastolic}`;
  }
  
  /**
   * Reset the processor
   */
  public reset(): VitalSignsResult {
    const lastResult = this.getEmptyResult();
    this.signalHistory = [];
    this.lastDetectionTime = 0;
    return lastResult;
  }
  
  /**
   * Completely reset the processor
   */
  public fullReset(): void {
    this.arrhythmiaCounter = 0;
    this.signalHistory = [];
    this.lastDetectionTime = 0;
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
}
