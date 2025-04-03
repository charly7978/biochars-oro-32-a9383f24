
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Optimized circular buffer implementation for signal extraction and processing
 * Provides efficient storage and retrieval of time-series data with error prevention
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';

// Type definitions for buffer entries
export interface BufferEntry {
  value: number;
  timestamp: number;
}

/**
 * Optimized circular buffer for efficient time-series data storage
 * with built-in error prevention and anomaly detection
 */
export class OptimizedCircularBuffer {
  private buffer: BufferEntry[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;
  private readonly name: string;
  
  // Statistics for error detection
  private maxValue: number = -Infinity;
  private minValue: number = Infinity;
  private sum: number = 0;
  private sumSquared: number = 0;
  
  // Error prevention
  private errorCount: number = 0;
  private readonly MAX_ERRORS: number = 10;
  private lastErrorTime: number = 0;
  private readonly ERROR_RESET_INTERVAL: number = 60000; // 1 minute
  
  // Error handlers
  private onBufferOverflow?: () => void;
  private onAnomalyDetected?: (entry: BufferEntry, stats: BufferStats) => void;
  private onErrorThresholdReached?: () => void;
  
  /**
   * Create a new optimized circular buffer with error prevention
   */
  constructor(capacity: number, name: string = "DefaultBuffer") {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array<BufferEntry>(this.capacity);
    this.name = name;
    
    logError(`Created OptimizedCircularBuffer: ${name} with capacity ${capacity} and error prevention`, 
      ErrorLevel.INFO, 
      "OptimizedBuffer"
    );
  }
  
  /**
   * Add a value to the buffer with error prevention
   */
  public push(value: number): boolean {
    const timestamp = Date.now();
    return this.pushWithTimestamp(value, timestamp);
  }
  
  /**
   * Add a value with a specific timestamp with error prevention
   * Returns true if successful, false if value was rejected as anomaly
   */
  public pushWithTimestamp(value: number, timestamp: number): boolean {
    // Create entry
    const entry: BufferEntry = { value, timestamp };
    
    // Basic validation
    if (isNaN(value) || !isFinite(value)) {
      this.registerError(`Invalid value: ${value}`);
      return false;
    }
    
    // Check for extreme values (prevent crashes)
    if (Math.abs(value) > 1e6) {
      this.registerError(`Extreme value detected: ${value}`);
      return false;
    }
    
    // Check for anomalies before adding
    if (this.count > 5) {
      const stats = this.getStats();
      const isAnomaly = this.detectAnomaly(entry, stats);
      
      if (isAnomaly) {
        if (this.onAnomalyDetected) {
          this.onAnomalyDetected(entry, stats);
        }
        
        // Log anomaly detection
        logError(`Anomaly rejected in ${this.name}: value=${value}, avg=${stats.average.toFixed(2)}, stddev=${stats.stdDev.toFixed(2)}`,
          ErrorLevel.WARNING,
          "OptimizedBuffer"
        );
        
        return false;
      }
    }
    
    // Check if buffer is full
    if (this.count === this.capacity) {
      // Remove oldest entry and update statistics
      const oldEntry = this.buffer[this.tail];
      if (oldEntry) {
        this.updateStatsRemove(oldEntry.value);
      }
      
      // Notify about overflow if handler is set
      if (this.onBufferOverflow) {
        this.onBufferOverflow();
      }
      
      // Move tail pointer
      this.tail = (this.tail + 1) % this.capacity;
      this.count--;
    }
    
    // Add new entry
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    this.count++;
    
    // Update statistics
    this.updateStatsAdd(value);
    
    return true;
  }
  
  /**
   * Get all values as array with error prevention
   */
  public getValues(): number[] {
    const result: number[] = [];
    
    if (this.count === 0) return result;
    
    try {
      let current = this.tail;
      for (let i = 0; i < this.count; i++) {
        const entry = this.buffer[current];
        if (entry) {
          result.push(entry.value);
        }
        current = (current + 1) % this.capacity;
      }
    } catch (error) {
      this.registerError(`Error retrieving values: ${error}`);
      return [];
    }
    
    return result;
  }
  
  /**
   * Get all entries as array with error prevention
   */
  public getEntries(): BufferEntry[] {
    const result: BufferEntry[] = [];
    
    if (this.count === 0) return result;
    
    try {
      let current = this.tail;
      for (let i = 0; i < this.count; i++) {
        const entry = this.buffer[current];
        if (entry) {
          result.push({...entry}); // Return copy to prevent external modification
        }
        current = (current + 1) % this.capacity;
      }
    } catch (error) {
      this.registerError(`Error retrieving entries: ${error}`);
      return [];
    }
    
    return result;
  }
  
  /**
   * Get newest N entries with error prevention
   */
  public getNewestN(n: number): BufferEntry[] {
    if (this.count === 0 || n <= 0) return [];
    
    try {
      const count = Math.min(n, this.count);
      const result: BufferEntry[] = [];
      
      let current = this.head - 1;
      if (current < 0) current = this.capacity - 1;
      
      for (let i = 0; i < count; i++) {
        const entry = this.buffer[current];
        if (entry) {
          result.unshift({...entry}); // Add to front to maintain chronological order
        }
        current = (current - 1 + this.capacity) % this.capacity;
      }
      
      return result;
    } catch (error) {
      this.registerError(`Error retrieving newest entries: ${error}`);
      return [];
    }
  }
  
  /**
   * Register an error and handle error threshold
   */
  private registerError(message: string): void {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.ERROR_RESET_INTERVAL) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    // Log the error
    logError(`Buffer error (${this.errorCount}/${this.MAX_ERRORS}) in ${this.name}: ${message}`, 
      ErrorLevel.ERROR, 
      "OptimizedBuffer"
    );
    
    // Check if error threshold reached
    if (this.errorCount >= this.MAX_ERRORS) {
      logError(`Error threshold reached in ${this.name}, taking corrective action`, 
        ErrorLevel.CRITICAL, 
        "OptimizedBuffer"
      );
      
      // Execute error threshold handler if exists
      if (this.onErrorThresholdReached) {
        this.onErrorThresholdReached();
      }
      
      // Reset buffer as a last resort
      this.clear();
    }
  }
  
  /**
   * Set handler for error threshold reached
   */
  public setErrorThresholdHandler(handler: () => void): void {
    this.onErrorThresholdReached = handler;
  }
  
  /**
   * Clear the buffer and reset statistics
   */
  public clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.maxValue = -Infinity;
    this.minValue = Infinity;
    this.sum = 0;
    this.sumSquared = 0;
    this.errorCount = 0;
    
    logError(`Cleared buffer: ${this.name}`, 
      ErrorLevel.INFO, 
      "OptimizedBuffer"
    );
  }
  
  /**
   * Set callback for buffer overflow
   */
  public setOverflowHandler(handler: () => void): void {
    this.onBufferOverflow = handler;
  }
  
  /**
   * Set callback for anomaly detection
   */
  public setAnomalyHandler(handler: (entry: BufferEntry, stats: BufferStats) => void): void {
    this.onAnomalyDetected = handler;
  }
  
  /**
   * Get count of entries in buffer
   */
  public getCount(): number {
    return this.count;
  }
  
  /**
   * Get capacity of buffer
   */
  public getCapacity(): number {
    return this.capacity;
  }
  
  /**
   * Get buffer statistics
   */
  public getStats(): BufferStats {
    if (this.count === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        range: 0,
        average: 0,
        variance: 0,
        stdDev: 0
      };
    }
    
    const average = this.sum / this.count;
    const variance = (this.sumSquared / this.count) - (average * average);
    const stdDev = Math.sqrt(Math.max(0, variance));
    
    return {
      count: this.count,
      min: this.minValue,
      max: this.maxValue,
      range: this.maxValue - this.minValue,
      average,
      variance,
      stdDev
    };
  }
  
  /**
   * Detect anomalies in the data
   */
  private detectAnomaly(entry: BufferEntry, stats: BufferStats): boolean {
    if (this.count < 5) return false; // Need enough data for detection
    
    const { value } = entry;
    const { average, stdDev } = stats;
    
    // Z-score based anomaly detection
    const zScore = Math.abs(value - average) / (stdDev || 1);
    const isAnomaly = zScore > 3.5; // More than 3.5 standard deviations
    
    return isAnomaly;
  }
  
  /**
   * Update statistics when adding a value
   */
  private updateStatsAdd(value: number): void {
    this.maxValue = Math.max(this.maxValue, value);
    this.minValue = Math.min(this.minValue, value);
    this.sum += value;
    this.sumSquared += value * value;
  }
  
  /**
   * Update statistics when removing a value
   */
  private updateStatsRemove(value: number): void {
    this.sum -= value;
    this.sumSquared -= value * value;
    
    // Recalculate min/max if the removed value was min or max
    if (value === this.minValue || value === this.maxValue) {
      this.recalculateMinMax();
    }
  }
  
  /**
   * Recalculate min and max values from buffer
   */
  private recalculateMinMax(): void {
    this.minValue = Infinity;
    this.maxValue = -Infinity;
    
    let current = this.tail;
    for (let i = 0; i < this.count; i++) {
      const entry = this.buffer[current];
      if (entry) {
        this.minValue = Math.min(this.minValue, entry.value);
        this.maxValue = Math.max(this.maxValue, entry.value);
      }
      current = (current + 1) % this.capacity;
    }
    
    // Reset to defaults if buffer is empty
    if (this.count === 0) {
      this.minValue = Infinity;
      this.maxValue = -Infinity;
    }
  }
}

/**
 * Buffer statistics interface
 */
export interface BufferStats {
  count: number;
  min: number;
  max: number;
  range: number;
  average: number;
  variance: number;
  stdDev: number;
}
