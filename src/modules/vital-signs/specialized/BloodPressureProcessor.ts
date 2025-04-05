
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Specialized processor for blood pressure measurement
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';
import { VitalSignType } from '../../../types/signal';

/**
 * Result interface for blood pressure measurements
 */
export interface BloodPressureResult {
  systolic: number;
  diastolic: number;
  precision?: number;
}

/**
 * Blood pressure processor implementation
 */
export class BloodPressureProcessor extends BaseVitalSignProcessor<BloodPressureResult> {
  private readonly BASE_SYSTOLIC = 120; // Default systolic (mmHg)
  private readonly BASE_DIASTOLIC = 80; // Default diastolic (mmHg)
  private readonly PRECISION = 0.8; // Confidence in the measurement
  
  constructor() {
    super(VitalSignType.BLOOD_PRESSURE);
  }
  
  /**
   * Process a value from blood pressure optimized channel
   * @param value Optimized BP signal value
   * @returns Estimated blood pressure
   */
  protected processValueImpl(value: number): BloodPressureResult {
    if (Math.abs(value) < 0.01) {
      return this.getEmptyResult();
    }
    
    const systolicAdjustment = value * 20;
    const diastolicAdjustment = value * 10;
    
    const systolic = Math.round(this.BASE_SYSTOLIC + systolicAdjustment);
    const diastolic = Math.round(this.BASE_DIASTOLIC + diastolicAdjustment);
    
    return {
      systolic: Math.min(180, Math.max(90, systolic)),
      diastolic: Math.min(120, Math.max(60, diastolic)),
      precision: this.PRECISION
    };
  }
  
  /**
   * Get an empty result for invalid signals
   */
  public getEmptyResult(): BloodPressureResult {
    return {
      systolic: 0,
      diastolic: 0,
      precision: 0
    };
  }
  
  /**
   * Calculate blood pressure from an array of values
   * @param values Array of signal values
   * @returns Estimated blood pressure
   */
  public calculateBloodPressure(values: number[]): BloodPressureResult {
    if (!values.length) {
      return this.getEmptyResult();
    }
    
    // Calculate average of the last few values
    const recentValues = values.slice(-5);
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    return this.processValue(avg);
  }
  
  /**
   * Get the confidence level in the measurement
   */
  public getConfidence(): number {
    return this.PRECISION;
  }
}
