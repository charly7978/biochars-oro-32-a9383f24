/**
 * Hybrid Vital Signs Processor
 * Combines traditional signal processing with neural networks for improved accuracy
 */
import { VitalSignsProcessor } from './VitalSignsProcessor';
import { VitalSignsResult, LipidsResult } from './types/vital-signs-result';
import { HybridProcessingOptions } from './index';
import { SignalProcessor } from '../signal-processing/types';
import { neuralPipeline } from '../ai/neural-pipeline';
import { tensorflowService } from '../ai/tensorflow-service';

interface HybridProcessingData {
  value: number;
  rrData?: { intervals: number[], lastPeakTime: number | null };
}

/**
 * Hybrid processor that combines traditional algorithms with neural networks
 */
export class HybridVitalSignsProcessor {
  private traditionalProcessor: VitalSignsProcessor;
  private useNeural: boolean;
  private neuralWeight: number;
  private neuralConfidenceThreshold: number;
  private signalHistory: number[] = [];
  private lastResults: VitalSignsResult | null = null;
  private readonly MAX_HISTORY_SIZE = 300;
  private readonly MIN_SAMPLES_FOR_NEURAL = 50;
  private webGPUAvailable: boolean = false;
  private adaptiveProcessing: boolean = false;

  constructor(options: HybridProcessingOptions = {}) {
    this.traditionalProcessor = new VitalSignsProcessor();
    this.useNeural = options.useNeuralModels ?? false;
    this.neuralWeight = options.neuralWeight ?? 0.5;
    this.neuralConfidenceThreshold = options.neuralConfidenceThreshold ?? 0.5;
    this.adaptiveProcessing = options.adaptiveProcessing ?? false;
    
    // Check for WebGPU availability
    this.checkWebGPUSupport();
    console.log(`HybridVitalSignsProcessor: Initialized with neural=${this.useNeural}, weight=${this.neuralWeight}`);
  }

  /**
   * Check if WebGPU is supported
   */
  private async checkWebGPUSupport(): Promise<void> {
    try {
      this.webGPUAvailable = tensorflowService.isWebGPUAvailable();
      console.log(`HybridVitalSignsProcessor: WebGPU ${this.webGPUAvailable ? 'is' : 'is not'} available`);
    } catch (e) {
      console.error('Error checking WebGPU support:', e);
      this.webGPUAvailable = false;
    }
  }

  /**
   * Process signal data using both traditional and neural approaches
   */
  public processSignal(data: HybridProcessingData | number): VitalSignsResult {
    // Handle simplified API where only a number is passed
    if (typeof data === 'number') {
      data = { value: data };
    }

    // Add value to history
    this.signalHistory.push(data.value);
    if (this.signalHistory.length > this.MAX_HISTORY_SIZE) {
      this.signalHistory.shift();
    }

    // Always process with traditional algorithm
    const traditionalResult = this.traditionalProcessor.processSignal(data.value, data.rrData);
    
    // If neural processing is disabled or we don't have enough samples, return traditional result
    if (!this.useNeural || this.signalHistory.length < this.MIN_SAMPLES_FOR_NEURAL) {
      this.lastResults = traditionalResult;
      return traditionalResult;
    }
    
    // Process with neural pipeline
    this.processWithNeuralPipeline(data, traditionalResult).catch(err => {
      console.error('Error in neural processing:', err);
    });
    
    // Return the last result (either traditional or hybrid)
    return this.lastResults || traditionalResult;
  }
  
  /**
   * Process with neural pipeline in parallel
   */
  private async processWithNeuralPipeline(
    data: HybridProcessingData,
    traditionalResult: VitalSignsResult
  ): Promise<VitalSignsResult> {
    try {
      // Get a slice of recent values for neural processing
      const recentValues = this.signalHistory.slice(-this.MIN_SAMPLES_FOR_NEURAL);
      
      // Apply SMA filter to smooth the signal
      const signalProcessor = new SignalProcessor();
      const smoothedValues = recentValues.map(value => 
        signalProcessor.applySMAFilter ? signalProcessor.applySMAFilter(value) : value
      );
      
      // Process with neural pipeline
      const neuralResult = await neuralPipeline.process(smoothedValues, {
        useWebGPU: this.webGPUAvailable,
        useDenoising: true
      });
      
      // Check if we should use neural results
      if (neuralResult.confidence.overall < this.neuralConfidenceThreshold) {
        this.lastResults = traditionalResult;
        return traditionalResult;
      }
      
      // Blend results based on neural weight
      const result = this.blendResults(traditionalResult, neuralResult);
      this.lastResults = result;
      return result;
    } catch (error) {
      console.error('Error processing with neural pipeline:', error);
      this.lastResults = traditionalResult;
      return traditionalResult;
    }
  }
  
  /**
   * Blend traditional and neural results based on confidence
   */
  private blendResults(
    traditionalResult: VitalSignsResult,
    neuralResult: any
  ): VitalSignsResult {
    // Calculate overall weight for neural results
    const neuralWeight = this.neuralWeight * neuralResult.confidence.overall;
    const traditionalWeight = 1 - neuralWeight;
    
    // Create a new result object
    const result: VitalSignsResult = {
      // Blend SpO2
      spo2: neuralResult.spo2 && neuralResult.confidence.spo2 > 0.5
        ? Math.round(neuralResult.spo2 * neuralWeight + traditionalResult.spo2 * traditionalWeight)
        : traditionalResult.spo2,
        
      // Use traditional string format for blood pressure
      pressure: neuralResult.bloodPressure && neuralResult.confidence.bloodPressure > 0.5
        ? `${Math.round(neuralResult.bloodPressure.systolic)}/${Math.round(neuralResult.bloodPressure.diastolic)}`
        : traditionalResult.pressure,
        
      // Keep arrhythmia status from traditional algorithm
      arrhythmiaStatus: traditionalResult.arrhythmiaStatus,
      
      // Blend glucose
      glucose: neuralResult.glucose && neuralResult.confidence.glucose > 0.5
        ? Math.round(neuralResult.glucose * neuralWeight + traditionalResult.glucose * traditionalWeight)
        : traditionalResult.glucose,
        
      // Create lipids object
      lipids: {
        totalCholesterol: neuralResult.lipids && neuralResult.confidence.lipids > 0.5
          ? Math.round(neuralResult.lipids.totalCholesterol * neuralWeight + 
              traditionalResult.lipids.totalCholesterol * traditionalWeight)
          : traditionalResult.lipids.totalCholesterol,
          
        hydrationPercentage: neuralResult.lipids && neuralResult.confidence.lipids > 0.5
          ? Math.round(neuralResult.lipids.triglycerides * neuralWeight + 
              traditionalResult.lipids.hydrationPercentage * traditionalWeight)
          : traditionalResult.lipids.hydrationPercentage
      },
      
      // Add confidence information
      confidence: neuralResult.confidence
    };
    
    return result;
  }
  
  /**
   * Toggle neural processing
   */
  public toggleNeuralProcessing(enabled: boolean): void {
    this.useNeural = enabled;
    console.log(`HybridVitalSignsProcessor: Neural processing ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Update processor options
   */
  public updateOptions(newOptions: Partial<HybridProcessingOptions>): void {
    if (newOptions.neuralWeight !== undefined) {
      this.neuralWeight = newOptions.neuralWeight;
    }
    
    if (newOptions.neuralConfidenceThreshold !== undefined) {
      this.neuralConfidenceThreshold = newOptions.neuralConfidenceThreshold;
    }
    
    if (newOptions.useNeuralModels !== undefined) {
      this.useNeural = newOptions.useNeuralModels;
    }
    
    if (newOptions.adaptiveProcessing !== undefined) {
      this.adaptiveProcessing = newOptions.adaptiveProcessing;
    }
    
    console.log('HybridVitalSignsProcessor: Options updated', {
      neuralWeight: this.neuralWeight,
      neuralConfidenceThreshold: this.neuralConfidenceThreshold,
      useNeural: this.useNeural,
      adaptiveProcessing: this.adaptiveProcessing
    });
  }
  
  /**
   * Get diagnostic information
   */
  public getDiagnosticInfo(): any {
    const tfInfo = tensorflowService.getTensorFlowInfo();
    
    return {
      enabled: this.useNeural,
      weight: this.neuralWeight,
      threshold: this.neuralConfidenceThreshold,
      samplesCollected: this.signalHistory.length,
      webGPUEnabled: tfInfo.webgpuEnabled,
      backend: tfInfo.backend,
      modelsLoaded: tfInfo.modelsLoaded,
      adaptiveProcessing: this.adaptiveProcessing
    };
  }
  
  /**
   * Reset the processor
   */
  public reset(): VitalSignsResult | null {
    const lastValid = this.lastResults;
    this.signalHistory = [];
    this.lastResults = null;
    this.traditionalProcessor.reset();
    return lastValid;
  }
}
