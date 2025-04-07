
/**
 * Interface definitions for all vital signs processors
 * This file provides standard interfaces that all processor modules must implement
 */
import { VitalSignsResult } from '../types/vital-signs-result';

/**
 * Base processor interface for all vital sign processors
 */
export interface VitalSignProcessor {
  // Process a value and return the relevant measurement
  processValue(value: number, options?: any): any;
  
  // Initialize the processor
  initialize?(): void;
  
  // Reset the processor state
  reset(): void;
  
  // Get confidence level in the measurement (0-1)
  getConfidence?(): number;
  
  // Get feedback for signal optimization
  getFeedback?(): { 
    quality: number;
    suggestedAdjustments?: {
      amplificationFactor?: number;
      filterStrength?: number;
      baselineCorrection?: number;
      frequencyRangeMin?: number;
      frequencyRangeMax?: number;
    }
  };
}

/**
 * Glucose processor interface
 */
export interface GlucoseProcessor extends VitalSignProcessor {
  processValue(value: number): number;
}

/**
 * Blood pressure processor interface
 */
export interface BloodPressureProcessor extends VitalSignProcessor {
  processValue(value: number, rrIntervals?: number[]): string;
}

/**
 * SpO2 processor interface
 */
export interface SpO2Processor extends VitalSignProcessor {
  processValue(value: number): number;
}

/**
 * Arrhythmia processor interface
 */
export interface ArrhythmiaProcessor extends VitalSignProcessor {
  processValue(value: number, rrIntervals?: number[]): {
    arrhythmiaStatus: string;
    lastArrhythmiaData: {
      timestamp: number;
      rmssd?: number;
      rrVariation?: number;
    } | null;
  };
}

/**
 * Hydration processor interface
 */
export interface HydrationProcessor extends VitalSignProcessor {
  processValue(value: number): number;
}

/**
 * Lipids processor interface
 */
export interface LipidsProcessor extends VitalSignProcessor {
  processValue(value: number): {
    totalCholesterol: number;
    triglycerides: number;
  };
}

/**
 * Interface for signal processor that all measurement processors use
 */
export interface SignalProcessor extends VitalSignProcessor {
  processValue(value: number): number;
  getQuality(): number;
}

/**
 * Interface for the VitalSignsProcessor that handles all measurements
 */
export interface VitalSignsProcessorInterface {
  processSignal(params: {
    value: number;
    rrData?: {
      intervals: number[];
      lastPeakTime: number | null;
    };
  }): VitalSignsResult;
  
  reset(): VitalSignsResult;
  fullReset(): void;
  getArrhythmiaCounter(): number;
}
