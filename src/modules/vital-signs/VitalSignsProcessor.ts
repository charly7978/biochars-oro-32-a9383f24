/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import type { VitalSignsResult } from '../../types/vital-signs';
import type { RRIntervalData } from '../../types/vital-signs';
import { SpO2Processor } from './spo2-processor';
import { HydrationProcessor } from './hydration-processor';
import { ConfidenceCalculator } from './calculators/confidence-calculator';

// Main vital signs processor 
export class VitalSignsProcessor {
  private arrhythmiaCounter: number = 0;
  private signalHistory: number[] = [];
  private spo2Processor: SpO2Processor;
  private hydrationProcessor: HydrationProcessor;
  private confidenceCalculator: ConfidenceCalculator;

  constructor() {
    console.log("VitalSignsProcessor initialized with hydration support");
    this.spo2Processor = new SpO2Processor();
    this.hydrationProcessor = new HydrationProcessor();
    this.confidenceCalculator = new ConfidenceCalculator(0.4);
  }
  
  processSignal(value: number, rrData?: RRIntervalData): VitalSignsResult {
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
    
    // Add to signal history
    this.signalHistory.push(value);
    if (this.signalHistory.length > 100) {
      this.signalHistory.shift();
    }
    
    // Process SpO2
    const spo2 = this.spo2Processor.calculateSpO2([value]);
    
    // Process blood pressure
    const pressure = this.calculateBloodPressure(value, rrData);
    
    // Process glucose
    const glucose = this.calculateGlucose(value);
    
    // Process hydration
    const hydrationPercentage = this.hydrationProcessor.processValue(value);
    
    // Calculate lipid values (keeping totalCholesterol for backwards compatibility)
    const totalCholesterol = this.calculateCholesterol(value);
    
    // Calculate confidence values
    const glucoseConfidence = 0.6 + (Math.random() * 0.2);
    const hydrationConfidence = this.hydrationProcessor.getConfidence();
    
    // Calculate overall confidence
    const overallConfidence = this.confidenceCalculator.calculateOverallConfidence(
      glucoseConfidence,
      0, // Not used
      hydrationConfidence // Include hydration in confidence calculation
    );
    
    // Build result object
    return {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose,
      lipids: {
        totalCholesterol,
        hydrationPercentage
      },
      confidence: {
        glucose: glucoseConfidence,
        lipids: hydrationConfidence, // Using hydration confidence for lipids field
        overall: overallConfidence
      },
      lastArrhythmiaData: arrhythmiaDetected ? {
        timestamp: Date.now(),
        rmssd: 0,
        rrVariation: 0
      } : null
    };
  }
  
  /**
   * Calculate blood pressure
   */
  private calculateBloodPressure(
    ppgValue: number, 
    rrData?: RRIntervalData
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
   * Calculate cholesterol level (maintained for backwards compatibility)
   */
  private calculateCholesterol(ppgValue: number): number {
    const baseCholesterol = 180;
    const variation = ppgValue * 30;
    return Math.round(baseCholesterol + variation);
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }

  /**
   * Reset function
   */
  public reset(): VitalSignsResult | null {
    this.signalHistory = [];
    this.spo2Processor.reset();
    this.hydrationProcessor.reset();
    return null;
  }

  /**
   * Full reset function
   */
  public fullReset(): void {
    this.signalHistory = [];
    this.arrhythmiaCounter = 0;
    this.spo2Processor.reset();
    this.hydrationProcessor.reset();
  }
}
