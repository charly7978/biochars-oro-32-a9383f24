/**
 * HybridVitalSignsProcessor implementation
 * Combines traditional signal processing with neural networks
 */

import { VitalSignsProcessor } from './VitalSignsProcessor';
import { VitalSignsResult } from './types/vital-signs-result';
import { HybridProcessingOptions } from './index';

/**
 * HybridVitalSignsProcessor class
 * Extends the basic VitalSignsProcessor with neural network capabilities
 */
export class HybridVitalSignsProcessor extends VitalSignsProcessor {
  private neuralEnabled: boolean = false;
  private neuralWeight: number = 0.5;
  private neuralConfidenceThreshold: number = 0.5;
  private options: HybridProcessingOptions;

  constructor(options?: HybridProcessingOptions) {
    super();
    this.options = options || {};
    this.neuralEnabled = options?.useNeuralModels || false;
    this.neuralWeight = options?.neuralWeight || 0.5;
    this.neuralConfidenceThreshold = options?.neuralConfidenceThreshold || 0.5;
    console.log("HybridVitalSignsProcessor initialized with neural:", this.neuralEnabled);
  }

  /**
   * Process signal with hybrid approach (traditional + neural if enabled)
   */
  processSignal(data: { value: number, rrData?: { intervals: number[], lastPeakTime: number | null } }): VitalSignsResult {
    // First get traditional processing result
    const traditionalResult = super.processSignal(data);
    
    // If neural is disabled, return traditional result
    if (!this.neuralEnabled) {
      return traditionalResult;
    }
    
    // Get neural processing result (mocked for now)
    const neuralResult = this.getNeuralPrediction(data.value, traditionalResult);
    
    // Combine results based on configured weight
    return this.combineResults(traditionalResult, neuralResult);
  }

  /**
   * Toggle neural processing
   */
  toggleNeuralProcessing(enabled: boolean): void {
    this.neuralEnabled = enabled;
    console.log(`Neural processing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set neural processing state
   */
  setNeuralProcessing(enabled: boolean): void {
    this.neuralEnabled = enabled;
    console.log(`Neural processing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if neural processing is enabled
   */
  isNeuralProcessingEnabled(): boolean {
    return this.neuralEnabled;
  }

  /**
   * Update processing options
   */
  updateOptions(options: Partial<HybridProcessingOptions>): void {
    if (options.neuralWeight !== undefined) {
      this.neuralWeight = options.neuralWeight;
    }
    if (options.neuralConfidenceThreshold !== undefined) {
      this.neuralConfidenceThreshold = options.neuralConfidenceThreshold;
    }
    if (options.useNeuralModels !== undefined) {
      this.neuralEnabled = options.useNeuralModels;
    }
  }

  /**
   * Get debugging and diagnostics information
   */
  getDiagnosticInfo(): any {
    return {
      neuralEnabled: this.neuralEnabled,
      neuralWeight: this.neuralWeight,
      neuralConfidenceThreshold: this.neuralConfidenceThreshold,
      modelStatus: 'active',
      webgpuEnabled: false,
      backend: 'cpu',
      modelsLoaded: ['base']
    };
  }

  /**
   * Get neural prediction (mocked implementation)
   */
  private getNeuralPrediction(value: number, traditionalResult: VitalSignsResult): VitalSignsResult {
    // This would be replaced with actual neural network inference
    // Just adding variations to the traditional result for demonstration
    return {
      spo2: traditionalResult.spo2 + (Math.random() - 0.5) * 2,
      pressure: traditionalResult.pressure,
      arrhythmiaStatus: traditionalResult.arrhythmiaStatus,
      glucose: traditionalResult.glucose + (Math.random() - 0.5) * 10,
      lipids: {
        totalCholesterol: traditionalResult.lipids.totalCholesterol + (Math.random() - 0.5) * 20,
        hydrationPercentage: traditionalResult.lipids.hydrationPercentage + (Math.random() - 0.5) * 5
      },
      confidence: {
        spo2: Math.min(1, Math.random() * 0.3 + 0.7),
        pressure: Math.min(1, Math.random() * 0.3 + 0.6),
        glucose: Math.min(1, Math.random() * 0.3 + 0.5),
        lipids: Math.min(1, Math.random() * 0.3 + 0.5),
        overall: Math.min(1, Math.random() * 0.3 + 0.6)
      }
    };
  }

  /**
   * Combine traditional and neural results
   */
  private combineResults(traditional: VitalSignsResult, neural: VitalSignsResult): VitalSignsResult {
    // Calculate weights
    const tWeight = 1 - this.neuralWeight;
    const nWeight = this.neuralWeight;
    
    // Weighted combination
    return {
      spo2: Math.round(traditional.spo2 * tWeight + neural.spo2 * nWeight),
      pressure: traditional.pressure, // Use traditional for categorical values
      arrhythmiaStatus: neural.confidence?.overall ? 
        (neural.confidence.overall >= this.neuralConfidenceThreshold ? 
          neural.arrhythmiaStatus : traditional.arrhythmiaStatus) :
        traditional.arrhythmiaStatus,
      glucose: Math.round(traditional.glucose * tWeight + neural.glucose * nWeight),
      lipids: {
        totalCholesterol: Math.round(traditional.lipids.totalCholesterol * tWeight + neural.lipids.totalCholesterol * nWeight),
        hydrationPercentage: Math.round(traditional.lipids.hydrationPercentage * tWeight + neural.lipids.hydrationPercentage * nWeight)
      },
      // Keep confidence values from neural model if available
      confidence: neural.confidence,
      // Keep lastArrhythmiaData from traditional model
      lastArrhythmiaData: traditional.lastArrhythmiaData
    };
  }
}
