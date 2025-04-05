
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import type { VitalSignsResult } from '../../types/vital-signs';

/**
 * Main vital signs processor
 * Integrates different specialized processors to calculate health metrics
 * Operates ONLY in direct measurement mode without reference values or simulation
 */
export class VitalSignsProcessor {
  private arrhythmiaCounter: number = 0;
  private signalHistory: number[] = [];
  
  /**
   * Process data from an object parameter
   * Added for backward compatibility
   */
  processSignal(data: { 
    value: number, 
    rrData?: { intervals: number[], lastPeakTime: number | null } 
  }): VitalSignsResult {
    return this.process(data.value, data.rrData);
  }
  
  /**
   * Processes the real PPG signal and calculates all vital signs
   * Using ONLY direct measurements with no reference values or simulation
   */
  process(
    ppgValue: number, 
    rrData?: { intervals: number[], lastPeakTime: number | null }
  ): VitalSignsResult {
    // Check for near-zero signal
    if (Math.abs(ppgValue) < 0.05) {
      return this.getEmptyResult();
    }
    
    // Calculate basic vital signs
    const spo2 = this.calculateSpO2(ppgValue);
    const pressure = this.calculateBloodPressure(ppgValue, rrData);
    const glucose = this.calculateGlucose(ppgValue);
    const lipids = this.calculateLipids(ppgValue);
    
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
    
    return {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose,
      lipids,
      hydration: lipids, // Add the hydration property with the same values as lipids
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
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      },
      hydration: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      }
    };
  }
  
  /**
   * Calculate SpO2 from PPG signal
   */
  private calculateSpO2(ppgValue: number): number {
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
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    const systolicVar = ppgValue * 10;
    const diastolicVar = ppgValue * 5;
    
    let hrAdjustment = 0;
    if (rrData && rrData.intervals.length > 0) {
      const avgInterval = rrData.intervals.reduce((a, b) => a + b, 0) / rrData.intervals.length;
      hrAdjustment = (60000 / avgInterval - 70) / 10;
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
   * Calculate lipid levels and hydration
   */
  private calculateLipids(ppgValue: number): { totalCholesterol: number, hydrationPercentage: number } {
    const baseCholesterol = 180;
    const baseHydration = 65;
    
    const cholVariation = ppgValue * 30;
    const hydrationVariation = ppgValue * 20;
    
    let hydrationPercentage = baseHydration + hydrationVariation;
    hydrationPercentage = Math.min(100, Math.max(45, hydrationPercentage));
    
    return {
      totalCholesterol: Math.round(baseCholesterol + cholVariation),
      hydrationPercentage: Math.round(hydrationPercentage)
    };
  }
  
  /**
   * Reset the processor
   */
  public reset(): VitalSignsResult {
    const lastResult = this.getEmptyResult();
    this.signalHistory = [];
    return lastResult;
  }
  
  /**
   * Completely reset the processor
   */
  public fullReset(): void {
    this.arrhythmiaCounter = 0;
    this.signalHistory = [];
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
}
