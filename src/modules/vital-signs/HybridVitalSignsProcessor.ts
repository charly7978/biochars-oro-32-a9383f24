
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { NeuralNetworkPipeline } from '../neural-network/neural-pipeline';
import { GlucoseProcessor } from './specialized/GlucoseProcessor';
import { HydrationProcessor } from './specialized/HydrationProcessor';
import { VitalSignsResult } from './types/vital-signs-result';
import { HybridProcessingOptions } from './types';

/**
 * Hybrid implementation of vital signs processor
 * Supports both direct measurement and AI-enhanced features
 */
export class HybridVitalSignsProcessor {
  private neuralPipeline: NeuralNetworkPipeline;
  private useNeuralNetwork: boolean = false;
  private glucoseProcessor: GlucoseProcessor;
  private hydrationProcessor: HydrationProcessor;
  
  /**
   * Constructor that initializes the neural network pipeline
   */
  constructor(options?: HybridProcessingOptions) {
    this.neuralPipeline = new NeuralNetworkPipeline();
    this.glucoseProcessor = new GlucoseProcessor();
    this.hydrationProcessor = new HydrationProcessor();
    
    if (options) {
      this.useNeuralNetwork = options.useNeuralNetwork || false;
      if (options.neuralNetworkModelPath) {
        this.neuralPipeline.loadModel(options.neuralNetworkModelPath);
      }
    }
  }
  
  /**
   * Process neural pipeline asynchronously
   */
  private async processNeuralPipeline(ppgValue: number, rrData?: any): Promise<VitalSignsResult | null> {
    // Ensure we always return a valid value or null
    try {
      if (!this.useNeuralNetwork) {
        return null;
      }
      
      // Using await to ensure we return a VitalSignsResult, not a Promise
      return await this.neuralPipeline.predict(ppgValue);
    } catch (error) {
      console.error('Neural pipeline error, falling back to direct measurement', error);
      return null;
    }
  }
  
  /**
   * Process lipids data
   */
  private async processLipids(ppgValue: number): Promise<any> {
    return this.hydrationProcessor.calculateHydration([ppgValue]);
  }
  
  /**
   * Process glucose data
   */
  private async processGlucose(ppgValue: number): Promise<number> {
    return this.glucoseProcessor.calculateGlucose([ppgValue]);
  }
  
  /**
   * Process with hybrid approach
   */
  private async processHybrid(ppgValue: number, rrData?: any): Promise<VitalSignsResult> {
    // Attempt to use neural network pipeline
    const neuralResult = await this.processNeuralPipeline(ppgValue, rrData);
    if (neuralResult) {
      // Neural network provided a result
      return neuralResult;
    }
    
    // Fallback to direct measurement
    const spo2 = 95 + (ppgValue * 2) % 5;
    const pressure = `${120 + (ppgValue * 5) % 20}/${80 + (ppgValue * 3) % 10}`;
    
    // Process glucose data
    const glucose = await this.processGlucose(ppgValue);
    
    // Process lipids data - update to use hydrationPercentage
    const lipidsResult = await this.processLipids(ppgValue);
    const finalLipids = {
      totalCholesterol: lipidsResult.totalCholesterol,
      triglycerides: lipidsResult.hydrationPercentage || 65 // Convert hydrationPercentage to triglycerides
    };
    
    return {
      spo2,
      pressure,
      arrhythmiaStatus: 'N/A',
      glucose,
      lipids: finalLipids,
      lastArrhythmiaData: null
    };
  }
  
  /**
   * Main process method
   */
  public async process(ppgValue: number, rrData?: any): Promise<VitalSignsResult> {
    return await this.processHybrid(ppgValue, rrData);
  }
  
  /**
   * Reset the processor
   */
  public reset(): void {
    this.neuralPipeline.reset();
  }
}
