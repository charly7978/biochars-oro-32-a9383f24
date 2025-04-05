
/**
 * Base class for all specialized vital sign processors
 * Provides common functionality for all processors
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base class for specialized vital sign processors
 */
export abstract class BaseVitalSignProcessor<T> {
  protected readonly id: string;
  protected confidence: number = 0;
  protected lastProcessedValue: number = 0;
  protected buffer: number[] = [];
  protected readonly MAX_BUFFER_SIZE: number = 300;
  
  constructor() {
    this.id = uuidv4();
    this.reset();
  }
  
  /**
   * Process a value and return the result
   * @param value Value to process
   * @returns Processed result
   */
  public abstract processValue(value: number): T;
  
  /**
   * Reset the processor state
   */
  public abstract reset(): void;
  
  /**
   * Get the processor's unique ID
   * @returns Processor ID
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Get the current confidence level
   * @returns Confidence value (0-1)
   */
  public getConfidence(): number {
    return this.confidence;
  }
  
  /**
   * Get the last processed value
   * @returns Last processed value
   */
  public getLastProcessedValue(): number {
    return this.lastProcessedValue;
  }
  
  /**
   * Check if the buffer has enough data
   * @param minSize Minimum size required
   * @returns Boolean indicating if buffer has enough data
   */
  protected hasEnoughData(minSize: number = 10): boolean {
    return this.buffer.length >= minSize;
  }
  
  /**
   * Add a value to the buffer
   * @param value Value to add
   */
  protected addToBuffer(value: number): void {
    this.buffer.push(value);
    this.lastProcessedValue = value;
    
    // Maintain buffer size
    if (this.buffer.length > this.MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }
  
  /**
   * Calculate mean of values in buffer
   * @returns Mean value
   */
  protected calculateMean(): number {
    if (this.buffer.length === 0) return 0;
    return this.buffer.reduce((sum, val) => sum + val, 0) / this.buffer.length;
  }
  
  /**
   * Clear the buffer
   */
  protected clearBuffer(): void {
    this.buffer = [];
  }
}
