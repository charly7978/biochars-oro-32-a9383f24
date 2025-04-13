
/**
 * A circular buffer for efficient storage of time-series data
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number;
  private maxSize: number;
  private _size: number;
  
  constructor(maxSize: number) {
    this.buffer = new Array(maxSize);
    this.head = 0;
    this.maxSize = maxSize;
    this._size = 0;
  }
  
  /**
   * Add a new item to the buffer
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    
    if (this._size < this.maxSize) {
      this._size++;
    }
  }
  
  /**
   * Get all items in the buffer
   */
  getPoints(): T[] {
    const result: T[] = [];
    
    if (this._size === 0) {
      return result;
    }
    
    // If the buffer isn't full yet, return just the filled portion
    if (this._size < this.maxSize) {
      for (let i = 0; i < this._size; i++) {
        result.push(this.buffer[i]);
      }
      return result;
    }
    
    // If the buffer is full, we need to handle wrapping
    for (let i = 0; i < this.maxSize; i++) {
      const index = (this.head + i) % this.maxSize;
      result.push(this.buffer[index]);
    }
    
    return result;
  }
  
  /**
   * Convert buffer contents to array (alias for getPoints)
   */
  toArray(): T[] {
    return this.getPoints();
  }
  
  /**
   * Get the most recent item
   */
  getLatest(): T | undefined {
    if (this._size === 0) {
      return undefined;
    }
    
    const index = (this.head - 1 + this.maxSize) % this.maxSize;
    return this.buffer[index];
  }
  
  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this._size === 0;
  }
  
  /**
   * Get the size of the buffer
   */
  size(): number {
    return this._size;
  }
  
  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.head = 0;
    this._size = 0;
  }
}

/**
 * Interface for PPG data point with timestamp
 */
export interface PPGDataPoint {
  time: number;
  value: number;
}
