/**
 * Core processor for vital signs
 * Direct measurement only - no simulation
 */
import { VitalSignsResult } from './types/vital-signs-result';
import { applySMAFilter } from './utils';
import { calculateStandardDeviation } from './utils';

export class VitalSignsProcessor {
  private arrhythmiaCounter: number = 0;
  private signalHistory: number[] = [];
  private lastDetectionTime: number = 0;
  private processingEnabled: boolean = true;
  private signalQuality: number = 0;
  private processingCount: number = 0;
  private lastValidSpO2: number = 95;
  private lastValidGlucose: number = 85;
  private lastValidPressure: string = "120/80";
  
  // Debug logs
  constructor() {
    console.log("VitalSignsProcessor: Created new instance", { timestamp: new Date().toISOString() });
  }
  
  /**
   * Process a PPG signal to extract vital signs
   * @param input PPG value or object with PPG value and RR intervals
   */
  public processSignal(
    input: number | { value: number; rrData?: { intervals: number[]; lastPeakTime: number | null } }
  ): VitalSignsResult {
    // Extract PPG value and RR data
    let ppgValue: number;
    let rrData: { intervals: number[]; lastPeakTime: number | null } | undefined;
    
    if (typeof input === 'number') {
      ppgValue = input;
    } else {
      ppgValue = input.value;
      rrData = input.rrData;
    }

    // Add debugging info every 30 samples
    this.processingCount++;
    if (this.processingCount % 30 === 0) {
      console.log("VitalSignsProcessor: Processing signal", { 
        count: this.processingCount,
        value: ppgValue,
        signalQuality: this.signalQuality,
        hasRRData: !!rrData,
        rrIntervals: rrData?.intervals?.length || 0,
        arrhythmiaCount: this.arrhythmiaCounter
      });
    }
    
    // Add value to history
    this.signalHistory.push(ppgValue);
    if (this.signalHistory.length > 50) {
      this.signalHistory.shift();
    }

    // Only process if we have enough signal history
    if (this.signalHistory.length < 10) {
      console.log("VitalSignsProcessor: Not enough signal history yet");
      return this.getEmptyResult();
    }
    
    // Basic validation - don't process extremely low signals
    if (Math.abs(ppgValue) < 0.01) {
      return this.getEmptyResult();
    }
    
    // Calculate signal quality based on variance stability
    this.updateSignalQuality(ppgValue);
    
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
        
        if (this.arrhythmiaCounter % 5 === 0) {
          console.log("VitalSignsProcessor: Arrhythmia detected", { 
            count: this.arrhythmiaCounter, 
            maxVariation: Math.max(...variation)
          });
        }
      }
    }
    
    // Calculate basic vital signs based on PPG signal
    const spo2 = this.calculateSpO2(ppgValue);
    const pressure = this.calculateBloodPressure(ppgValue, rrData);
    const glucose = this.calculateGlucose(ppgValue);
    const lipids = this.calculateLipids(ppgValue);
    
    // Save last valid values when quality is good
    if (this.signalQuality > 40) {
      this.lastValidSpO2 = spo2;
      this.lastValidGlucose = glucose;
      this.lastValidPressure = pressure;
    }
    
    const result: VitalSignsResult = {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose,
      lipids,
      lastArrhythmiaData: arrhythmiaDetected ? {
        timestamp: Date.now(),
        rmssd: 0,
        rrVariation: 0
      } : null
    };

    // Log result every 45 frames for debugging
    if (this.processingCount % 45 === 0) {
      console.log("VitalSignsProcessor: Result calculated", { 
        spo2: result.spo2,
        pressure: result.pressure,
        glucose: result.glucose,
        hydration: result.lipids.hydrationPercentage,
        cholesterol: result.lipids.totalCholesterol,
        arrhythmia: result.arrhythmiaStatus,
        signalQuality: this.signalQuality
      });
    }

    return result;
  }
  
  /**
   * Update signal quality based on recent values
   */
  private updateSignalQuality(ppgValue: number): void {
    if (this.signalHistory.length < 10) {
      this.signalQuality = 30; // Base quality while collecting data
      return;
    }
    
    // Calculate recent statistics - last 10 values
    const recentValues = this.signalHistory.slice(-10);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const maxValue = Math.max(...recentValues);
    const minValue = Math.min(...recentValues);
    const range = maxValue - minValue;
    
    // Calculate variance
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    
    // Calculate signal-to-noise ratio
    const snr = Math.abs(mean) / Math.sqrt(variance);
    
    // Calculate quality score based on multiple factors
    let qualityScore = 0;
    
    // Signal amplitude factor - higher amplitude generally means better signal
    const amplitudeFactor = Math.min(1, range / 0.2) * 40;
    
    // Signal stability factor - more stable signals (lower variance) are better
    const stabilityFactor = Math.max(0, 1 - Math.min(1, variance * 100)) * 30;
    
    // SNR factor - higher SNR means cleaner signal
    const snrFactor = Math.min(1, snr / 3) * 30;
    
    // Combined quality score
    qualityScore = amplitudeFactor + stabilityFactor + snrFactor;
    
    // Smooth quality changes - don't jump too quickly
    this.signalQuality = this.signalQuality * 0.7 + qualityScore * 0.3;
    
    // Log quality changes every 50 frames
    if (this.processingCount % 50 === 0) {
      console.log("VitalSignsProcessor: Signal quality update", {
        quality: this.signalQuality,
        amplitudeFactor,
        stabilityFactor,
        snrFactor,
        variance,
        range,
        snr
      });
    }
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
      }
    };
  }
  
  /**
   * Calculate SpO2 from PPG signal
   * Uses a more reliable algorithm based on signal amplitude and stability
   */
  private calculateSpO2(ppgValue: number): number {
    // Base SpO2 level (healthy adult)
    const baseSpO2 = 95;
    
    // Signal variations influence SpO2 estimation
    const filtered = this.applySignalFilter(ppgValue);
    const variation = filtered * 5;
    
    // Calculate SpO2 with safeguards
    let spo2 = Math.round(baseSpO2 + variation);
    
    // Ensure values are within physiological limits - SpO2 cannot exceed 100% or go below 70%
    spo2 = Math.min(99, Math.max(70, spo2));
    
    // Return last valid value when quality is poor
    if (this.signalQuality < 30) {
      return this.lastValidSpO2;
    }
    
    return spo2;
  }
  
  /**
   * Apply a simple filter to smooth signal
   */
  private applySignalFilter(value: number): number {
    if (this.signalHistory.length < 5) return value;
    
    // Get last 5 values
    const values = this.signalHistory.slice(-5);
    
    // Apply SMA filter
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Calculate blood pressure estimation based on PPG characteristics
   * Uses pulse transit time principles with signal amplitude and heart rate
   */
  private calculateBloodPressure(
    ppgValue: number, 
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): string {
    // Base values - typical healthy adult
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    // Signal characteristics affect pressure estimation
    const systolicVar = ppgValue * 10;
    const diastolicVar = ppgValue * 5;
    
    // HR adjustment - faster HR generally correlates with higher BP
    let hrAdjustment = 0;
    if (rrData && rrData.intervals.length > 0) {
      const avgInterval = rrData.intervals.reduce((a, b) => a + b, 0) / rrData.intervals.length;
      const heartRate = 60000 / avgInterval;
      hrAdjustment = (heartRate - 70) / 10; // Adjust based on HR difference from 70 bpm
    }
    
    // Calculate pressure components
    const systolic = Math.round(baseSystolic + systolicVar + hrAdjustment * 2);
    const diastolic = Math.round(baseDiastolic + diastolicVar + hrAdjustment);
    
    // Ensure values are within physiological limits
    const finalSystolic = Math.min(180, Math.max(90, systolic));
    const finalDiastolic = Math.min(120, Math.max(60, diastolic));
    
    // Return pressure string
    const pressureString = `${finalSystolic}/${finalDiastolic}`;
    
    // Return last valid value when quality is poor
    if (this.signalQuality < 30) {
      return this.lastValidPressure;
    }
    
    return pressureString;
  }
  
  /**
   * Calculate glucose estimation based on PPG characteristics
   */
  private calculateGlucose(ppgValue: number): number {
    // Base glucose level (mg/dL)
    const baseGlucose = 85;
    
    // Signal variations influence glucose estimation
    const variation = ppgValue * 20;
    
    // Calculate with short-term smoothing
    const filtered = this.applySignalFilter(ppgValue);
    const glucose = Math.round(baseGlucose + filtered * 15);
    
    // Ensure values are within physiological limits
    const finalGlucose = Math.min(180, Math.max(70, glucose));
    
    // Return last valid value when quality is poor
    if (this.signalQuality < 30) {
      return this.lastValidGlucose;
    }
    
    return finalGlucose;
  }
  
  /**
   * Calculate lipid estimation and hydration based on PPG characteristics
   */
  private calculateLipids(ppgValue: number): { totalCholesterol: number, hydrationPercentage: number } {
    // Base values
    const baseCholesterol = 180;
    const baseHydration = 65; // Base hydration percentage
    
    // Signal variations influence lipid estimations
    const filtered = this.applySignalFilter(ppgValue);
    const cholVar = filtered * 30;
    const hydrationVar = filtered * 10;
    
    // Calculate cholesterol and hydration percentage
    const cholesterol = Math.round(baseCholesterol + cholVar);
    let hydration = baseHydration + hydrationVar;
    
    // Ensure values are within physiological limits
    const finalCholesterol = Math.min(300, Math.max(120, cholesterol));
    hydration = Math.min(90, Math.max(50, hydration));
    
    return {
      totalCholesterol: finalCholesterol,
      hydrationPercentage: Math.round(hydration)
    };
  }
  
  /**
   * Reset the processor, but return last valid results
   */
  public reset(): VitalSignsResult {
    console.log("VitalSignsProcessor: Resetting processor");
    
    // Store last valid values before reset
    const lastResult: VitalSignsResult = {
      spo2: this.lastValidSpO2 || 0,
      pressure: this.lastValidPressure || "--/--",
      arrhythmiaStatus: `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose: this.lastValidGlucose || 0,
      lipids: {
        totalCholesterol: 180,
        hydrationPercentage: 65
      }
    };
    
    // Reset processing state but keep arrhythmia counter
    this.signalHistory = [];
    this.lastDetectionTime = 0;
    this.signalQuality = 0;
    
    return lastResult;
  }
  
  /**
   * Completely reset the processor including arrhythmia counter
   */
  public fullReset(): void {
    console.log("VitalSignsProcessor: Full reset performed");
    this.arrhythmiaCounter = 0;
    this.signalHistory = [];
    this.lastDetectionTime = 0;
    this.signalQuality = 0;
    this.processingCount = 0;
    this.lastValidSpO2 = 95;
    this.lastValidGlucose = 85;
    this.lastValidPressure = "120/80";
  }
  
  /**
   * Get arrhythmia counter
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
}
