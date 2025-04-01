
/**
 * Simplified blood pressure processor without TensorFlow dependencies
 */
import { BloodPressureResult } from './BloodPressureResult';
import { calculateMAP, validateBloodPressure, formatBloodPressure, categorizeBloodPressure } from './BloodPressureUtils';

/**
 * Processes PPG signals to extract blood pressure values
 * using simplified algorithms that don't depend on external models
 */
export class BloodPressureProcessor {
  private lastValidResult: BloodPressureResult | null = null;
  private processingOptions: {
    useEnhancement: boolean;
    confidenceThreshold: number;
    traditionalWeight: number;
  };
  
  constructor(options?: {
    useEnhancement?: boolean;
    confidenceThreshold?: number;
    traditionalWeight?: number;
  }) {
    this.processingOptions = {
      useEnhancement: options?.useEnhancement ?? true,
      confidenceThreshold: options?.confidenceThreshold ?? 0.5,
      traditionalWeight: options?.traditionalWeight ?? 0.4
    };
  }
  
  /**
   * Process a PPG signal to extract blood pressure
   */
  public process(value: number): BloodPressureResult {
    console.log("Processing blood pressure with value:", value);
    
    // Use traditional calculation for blood pressure
    const traditionalResult = this.traditionalCalculation(value);
    
    // Validate the result
    if (validateBloodPressure(traditionalResult.systolic, traditionalResult.diastolic)) {
      // Store valid result
      this.lastValidResult = traditionalResult;
    }
    
    // Return the result (validated or not)
    return traditionalResult;
  }
  
  /**
   * Calculate blood pressure using traditional algorithm
   */
  private traditionalCalculation(value: number): BloodPressureResult {
    // Basic algorithm (simplified for demo)
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    // Apply some variation based on the signal value
    const systolic = Math.round(baseSystolic + value * 10);
    const diastolic = Math.round(baseDiastolic + value * 5);
    const map = calculateMAP(systolic, diastolic);
    
    // Get category
    const category = categorizeBloodPressure(systolic, diastolic);
    
    return {
      systolic,
      diastolic,
      map,
      category,
      confidence: 0.7 // Fixed confidence for traditional method
    };
  }
  
  /**
   * Get the last valid result
   */
  public getLastValidResult(): BloodPressureResult | null {
    return this.lastValidResult;
  }
  
  /**
   * Get the confidence score of the latest measurement
   */
  public getConfidence(): number {
    return this.lastValidResult?.confidence ?? 0;
  }
  
  /**
   * Update processing options
   */
  public updateOptions(options: Partial<typeof this.processingOptions>): void {
    this.processingOptions = { ...this.processingOptions, ...options };
  }

  /**
   * Reset the processor to initial state
   */
  public reset(): void {
    this.lastValidResult = null;
  }
}
