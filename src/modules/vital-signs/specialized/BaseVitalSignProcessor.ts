
/**
 * Base class for vital sign processors
 */
import { VitalSignProcessorInterface, ProcessorFeedback } from '../types/vital-signs-result';

export abstract class BaseVitalSignProcessor<T> implements VitalSignProcessorInterface<T> {
  protected scaleFactor: number = 1.0;
  protected offsetFactor: number = 0.0;
  protected processorName: string;
  protected confidence: number = 0;
  protected buffer: number[] = [];
  protected readonly MAX_BUFFER_SIZE = 50;
  
  constructor(processorName: string) {
    this.processorName = processorName;
    console.log(`BaseVitalSignProcessor: ${processorName} initialized`);
  }
  
  /**
   * Process a PPG signal value
   */
  processValue(value: number): T {
    // Maintain buffer for all processors
    this.addToBuffer(value);
    
    // Update confidence based on buffer
    this.updateConfidence();
    
    // Delegate actual processing to implementation
    return this.processValueImpl(value);
  }
  
  /**
   * Implementation method that child classes must override
   */
  protected abstract processValueImpl(value: number): T;
  
  /**
   * Reset the processor state
   */
  reset(): void {
    this.buffer = [];
    this.confidence = 0;
    this.scaleFactor = 1.0;
    this.offsetFactor = 0.0;
  }
  
  /**
   * Set calibration factors for the processor
   */
  setCalibrationFactors(scale: number, offset: number): void {
    this.scaleFactor = scale;
    this.offsetFactor = offset;
  }
  
  /**
   * Get processor name
   */
  getProcessorName(): string {
    return this.processorName;
  }
  
  /**
   * Get current confidence level (0-1)
   */
  getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Update confidence based on available data
   */
  protected updateConfidence(): void {
    // Default implementation based on buffer size
    this.confidence = Math.min(this.buffer.length / this.MAX_BUFFER_SIZE, 1);
  }
  
  /**
   * Add a value to the internal buffer
   */
  protected addToBuffer(value: number): void {
    this.buffer.push(value);
    if (this.buffer.length > this.MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }
  
  /**
   * Get diagnostic feedback about processor state
   */
  getFeedback(): ProcessorFeedback {
    const calibrationStatus = this.confidence > 0.7 
      ? 'calibrated'
      : this.confidence > 0.2 
        ? 'calibrating' 
        : 'uncalibrated';
    
    return {
      quality: this.confidence * 100,
      calibrationStatus,
      lastUpdated: Date.now(),
      diagnosticInfo: {
        bufferSize: this.buffer.length,
        processorName: this.processorName,
        scaleFactor: this.scaleFactor,
        offsetFactor: this.offsetFactor
      }
    };
  }
}
