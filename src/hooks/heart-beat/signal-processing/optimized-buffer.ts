
/**
 * Optimized circular buffer implementation for signal processing
 */

/**
 * Generic circular buffer with efficient memory usage
 */
export class OptimizedBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
  }

  /**
   * Add item to buffer
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get item at index
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }
    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get all items as array
   */
  toArray(): T[] {
    const result = new Array<T>(this.size);
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity;
      result[i] = this.buffer[index];
    }
    return result;
  }

  /**
   * Get buffer length
   */
  get length(): number {
    return this.size;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  /**
   * Get the last N items
   */
  getLastN(n: number): T[] {
    const count = Math.min(n, this.size);
    const result = new Array<T>(count);
    for (let i = 0; i < count; i++) {
      const index = (this.tail - count + i + this.capacity) % this.capacity;
      result[i] = this.buffer[index];
    }
    return result;
  }
}

/**
 * Specialized buffer for signal data with timestamp
 */
export interface TimeseriesDataPoint {
  timestamp: number;
  value: number;
}

export class SignalBuffer extends OptimizedBuffer<TimeseriesDataPoint> {
  /**
   * Get values from specific time range
   */
  getValuesInRange(startTime: number, endTime: number): TimeseriesDataPoint[] {
    return this.toArray().filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    );
  }
}
