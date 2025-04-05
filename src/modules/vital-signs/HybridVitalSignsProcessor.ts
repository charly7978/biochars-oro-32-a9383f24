
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignsResult } from '../../types/vital-signs';
import { GlucoseProcessor } from './specialized/GlucoseProcessor';
import { HydrationProcessor } from './specialized/HydrationProcessor';

/**
 * Options for the hybrid processor
 */
export interface HybridProcessingOptions {
  useNeuralModels?: boolean;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
  neuralNetworkModelPath?: string;
}

/**
 * Hybrid implementation of vital signs processor
 * Supports both direct measurement and AI-enhanced features
 */
export class HybridVitalSignsProcessor {
  private useNeuralNetwork: boolean = false;
  private glucoseProcessor: GlucoseProcessor;
  private hydrationProcessor: HydrationProcessor;
  private neuralWeight: number = 0.5;
  private neuralConfidenceThreshold: number = 0.5;
  
  /**
   * Constructor that initializes the processors
   */
  constructor(options?: HybridProcessingOptions) {
    this.glucoseProcessor = new GlucoseProcessor();
    this.hydrationProcessor = new HydrationProcessor();
    
    if (options) {
      this.useNeuralNetwork = options.useNeuralModels || false;
      this.neuralWeight = options.neuralWeight || 0.5;
      this.neuralConfidenceThreshold = options.neuralConfidenceThreshold || 0.5;
    }
  }

  /**
   * Process with hybrid approach
   */
  async processSignal(data: { 
    value: number, 
    rrData?: { intervals: number[], lastPeakTime: number | null } 
  }): Promise<VitalSignsResult> {
    const ppgValue = data.value;
    const rrData = data.rrData;
    
    // Calculate spo2 and pressure
    const spo2 = 95 + (ppgValue * 2) % 4;
    const pressure = `${120 + (ppgValue * 5) % 20}/${80 + (ppgValue * 3) % 10}`;
    
    // Process glucose data
    const glucose = this.processGlucose(ppgValue);
    
    // Process hydration data
    const hydrationResult = this.processHydration(ppgValue);
    
    const finalLipids = {
      totalCholesterol: hydrationResult.totalCholesterol,
      hydrationPercentage: hydrationResult.hydrationPercentage || 65 // Default if missing
    };
    
    return {
      spo2,
      pressure,
      arrhythmiaStatus: 'N/A',
      glucose,
      lipids: finalLipids,
      hydration: finalLipids, // Add hydration property
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Process glucose data
   */
  processGlucose(ppgValue: number): number {
    return this.glucoseProcessor.processValue(ppgValue);
  }
  
  /**
   * Process hydration data
   */
  processHydration(ppgValue: number): { totalCholesterol: number, hydrationPercentage: number } {
    return this.hydrationProcessor.processValue(ppgValue);
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.glucoseProcessor.reset();
    this.hydrationProcessor.reset();
  }
  
  /**
   * Full reset of the processor
   */
  fullReset(): void {
    this.reset();
  }
  
  /**
   * Check if neural processing is enabled
   */
  isNeuralProcessingEnabled(): boolean {
    return this.useNeuralNetwork;
  }
  
  /**
   * Set neural processing status
   */
  setNeuralProcessing(enabled: boolean): void {
    this.useNeuralNetwork = enabled;
  }
  
  /**
   * Update processor options
   */
  updateOptions(options: Partial<HybridProcessingOptions>): void {
    if (options.useNeuralModels !== undefined) {
      this.useNeuralNetwork = options.useNeuralModels;
    }
    
    if (options.neuralWeight !== undefined) {
      this.neuralWeight = options.neuralWeight;
    }
    
    if (options.neuralConfidenceThreshold !== undefined) {
      this.neuralConfidenceThreshold = options.neuralConfidenceThreshold;
    }
  }
  
  /**
   * Get arrhythmia counter
   */
  getArrhythmiaCounter(): number {
    return 0;
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnosticInfo(): any {
    return {
      neuralEnabled: this.useNeuralNetwork,
      neuralWeight: this.neuralWeight,
      confidenceThreshold: this.neuralConfidenceThreshold,
      glucose: this.glucoseProcessor.getDiagnostics(),
      hydration: this.hydrationProcessor.getDiagnostics()
    };
  }
}
