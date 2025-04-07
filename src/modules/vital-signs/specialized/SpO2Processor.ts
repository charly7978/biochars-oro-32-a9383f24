
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Specialized processor for SpO2 measurement
 * Uses optimized SpO2 signal for oxygen saturation calculation
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';
import { VitalSignType, ChannelFeedback } from '../../../types/signal';
import { CalibrationManager } from '../calibration/CalibrationManager';
import * as tf from '@tensorflow/tfjs';

/**
 * SpO2 processor implementation
 */
export class SpO2Processor extends BaseVitalSignProcessor<number> {
  // Default values for SpO2
  private readonly BASELINE_SPO2 = 97; // percent
  private readonly SpO2_MIN = 90;
  private readonly SpO2_MAX = 100;
  
  // Signal processing values
  private recentValues: number[] = [];
  private readonly HISTORY_SIZE = 10;
  private readonly STABILITY_THRESHOLD = 0.5;
  private calibrationManager: CalibrationManager;
  private isAdaptiveEnabled = true;
  private lastProcessedTime = 0;
  private adaptiveAdjustmentFactor = 1.0;
  
  constructor() {
    super(VitalSignType.SPO2);
    this.calibrationManager = CalibrationManager.getInstance();
    
    // Initialize adaptive parameters
    this.resetAdaptiveParams();
  }
  
  /**
   * Reset adaptive parameters
   */
  private resetAdaptiveParams(): void {
    this.recentValues = [];
    this.adaptiveAdjustmentFactor = 1.0;
    this.lastProcessedTime = 0;
  }
  
  /**
   * Process a value from the SpO2-optimized channel
   * @param value Optimized SpO2 signal value
   * @returns SpO2 value in percent
   */
  protected processValueImpl(value: number): number {
    // Skip processing if the value is too small or confidence too low
    if (Math.abs(value) < 0.01 || this.confidence < 0.2) {
      return 0;
    }
    
    const now = Date.now();
    
    // Add to recent values
    this.recentValues.push(value);
    if (this.recentValues.length > this.HISTORY_SIZE) {
      this.recentValues.shift();
    }
    
    // Periodically update adaptive adjustment factor
    if (now - this.lastProcessedTime > 1000) { // Every second
      this.updateAdaptiveParams();
      this.lastProcessedTime = now;
    }
    
    // Calculate SpO2 value with adaptive adjustment
    const spo2 = this.calculateSpO2(value);
    
    return Math.round(spo2);
  }
  
  /**
   * Update adaptive parameters based on signal characteristics
   */
  private updateAdaptiveParams(): void {
    if (!this.isAdaptiveEnabled || this.recentValues.length < 5) {
      return;
    }
    
    try {
      // Calculate signal statistics
      const mean = this.recentValues.reduce((sum, val) => sum + val, 0) / this.recentValues.length;
      const stdDev = Math.sqrt(
        this.recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.recentValues.length
      );
      
      // Calculate stability factor (lower std dev = more stable signal)
      const stabilityFactor = Math.max(0, Math.min(1, 1 - (stdDev / Math.abs(mean))));
      
      // Update adaptive adjustment based on stability and confidence
      if (stabilityFactor > this.STABILITY_THRESHOLD) {
        // Gradually move adjustment factor toward 1.0 for stable signals
        const adaptationRate = 0.1;
        this.adaptiveAdjustmentFactor = 
          this.adaptiveAdjustmentFactor * (1 - adaptationRate) + 1.0 * adaptationRate;
      } else {
        // For less stable signals, use smaller adjustment
        this.adaptiveAdjustmentFactor = 0.8;
      }
      
      // Apply calibration if available
      if (this.calibrationManager.isSystemCalibrated()) {
        const calibrationFactor = this.calibrationManager.getCalibrationFactors().spo2;
        const calibrationConfidence = this.calibrationManager.getCalibrationConfidence();
        
        // Blend adaptive adjustment with calibration factor
        this.adaptiveAdjustmentFactor = 
          this.adaptiveAdjustmentFactor * (1 - calibrationConfidence) + 
          calibrationFactor * calibrationConfidence;
      }
      
    } catch (err) {
      console.error("SpO2Processor: Error updating adaptive parameters", err);
    }
  }
  
  /**
   * Calculate SpO2 percentage with improved algorithm
   */
  private calculateSpO2(value: number): number {
    // Basic oxygen saturation calculation
    let baseSpO2 = this.BASELINE_SPO2 + (value * 2);
    
    // Apply adaptive adjustment factor
    let adjustedSpO2 = baseSpO2 * this.adaptiveAdjustmentFactor;
    
    // Apply confidence-based blending with baseline
    const confidenceWeight = Math.pow(this.confidence, 2); // Square to emphasize higher confidence
    const blendedSpO2 = 
      adjustedSpO2 * confidenceWeight + 
      this.BASELINE_SPO2 * (1 - confidenceWeight);
    
    // Apply calibration if available
    if (this.calibrationManager.isSystemCalibrated()) {
      adjustedSpO2 = this.calibrationManager.applyCalibration(VitalSignType.SPO2, blendedSpO2);
    } else {
      adjustedSpO2 = blendedSpO2;
    }
    
    // Ensure result is within physiological range
    return Math.min(this.SpO2_MAX, Math.max(this.SpO2_MIN, adjustedSpO2));
  }
  
  /**
   * Reset the processor
   */
  override reset(): void {
    super.reset();
    this.resetAdaptiveParams();
  }
}
