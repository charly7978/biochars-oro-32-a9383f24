
/**
 * Base class for all specialized vital sign processors
 */

import { VitalSignType } from '../../../types/signal';

export interface ProcessorFeedback {
  quality: number;
  calibrationStatus: string;
  lastUpdated: number;
}

export abstract class BaseVitalSignProcessor<T> {
  protected confidence: number = 0.5;
  protected vitalsType: VitalSignType;
  
  constructor(vitalsType: VitalSignType) {
    this.vitalsType = vitalsType;
  }
  
  /**
   * Process a value from the signal distributor
   */
  public processValue(value: number): T {
    if (Math.abs(value) < 0.01) {
      this.confidence *= 0.9; // Decrease confidence for weak signals
      return this.getEmptyResult();
    }
    
    // Update confidence based on signal strength
    this.confidence = Math.min(0.95, Math.max(0.1, this.confidence + (Math.abs(value) / 10)));
    
    return this.processValueImpl(value);
  }
  
  /**
   * Get confidence level in the result
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Reset processor state
   */
  public reset(): void {
    this.confidence = 0.5;
  }
  
  /**
   * Get diagnostic information
   */
  public getDiagnostics(): any {
    return {
      confidence: this.confidence,
      vitalsType: this.vitalsType
    };
  }
  
  /**
   * Get feedback information
   */
  public getFeedback(): ProcessorFeedback {
    return {
      quality: this.confidence * 100,
      calibrationStatus: this.confidence > 0.7 ? 'calibrated' : 'uncalibrated',
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Implementation-specific processing logic
   */
  protected abstract processValueImpl(value: number): T;
  
  /**
   * Get empty result for invalid signals
   */
  protected abstract getEmptyResult(): T;
}
