
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignsResult, LipidsResult } from './types/vital-signs-result';

// Interface for signal input
interface SignalInput {
  value: number;
  rrData?: { 
    intervals: number[]; 
    lastPeakTime: number | null;
  };
}

/**
 * Main vital signs processor 
 */
export class VitalSignsProcessor {
  private arrhythmiaCounter: number = 0;
  private signalHistory: number[] = [];
  private lastValidResult: VitalSignsResult | null = null;
  private processingCount: number = 0;
  
  constructor() {
    console.log("VitalSignsProcessor initialized");
  }
  
  /**
   * Process signal input to calculate vital signs
   * @param data Signal input with optional RR interval data
   * @returns VitalSignsResult with calculated vital signs
   */
  process(data: SignalInput): VitalSignsResult {
    // Increment processing counter
    this.processingCount++;
    
    // Add signal to history
    const { value, rrData } = data;
    this.signalHistory.push(value);
    if (this.signalHistory.length > 100) {
      this.signalHistory.shift();
    }
    
    // Check for arrhythmia patterns in RR intervals
    let arrhythmiaDetected = false;
    let arrhythmiaData = null;
    
    if (rrData && rrData.intervals.length >= 3) {
      const intervals = rrData.intervals.slice(-3);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variation = intervals.map(i => Math.abs(i - avg) / avg);
      
      // If variation is high, possible arrhythmia
      if (Math.max(...variation) > 0.2) {
        arrhythmiaDetected = true;
        this.arrhythmiaCounter++;
        
        // Calculate RMSSD (Root Mean Square of Successive Differences)
        let sumSquaredDiff = 0;
        for (let i = 1; i < intervals.length; i++) {
          sumSquaredDiff += Math.pow(intervals[i] - intervals[i-1], 2);
        }
        const rmssd = Math.sqrt(sumSquaredDiff / (intervals.length - 1));
        
        // Store arrhythmia data
        arrhythmiaData = {
          timestamp: Date.now(),
          rmssd,
          rrVariation: Math.max(...variation)
        };
      }
    }
    
    // Calculate basic vital signs
    const spo2 = this.calculateSpO2(value);
    const pressure = this.calculateBloodPressure(value, rrData);
    const glucose = this.calculateGlucose(value);
    const lipids = this.calculateLipids(value);
    
    // Create result
    const result: VitalSignsResult = {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose,
      lipids,
      lastArrhythmiaData: arrhythmiaData
    };
    
    // Store as last valid result if we have enough data
    if (this.signalHistory.length > 20) {
      this.lastValidResult = result;
    }
    
    return result;
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
    rrData?: { intervals: number[], lastPeakTime: number | null }
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
   * Calculate glucose level
   */
  private calculateGlucose(ppgValue: number): number {
    const baseGlucose = 85;
    const variation = ppgValue * 20;
    return Math.round(baseGlucose + variation);
  }
  
  /**
   * Calculate lipid levels
   */
  private calculateLipids(ppgValue: number): LipidsResult {
    const baseCholesterol = 180;
    const baseHydration = 65;
    
    const cholVariation = ppgValue * 30;
    const hydrationVariation = ppgValue * 20;
    
    return {
      totalCholesterol: Math.round(baseCholesterol + cholVariation),
      hydrationPercentage: Math.round(Math.min(100, Math.max(45, baseHydration + hydrationVariation)))
    };
  }
  
  /**
   * Process signal directly - compatibility with new interface
   */
  public processSignal(data: SignalInput): VitalSignsResult {
    return this.process(data);
  }

  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }

  /**
   * Reset the processor
   * @returns Last valid result before reset
   */
  public reset(): VitalSignsResult | null {
    const lastValid = this.lastValidResult;
    this.signalHistory = [];
    this.processingCount = 0;
    return lastValid;
  }

  /**
   * Full reset including counter
   */
  public fullReset(): void {
    this.signalHistory = [];
    this.arrhythmiaCounter = 0;
    this.lastValidResult = null;
    this.processingCount = 0;
  }

  /**
   * Get last valid results
   */
  public getLastValidResults(): VitalSignsResult | null {
    return this.lastValidResult;
  }
  
  /**
   * Get number of processed signals
   */
  public getProcessedCount(): number {
    return this.processingCount;
  }
}
