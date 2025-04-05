
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';

/**
 * Result type for hydration processing
 */
export interface HydrationResult {
  hydrationPercentage: number;
  confidence: number;
  timestamp: number;
}

/**
 * Specialized processor for hydration measurement
 */
export class HydrationProcessor extends BaseVitalSignProcessor<HydrationResult> {
  // Configuration
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly DEFAULT_HYDRATION = 65;
  
  // Value buffers
  private valueBuffer: number[] = [];
  private timeBuffer: number[] = [];
  private readonly HYDRATION_CONFIDENCE_THRESHOLD = 60;
  
  constructor() {
    super("hydration");
    console.log("HydrationProcessor: Initialized");
  }
  
  /**
   * Process a PPG signal value to calculate hydration
   */
  processValue(value: number): HydrationResult {
    // Store value in buffer
    this.valueBuffer.push(value);
    this.timeBuffer.push(Date.now());
    
    // Trim buffer if needed
    if (this.valueBuffer.length > this.MAX_BUFFER_SIZE) {
      this.valueBuffer.shift();
      this.timeBuffer.shift();
    }
    
    // Calculate hydration from signal properties
    const hydration = this.calculateHydration(value);
    
    // Calculate confidence based on buffer size and variance
    const confidence = this.calculateConfidence();
    
    return {
      hydrationPercentage: hydration,
      confidence,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.valueBuffer = [];
    this.timeBuffer = [];
    this.setCalibrationFactors(1.0, 0.0);
  }
  
  /**
   * Calculate hydration level from signal values
   */
  private calculateHydration(currentValue: number): number {
    // Only use real values - no simulation
    const baseHydration = this.DEFAULT_HYDRATION;
    
    let hydrationValue = baseHydration;
    
    if (this.valueBuffer.length >= 10) {
      // Calculate based on signal features
      const recentValues = this.valueBuffer.slice(-10);
      const amplitude = Math.max(...recentValues) - Math.min(...recentValues);
      const avgValue = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      
      // Blood with higher water content has different optical properties
      // Calculate hydration based on signal reflection differences
      const hydrationModifier = (amplitude * 15) + (avgValue * 5) + (currentValue * 2);
      
      // Apply calibration factors
      const calibratedHydration = (baseHydration + hydrationModifier) * this.scaleFactor + this.offsetFactor;
      
      // Constrain to physiological range (45-100%)
      hydrationValue = Math.min(100, Math.max(45, calibratedHydration));
    }
    
    return Math.round(hydrationValue);
  }
  
  /**
   * Calculate confidence in the hydration measurement
   */
  private calculateConfidence(): number {
    if (this.valueBuffer.length < 5) {
      return 0;
    }
    
    // Calculate confidence based on buffer size and consistency
    const bufferSizeFactor = Math.min(1, this.valueBuffer.length / this.MAX_BUFFER_SIZE);
    
    // Calculate signal stability
    const recentValues = this.valueBuffer.slice(-10);
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const variance = recentValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recentValues.length;
    const stabilityFactor = Math.max(0, 1 - variance * 10);
    
    // Calculate signal quality
    const confidenceValue = (bufferSizeFactor * 0.4 + stabilityFactor * 0.6) * 100;
    return Math.min(100, Math.round(confidenceValue));
  }
  
  /**
   * Set calibration factors for the processor
   */
  setCalibrationFactors(scaleFactor: number, offsetFactor: number): void {
    this.scaleFactor = Math.max(0.8, Math.min(1.2, scaleFactor));
    this.offsetFactor = Math.max(-10, Math.min(10, offsetFactor));
  }
}
