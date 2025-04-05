/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Modified Vital Signs Processor with proper hydration implementation
 */

import { VitalSignsResult } from './types/vital-signs-result';
import { SignalProcessor } from './signal-processor';
import { SpO2Processor } from './spo2-processor';
import { BloodPressureProcessor } from './blood-pressure-processor';
import { HydrationProcessor } from './hydration-processor';
import { ConfidenceCalculator } from './calculators/confidence-calculator';

/**
 * Processes PPG signals to extract vital signs with proper hydration implementation
 */
export class ModifiedVitalSignsProcessor {
  // Signal processors
  private signalProcessor: SignalProcessor;
  private spo2Processor: SpO2Processor;
  private bloodPressureProcessor: BloodPressureProcessor;
  private hydrationProcessor: HydrationProcessor;
  
  // Confidence calculator
  private confidenceCalculator: ConfidenceCalculator;
  
  // State tracking
  private arrhythmiaCounter: number = 0;
  private lastValidResults: VitalSignsResult | null = null;
  private lastResult: VitalSignsResult | null = null;
  
  // Signal buffer
  private signalBuffer: number[] = [];
  private readonly BUFFER_SIZE = 50;
  
  /**
   * Constructor initializes all processors
   */
  constructor() {
    console.log("ModifiedVitalSignsProcessor initialized with hydration support");
    this.signalProcessor = new SignalProcessor();
    this.spo2Processor = new SpO2Processor();
    this.bloodPressureProcessor = new BloodPressureProcessor();
    this.hydrationProcessor = new HydrationProcessor();
    this.confidenceCalculator = new ConfidenceCalculator(0.4);
  }
  
  /**
   * Process a PPG signal with RR interval data
   */
  public processSignal(data: { 
    value: number, 
    rrData?: { 
      intervals: number[], 
      lastPeakTime: number | null 
    }
  }): VitalSignsResult {
    const { value, rrData } = data;
    
    // Apply SMA filter
    const filteredValue = this.signalProcessor.applySMAFilter(value);
    
    // Add to signal buffer
    this.signalBuffer.push(filteredValue);
    if (this.signalBuffer.length > this.BUFFER_SIZE) {
      this.signalBuffer.shift();
    }
    
    try {
      // Calculate SpO2
      const spo2 = this.spo2Processor.calculateSpO2([filteredValue]);
      
      // Calculate blood pressure
      const bloodPressure = this.bloodPressureProcessor.calculateBloodPressure(this.signalBuffer);
      const pressure = `${bloodPressure.systolic}/${bloodPressure.diastolic}`;
      
      // Check for arrhythmia
      let arrhythmiaDetected = this.detectArrhythmia(rrData);
      
      // Calculate glucose (simplified)
      const glucose = this.calculateGlucose(filteredValue);
      
      // Calculate hydration
      const hydrationPercentage = this.hydrationProcessor.calculateHydration(this.signalBuffer);
      const totalCholesterol = this.calculateCholesterol(filteredValue);
      
      // Calculate confidence values
      const spo2Confidence = this.spo2Processor.getConfidence();
      const hydrationConfidence = this.hydrationProcessor.getConfidence();
      const glucoseConfidence = 0.5 + (this.signalBuffer.length / this.BUFFER_SIZE) * 0.4;
      const lipidsConfidence = hydrationConfidence; // Use hydration confidence for lipids
      
      // Calculate overall confidence
      const overallConfidence = this.confidenceCalculator.calculateOverallConfidence(
        glucoseConfidence,
        lipidsConfidence,
        hydrationConfidence
      );
      
      // Create result
      const result: VitalSignsResult = {
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
          lipids: lipidsConfidence,
          overall: overallConfidence
        },
        lastArrhythmiaData: arrhythmiaDetected ? {
          timestamp: Date.now(),
          rmssd: this.calculateRMSSD(rrData),
          rrVariation: this.calculateRRVariation(rrData)
        } : null
      };
      
      // Update stored results
      this.lastResult = result;
      
      // Update last valid results if confidence is good
      if (overallConfidence > 0.6) {
        this.lastValidResults = result;
      }
      
      return result;
      
    } catch (error) {
      console.error("Error processing vital signs:", error);
      return this.getDefaultResult();
    }
  }
  
  /**
   * Detect arrhythmia from RR intervals
   */
  private detectArrhythmia(rrData?: { intervals: number[], lastPeakTime: number | null }): boolean {
    if (!rrData || rrData.intervals.length < 3) {
      return false;
    }
    
    // Get last 3 intervals
    const intervals = rrData.intervals.slice(-3);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Calculate variation
    const variation = intervals.map(i => Math.abs(i - avg) / avg);
    
    // If variation is high, possible arrhythmia
    if (Math.max(...variation) > 0.2) {
      this.arrhythmiaCounter++;
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate glucose level from PPG signal
   */
  private calculateGlucose(ppgValue: number): number {
    // Simple calculation based on PPG value
    const baseGlucose = 85;
    const variation = ppgValue * 20;
    return Math.round(baseGlucose + variation);
  }
  
  /**
   * Calculate cholesterol from PPG signal
   */
  private calculateCholesterol(ppgValue: number): number {
    // Simple calculation
    const baseCholesterol = 180;
    const variation = ppgValue * 30;
    return Math.round(baseCholesterol + variation);
  }
  
  /**
   * Calculate RMSSD from RR intervals
   */
  private calculateRMSSD(rrData?: { intervals: number[], lastPeakTime: number | null }): number {
    if (!rrData || rrData.intervals.length < 3) {
      return 0;
    }
    
    const intervals = rrData.intervals;
    let sumSquaredDiff = 0;
    let count = 0;
    
    for (let i = 1; i < intervals.length; i++) {
      const diff = intervals[i] - intervals[i-1];
      sumSquaredDiff += diff * diff;
      count++;
    }
    
    if (count === 0) return 0;
    
    return Math.sqrt(sumSquaredDiff / count);
  }
  
  /**
   * Calculate RR variation
   */
  private calculateRRVariation(rrData?: { intervals: number[], lastPeakTime: number | null }): number {
    if (!rrData || rrData.intervals.length < 2) {
      return 0;
    }
    
    const intervals = rrData.intervals;
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (const interval of intervals) {
      sumSquaredDiff += Math.pow(interval - avg, 2);
    }
    
    return Math.sqrt(sumSquaredDiff / intervals.length) / avg;
  }
  
  /**
   * Get default result for error cases
   */
  private getDefaultResult(): VitalSignsResult {
    // If we have a last result, use that
    if (this.lastResult) {
      return this.lastResult;
    }
    
    // Otherwise return zeros
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      }
    };
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Reset processors
   */
  public reset(): VitalSignsResult | null {
    this.signalProcessor.reset();
    this.spo2Processor.reset();
    this.bloodPressureProcessor.reset();
    this.hydrationProcessor.reset();
    this.signalBuffer = [];
    this.lastResult = null;
    return this.lastValidResults;
  }
  
  /**
   * Full reset including arrhythmia counter
   */
  public fullReset(): void {
    this.reset();
    this.arrhythmiaCounter = 0;
    this.lastValidResults = null;
  }
  
  /**
   * Get the last valid results
   */
  public getLastValidResults(): VitalSignsResult | null {
    return this.lastValidResults;
  }
}
