
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Optimized circular buffer implementation for signal processing
 * Provides efficient storage and retrieval of time-series data
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';

// Type definitions for buffer entries
export interface BufferEntry {
  value: number;
  timestamp: number;
}

/**
 * Optimized circular buffer for efficient time-series data storage
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
  
  // Error handlers
  private onBufferOverflow?: () => void;
  private onAnomalyDetected?: (entry: BufferEntry, stats: BufferStats) => void;
  
  /**
   * Create a new optimized circular buffer
   */
  constructor(capacity: number, name: string = "DefaultBuffer") {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array<BufferEntry>(this.capacity);
    this.name = name;
    
    logError(`Created OptimizedCircularBuffer: ${name} with capacity ${capacity}`, 
      ErrorLevel.INFO, 
      "OptimizedBuffer"
    );
  }
  
  /**
   * Add a value to the buffer
   */
  public push(value: number): void {
    const timestamp = Date.now();
    this.pushWithTimestamp(value, timestamp);
  }
  
  /**
   * Add a value with a specific timestamp
   */
  public pushWithTimestamp(value: number, timestamp: number): void {
    // Create entry
    const entry: BufferEntry = { value, timestamp };
    
    // Check for anomalies before adding
    if (this.count > 0) {
      const stats = this.getStats();
      const isAnomaly = this.detectAnomaly(entry, stats);
      
      if (isAnomaly && this.onAnomalyDetected) {
        this.onAnomalyDetected(entry, stats);
        
        // Log anomaly detection
        logError(`Anomaly detected in ${this.name}: value=${value}, avg=${stats.average.toFixed(2)}, stddev=${stats.stdDev.toFixed(2)}`,
          ErrorLevel.WARNING,
          "OptimizedBuffer"
        );
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
  }
  
  /**
   * Get all values as array
   */
  public getValues(): number[] {
    const result: number[] = [];
    
    if (this.count === 0) return result;
    
    let current = this.tail;
    for (let i = 0; i < this.count; i++) {
      const entry = this.buffer[current];
      if (entry) {
        result.push(entry.value);
      }
      current = (current + 1) % this.capacity;
    }
    
    return result;
  }
  
  /**
   * Get all entries as array
   */
  public getEntries(): BufferEntry[] {
    const result: BufferEntry[] = [];
    
    if (this.count === 0) return result;
    
    let current = this.tail;
    for (let i = 0; i < this.count; i++) {
      const entry = this.buffer[current];
      if (entry) {
        result.push(entry);
      }
      current = (current + 1) % this.capacity;
    }
    
    return result;
  }
  
  /**
   * Get newest N entries
   */
  public getNewestN(n: number): BufferEntry[] {
    if (this.count === 0 || n <= 0) return [];
    
    const count = Math.min(n, this.count);
    const result: BufferEntry[] = [];
    
    let current = this.head - 1;
    if (current < 0) current = this.capacity - 1;
    
    for (let i = 0; i < count; i++) {
      const entry = this.buffer[current];
      if (entry) {
        result.unshift(entry); // Add to front to maintain chronological order
      }
      current = (current - 1 + this.capacity) % this.capacity;
    }
    
    return result;
  }
  
  /**
   * Get entries within a time window
   */
  public getEntriesInTimeWindow(windowMs: number): BufferEntry[] {
    if (this.count === 0 || windowMs <= 0) return [];
    
    const now = Date.now();
    const threshold = now - windowMs;
    const result: BufferEntry[] = [];
    
    let current = this.tail;
    for (let i = 0; i < this.count; i++) {
      const entry = this.buffer[current];
      if (entry && entry.timestamp >= threshold) {
        result.push(entry);
      }
      current = (current + 1) % this.capacity;
    }
    
    return result;
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
    const isAnomaly = zScore > 3.0; // More than 3 standard deviations
    
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

