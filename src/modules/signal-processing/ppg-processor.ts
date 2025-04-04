
/**
 * PPG Signal Processor
 * Process photoplethysmography signals for vital sign measurements
 */
import { 
  ProcessedPPGSignal, 
  SignalProcessor, 
  SignalProcessingOptions,
  SignalValidationResult,
  ProcessingError,
  SignalDiagnosticInfo
} from './types-unified';

import { detectFinger, resetFingerDetector } from './utils/finger-detector';
import { detectQuality } from './utils/quality-detector';
import { processMixedModel } from './utils/mixed-model';
import { createSignalValidator } from './signal-validator';
import { getErrorHandler } from './error-handler';
import { normalizeSignal, smoothSignal } from '../utils/signal-normalizer';

export class PPGSignalProcessor implements SignalProcessor {
  private readonly DEFAULT_CONFIG: SignalProcessingOptions = {
    amplificationFactor: 1.5,
    filterStrength: 0.5,
    qualityThreshold: 0.4,
    fingerDetectionSensitivity: 0.8,
    useAdaptiveControl: true,
    qualityEnhancedByPrediction: true
  };

  private config: SignalProcessingOptions;
  private buffer: number[] = [];
  private readonly BUFFER_SIZE = 50;
  private lastRawValue = 0;
  private lastTimestamp = 0;
  private signalValidator = createSignalValidator();
  private errorHandler = getErrorHandler();
  
  constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    console.log('PPGSignalProcessor initialized with default configuration');
  }
  
  processSignal(value: number): ProcessedPPGSignal {
    try {
      // Validate signal
      if (!this.signalValidator.isValidSignal(value)) {
        throw { 
          code: 'INVALID_SIGNAL', 
          message: 'Invalid PPG signal value', 
          recoverable: true 
        };
      }
      
      const now = Date.now();
      this.lastTimestamp = now;
      this.lastRawValue = value;
      
      // Add to buffer
      this.buffer.push(value);
      if (this.buffer.length > this.BUFFER_SIZE) {
        this.buffer.shift();
      }
      
      // Filter the signal
      const filteredValue = this.applyFiltering(value);
      
      // Normalize between 0 and 1
      const normalizedValue = this.buffer.length > 5 ? 
        this.normalizeValue(filteredValue) : filteredValue;
      
      // Amplify
      const amplifiedValue = normalizedValue * (this.config.amplificationFactor || 1);
      
      // Detect finger presence
      const fingerDetection = detectFinger(filteredValue);
      
      // Detect signal quality
      const qualityDetection = detectQuality(filteredValue);
      
      // Apply mixed model if enabled
      let enhancedValue = amplifiedValue;
      let enhancedQuality = qualityDetection.quality / 100;
      
      if (this.config.qualityEnhancedByPrediction) {
        const modelOutput = processMixedModel(amplifiedValue);
        enhancedValue = this.config.useAdaptiveControl ? 
          modelOutput.filtered : amplifiedValue;
        
        // Enhance quality with prediction confidence
        enhancedQuality = Math.min(1, enhancedQuality * 0.7 + modelOutput.confidence * 0.3);
      }
      
      // Store good value for fallback
      this.errorHandler.storeGoodValue('PPGProcessor', {
        timestamp: now,
        rawValue: value,
        filteredValue,
        normalizedValue,
        amplifiedValue: enhancedValue,
        quality: enhancedQuality,
        fingerDetected: fingerDetection.fingerDetected,
        signalStrength: fingerDetection.signalStrength
      });
      
      return {
        timestamp: now,
        rawValue: value,
        filteredValue,
        normalizedValue,
        amplifiedValue: enhancedValue,
        quality: enhancedQuality,
        fingerDetected: fingerDetection.fingerDetected,
        signalStrength: fingerDetection.signalStrength
      };
    } catch (error: any) {
      // Handle error
      const result = this.errorHandler.handleError({
        code: error.code || 'PROCESSING_ERROR',
        message: error.message || 'Error processing PPG signal',
        timestamp: Date.now(),
        severity: error.severity || 'medium',
        recoverable: error.recoverable !== undefined ? error.recoverable : true,
        component: 'PPGProcessor'
      });
      
      // Return fallback or empty result
      if (result.fallbackValue) {
        return result.fallbackValue;
      }
      
      // Return empty result
      return {
        timestamp: Date.now(),
        rawValue: 0,
        filteredValue: 0,
        normalizedValue: 0,
        amplifiedValue: 0,
        quality: 0,
        fingerDetected: false,
        signalStrength: 0
      };
    }
  }
  
  private applyFiltering(value: number): number {
    if (this.buffer.length < 3) {
      return value;
    }
    
    // Apply simple moving average filter
    const windowSize = 3;
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < windowSize && i < this.buffer.length; i++) {
      sum += this.buffer[this.buffer.length - 1 - i];
      count++;
    }
    
    return sum / count;
  }
  
  private normalizeValue(value: number): number {
    if (this.buffer.length < 3) {
      return value;
    }
    
    const recentValues = this.buffer.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    
    if (max === min) {
      return 0.5;
    }
    
    return (value - min) / (max - min);
  }
  
  configure(options: SignalProcessingOptions): void {
    this.config = { ...this.config, ...options };
    console.log('PPGSignalProcessor configured with new options', this.config);
  }
  
  reset(): void {
    this.buffer = [];
    this.lastRawValue = 0;
    this.lastTimestamp = 0;
    resetFingerDetector();
    console.log('PPGSignalProcessor reset');
  }
  
  // Add these methods to make it compatible with both interfaces
  async initialize(): Promise<void> {
    this.reset();
    console.log('PPGSignalProcessor initialized');
  }
  
  start(): void {
    console.log('PPGSignalProcessor started');
  }
  
  stop(): void {
    console.log('PPGSignalProcessor stopped');
  }
  
  validateSignal(signal: any): SignalValidationResult {
    return this.signalValidator.validate(signal);
  }
  
  getDiagnosticInfo(): SignalDiagnosticInfo {
    return {
      processingStage: 'ppg-processing',
      validationPassed: true,
      timestamp: Date.now(),
      signalQualityMetrics: {
        snr: this.calculateSNR(),
        variance: this.calculateVariance()
      },
      fingerDetectionConfidence: this.getFingerDetectionConfidence()
    };
  }
  
  private calculateSNR(): number {
    if (this.buffer.length < 10) return 0;
    
    // Simple SNR calculation
    const signal = this.buffer.slice(-10);
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    
    if (variance === 0) return 0;
    
    const signalPower = Math.pow(Math.max(...signal) - Math.min(...signal), 2) / 12;
    const noisePower = variance;
    
    return signalPower / noisePower;
  }
  
  private calculateVariance(): number {
    if (this.buffer.length < 5) return 0;
    
    const signal = this.buffer.slice(-5);
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    return signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
  }
  
  private getFingerDetectionConfidence(): number {
    const lastValue = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : 0;
    const fingerDetection = detectFinger(lastValue);
    return fingerDetection.confidence;
  }
}

export function createPPGProcessor(): PPGSignalProcessor {
  return new PPGSignalProcessor();
}
