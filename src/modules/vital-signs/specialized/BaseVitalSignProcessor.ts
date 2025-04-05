
/**
 * Base class for vital sign processors
 */
export abstract class BaseVitalSignProcessor<T> {
  protected scaleFactor: number = 1.0;
  protected offsetFactor: number = 0.0;
  protected processorName: string;
  
  constructor(processorName: string) {
    this.processorName = processorName;
    console.log(`BaseVitalSignProcessor: ${processorName} initialized`);
  }
  
  /**
   * Process a PPG signal value
   */
  abstract processValue(value: number): T;
  
  /**
   * Reset the processor state
   */
  abstract reset(): void;
  
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
}
