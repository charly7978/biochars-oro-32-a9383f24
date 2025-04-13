
/**
 * Unified processor for vital signs extraction from PPG signal
 */
import { SignalProcessor } from './signal-processor';
import { ResultFactory } from './factories/result-factory';
import { ConfidenceCalculator } from './calculators/confidence-calculator';
import { HydrationProcessor, HydrationResult } from './specialized/HydrationProcessor';
import { VitalSignsResult } from './types/vital-signs-result';

// Interface for signal input to the processor
interface SignalInput {
  value: number;
  rrData?: { 
    intervals: number[]; 
    lastPeakTime: number | null;
  };
}

/**
 * Main processor for vital signs extraction
 * Integrates specialized processors and produces standardized results
 */
export class VitalSignsProcessor {
  private signalProcessor: SignalProcessor;
  private confidenceCalculator: ConfidenceCalculator;
  private hydrationProcessor: HydrationProcessor;
  private lastValidResult: VitalSignsResult | null = null;
  private arrhythmiaCounter: number = 0;
  private processedValues: number = 0;
  
  constructor() {
    this.signalProcessor = new SignalProcessor();
    this.confidenceCalculator = new ConfidenceCalculator(0.4);
    this.hydrationProcessor = new HydrationProcessor();
    this.reset();
  }
  
  /**
   * Process a PPG signal to extract vital signs
   * @param input Signal input containing value and optional RR data
   * @returns VitalSignsResult object with extracted measurements
   */
  public processSignal(input: SignalInput): VitalSignsResult {
    const { value, rrData } = input;
    
    // Apply signal processing
    const filteredValue = this.signalProcessor.applySMAFilter(value);
    
    // Process with specialized processors
    const hydrationResult = this.hydrationProcessor.processValue(filteredValue);
    
    // Check for arrhythmia
    let arrhythmiaStatus = "--";
    
    if (rrData && rrData.intervals.length > 0) {
      const isArrhythmia = this.detectArrhythmia(rrData.intervals);
      
      if (isArrhythmia) {
        this.arrhythmiaCounter++;
        arrhythmiaStatus = `Detectada|${this.arrhythmiaCounter}`;
      } else {
        arrhythmiaStatus = `Normal|${this.arrhythmiaCounter}`;
      }
    }
    
    // Calculate glucose (simplified example)
    const glucose = this.calculateGlucose(filteredValue, hydrationResult.hydrationPercentage);
    
    // Calculate blood pressure (simplified example)
    const pressure = this.calculateBloodPressure(filteredValue, rrData?.intervals || []);
    
    // Calculate SPO2 (simplified example)
    const spo2 = this.calculateSpO2(filteredValue, hydrationResult.hydrationPercentage);
    
    // Calculate confidences
    const glucoseConfidence = 0.5 + (hydrationResult.confidence * 0.3);
    const lipidsConfidence = hydrationResult.confidence;
    
    const overallConfidence = this.confidenceCalculator.calculateOverallConfidence(
      glucoseConfidence,
      lipidsConfidence,
      hydrationResult.confidence
    );
    
    // Create result
    const result: VitalSignsResult = ResultFactory.createResult(
      spo2,
      pressure,
      arrhythmiaStatus,
      glucose,
      {
        totalCholesterol: 180, // Fixed example value
        hydrationPercentage: hydrationResult.hydrationPercentage
      },
      {
        glucose: glucoseConfidence,
        lipids: lipidsConfidence,
        overall: overallConfidence
      },
      rrData?.lastPeakTime ? {
        timestamp: rrData.lastPeakTime,
        rmssd: this.calculateRMSSD(rrData.intervals),
        rrVariation: this.calculateRRVariation(rrData.intervals)
      } : null
    );
    
    // Store if valid result
    if (overallConfidence > this.confidenceCalculator.getConfidenceThreshold()) {
      this.lastValidResult = result;
    }
    
    this.processedValues++;
    
    // Log processing progress
    if (this.processedValues % 50 === 0) {
      console.log(`Processed ${this.processedValues} values. Latest hydration: ${hydrationResult.hydrationPercentage}%`);
    }
    
    return result;
  }
  
  /**
   * Reset processor state
   * @returns Last valid result before reset
   */
  public reset(): VitalSignsResult | null {
    const lastResult = this.lastValidResult;
    
    // Reset all processors
    this.signalProcessor.reset();
    this.hydrationProcessor.reset();
    
    // Maintain arrhythmia counter but reset other state
    this.lastValidResult = null;
    
    return lastResult;
  }
  
  /**
   * Full reset of processor (including arrhythmia counter)
   */
  public fullReset(): void {
    this.reset();
    this.arrhythmiaCounter = 0;
    this.processedValues = 0;
  }
  
  /**
   * Get arrhythmia counter
   * @returns Current arrhythmia count
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
  
  /**
   * Get the last valid result
   * @returns Last valid VitalSignsResult
   */
  public getLastValidResult(): VitalSignsResult | null {
    return this.lastValidResult;
  }
  
  /**
   * Detect arrhythmia from RR intervals
   * @param rrIntervals Array of RR intervals in ms
   * @returns Boolean indicating arrhythmia detection
   */
  private detectArrhythmia(rrIntervals: number[]): boolean {
    if (rrIntervals.length < 3) return false;
    
    // Calculate consecutive differences
    const diffs = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      diffs.push(Math.abs(rrIntervals[i] - rrIntervals[i - 1]));
    }
    
    // Check for significant variation
    const threshold = 100; // ms
    return diffs.some(diff => diff > threshold);
  }
  
  /**
   * Calculate RMSSD from RR intervals
   * @param rrIntervals Array of RR intervals in ms
   * @returns RMSSD value
   */
  private calculateRMSSD(rrIntervals: number[]): number {
    if (rrIntervals.length < 2) return 0;
    
    let sumSquaredDiffs = 0;
    let count = 0;
    
    for (let i = 1; i < rrIntervals.length; i++) {
      const diff = rrIntervals[i] - rrIntervals[i - 1];
      sumSquaredDiffs += diff * diff;
      count++;
    }
    
    return count > 0 ? Math.sqrt(sumSquaredDiffs / count) : 0;
  }
  
  /**
   * Calculate RR variation
   * @param rrIntervals Array of RR intervals in ms
   * @returns RR variation value
   */
  private calculateRRVariation(rrIntervals: number[]): number {
    if (rrIntervals.length < 2) return 0;
    
    const avg = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
    const diffs = rrIntervals.map(rr => Math.abs(rr - avg));
    const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
    
    return avgDiff;
  }
  
  /**
   * Calculate glucose based on signal and hydration
   * @param ppgValue Filtered PPG value
   * @param hydrationPercentage Hydration percentage
   * @returns Estimated glucose value
   */
  private calculateGlucose(ppgValue: number, hydrationPercentage: number): number {
    // Simplified example calculation using filtered PPG and hydration
    // This is not medically accurate, just for example purposes
    const baseValue = 80 + Math.abs(ppgValue * 10);
    const hydrationFactor = 1 + ((100 - hydrationPercentage) / 200);
    
    return Math.round(baseValue * hydrationFactor);
  }
  
  /**
   * Calculate blood pressure based on signal and RR intervals
   * @param ppgValue Filtered PPG value
   * @param rrIntervals Array of RR intervals in ms
   * @returns Blood pressure string (systolic/diastolic)
   */
  private calculateBloodPressure(ppgValue: number, rrIntervals: number[]): string {
    // Simplified example calculation
    // This is not medically accurate, just for example purposes
    
    // Calculate average RR interval
    const avgRR = rrIntervals.length > 0 
      ? rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length 
      : 800; // Default
    
    // Convert to heart rate
    const hr = 60000 / avgRR;
    
    // Simple formula (not medical)
    const systolic = Math.round(90 + (hr * 0.3) + Math.abs(ppgValue * 5));
    const diastolic = Math.round(60 + (hr * 0.15) + Math.abs(ppgValue * 2));
    
    return `${systolic}/${diastolic}`;
  }
  
  /**
   * Calculate SpO2 based on signal and hydration
   * @param ppgValue Filtered PPG value
   * @param hydrationPercentage Hydration percentage
   * @returns Estimated SpO2 value
   */
  private calculateSpO2(ppgValue: number, hydrationPercentage: number): number {
    // Simplified example calculation
    // This is not medically accurate, just for example purposes
    const baseValue = 95 + (Math.abs(ppgValue) * 0.2);
    const hydrationFactor = 1 + ((hydrationPercentage - 50) / 500);
    
    return Math.min(99, Math.round(baseValue * hydrationFactor));
  }
}
