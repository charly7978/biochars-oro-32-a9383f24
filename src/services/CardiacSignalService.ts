
/**
 * Cardiac Signal Service
 * Centralized service for detecting and broadcasting cardiac peak events
 */

import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs';
import { getMixedModel } from '../modules/signal-processing/utils/mixed-model';
import { CalibrationManager } from '../modules/vital-signs/calibration/CalibrationManager';
import { 
  applyAdaptiveFilter, 
  correctSignalAnomalies,
  predictNextValue 
} from '../hooks/heart-beat/signal-processing/adaptive-control';

interface PeakEvent {
  time: number;
  value: number;
  isArrhythmia: boolean;
  confidence: number;
  enhancedValue?: number;
}

class CardiacSignalService {
  private static instance: CardiacSignalService;
  private eventEmitter: EventEmitter;
  private lastPeakTime: number = 0;
  private confidenceThreshold: number = 0.4;
  private peakThreshold: number = 3;
  private minPeakDistance: number = 250; // ms
  private isInitialized: boolean = false;
  private recentValues: {time: number, value: number}[] = [];
  private calibrationManager = CalibrationManager.getInstance();
  private mixedModel = getMixedModel();
  private adaptiveThreshold: number = 0;
  
  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(10); // Increase max listeners
    console.log("CardiacSignalService: Initialized singleton instance");
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CardiacSignalService {
    if (!CardiacSignalService.instance) {
      CardiacSignalService.instance = new CardiacSignalService();
    }
    return CardiacSignalService.instance;
  }
  
  /**
   * Initialize the service
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    this.lastPeakTime = 0;
    this.recentValues = [];
    this.adaptiveThreshold = this.peakThreshold;
    
    // Load TensorFlow.js
    tf.ready().then(() => {
      console.log("CardiacSignalService: TensorFlow.js ready");
      console.log(`Backend: ${tf.getBackend()}`);
      
      try {
        // Try to use WebGL if available for better performance
        if (tf.getBackend() !== 'webgl' && tf.ENV.getBool('HAS_WEBGL')) {
          tf.setBackend('webgl').then(() => {
            console.log("CardiacSignalService: Using WebGL backend");
          });
        }
      } catch (err) {
        console.warn("CardiacSignalService: Error setting WebGL backend", err);
      }
    });
    
    this.isInitialized = true;
  }
  
  /**
   * Process a signal value
   * @param value The filtered PPG value 
   * @param quality Signal quality (0-100)
   * @param arrhythmiaData Optional arrhythmia information
   * @returns Whether a peak was detected
   */
  public processSignal(
    value: number, 
    quality: number = 0,
    arrhythmiaData?: { isArrhythmia: boolean }
  ): boolean {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    const now = Date.now();
    
    // Apply adaptive signal processing
    const normalizedQuality = quality / 100;
    const filteredValue = applyAdaptiveFilter(value, now, normalizedQuality);
    
    // Correct any anomalies in the signal
    const { correctedValue, anomalyDetected } = correctSignalAnomalies(
      filteredValue, 
      now, 
      normalizedQuality
    );
    
    // Store the corrected value for analyzing trends
    this.recentValues.push({time: now, value: correctedValue});
    if (this.recentValues.length > 20) {
      this.recentValues.shift();
    }
    
    // Update adaptive threshold based on recent values
    if (this.recentValues.length > 10) {
      const values = this.recentValues.map(v => v.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );
      
      // Adjust threshold based on signal characteristics
      this.adaptiveThreshold = Math.max(
        2.0, // Minimum threshold
        Math.min(
          this.peakThreshold * (1 + 0.5 * (1 - normalizedQuality)), // Base threshold adjusted for quality
          stdDev * 1.5 // Statistical threshold based on signal variance
        )
      );
    }
    
    // Check if this could be a peak
    if (
      Math.abs(correctedValue) > this.adaptiveThreshold && 
      now - this.lastPeakTime > this.minPeakDistance
    ) {
      // Predict next value to validate peak
      const { prediction, confidence } = predictNextValue(now + 50);
      const isPeakLikely = Math.abs(correctedValue) > Math.abs(prediction);
      
      // Calculate confidence factor
      const qualityFactor = normalizedQuality;
      const timingFactor = Math.min(1.0, (now - this.lastPeakTime) / 600);
      const calculatedConfidence = (qualityFactor * 0.7) + (timingFactor * 0.3);
      
      // Enhanced value with calibration applied
      const enhancedValue = this.applyEnhancements(correctedValue, normalizedQuality);
      
      // Peak detection with confidence threshold
      if (isPeakLikely && calculatedConfidence > this.confidenceThreshold) {
        const peakEvent: PeakEvent = {
          time: now,
          value: correctedValue,
          isArrhythmia: arrhythmiaData?.isArrhythmia || false,
          confidence: calculatedConfidence,
          enhancedValue
        };
        
        // Emit the peak event
        this.eventEmitter.emit('peak', peakEvent);
        this.lastPeakTime = now;
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Apply signal enhancements and calibration
   */
  private applyEnhancements(value: number, quality: number): number {
    // Apply calibration if available
    if (this.calibrationManager.isSystemCalibrated()) {
      return this.calibrationManager.applyCalibration('cardiac' as any, value);
    }
    return value;
  }
  
  /**
   * Subscribe to peak events
   * @param callback Function to call when a peak is detected
   * @returns Unsubscribe function
   */
  public onPeak(callback: (event: PeakEvent) => void): () => void {
    this.eventEmitter.on('peak', callback);
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.off('peak', callback);
    };
  }
  
  /**
   * Reset the service
   */
  public reset(): void {
    this.lastPeakTime = 0;
    this.recentValues = [];
    this.adaptiveThreshold = this.peakThreshold;
    console.log("CardiacSignalService: Reset completed");
  }
  
  /**
   * Set signal processing options
   */
  public setOptions(options: {
    confidenceThreshold?: number;
    peakThreshold?: number;
    minPeakDistance?: number;
  }): void {
    if (options.confidenceThreshold !== undefined) {
      this.confidenceThreshold = options.confidenceThreshold;
    }
    
    if (options.peakThreshold !== undefined) {
      this.peakThreshold = options.peakThreshold;
      this.adaptiveThreshold = options.peakThreshold;
    }
    
    if (options.minPeakDistance !== undefined) {
      this.minPeakDistance = options.minPeakDistance;
    }
    
    console.log("CardiacSignalService: Options updated", {
      confidenceThreshold: this.confidenceThreshold,
      peakThreshold: this.peakThreshold,
      minPeakDistance: this.minPeakDistance
    });
  }
}

export default CardiacSignalService;
