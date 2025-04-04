
/**
 * Optimized buffer implementation for PPG data
 */
import { TimestampedPPGData } from '../../../types/signal';

/**
 * Optimized circular buffer for PPG data storage
 */
export class OptimizedPPGBuffer<T extends TimestampedPPGData = TimestampedPPGData> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
  }
  
  /**
   * Add an item to the buffer
   */
  push(item: T): void {
    if (this.count === this.capacity) {
      // Buffer is full, overwrite oldest item
      this.head = (this.head + 1) % this.capacity;
    } else {
      // Buffer has space
      this.count++;
    }
    
    // Add new item
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
  }
  
  /**
   * Get item at index (0 is oldest, size()-1 is newest)
   */
  get(index: number): T | null {
    if (index < 0 || index >= this.count) {
      return null;
    }
    
    const bufferIndex = (this.head + index) % this.capacity;
    return this.buffer[bufferIndex];
  }
  
  /**
   * Get all points in the buffer
   */
  getPoints(): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.capacity;
      result.push(this.buffer[idx]);
    }
    
    return result;
  }
  
  /**
   * Clear the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
  
  /**
   * Current number of items in the buffer
   */
  size(): number {
    return this.count;
  }
  
  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }
  
  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }
  
  /**
   * Get the buffer capacity
   */
  getCapacity(): number {
    return this.capacity;
  }
  
  /**
   * Get values from the buffer
   */
  getValues(): number[] {
    return this.getPoints().map(point => point.value);
  }
  
  /**
   * Get the last N items in the buffer
   */
  getLastN(n: number): T[] {
    const size = this.size();
    const count = Math.min(n, size);
    const result: T[] = [];
    
    for (let i = size - count; i < size; i++) {
      result.push(this.get(i)!);
    }
    
    return result;
  }
}

/**
 * Adapter to make the optimized buffer compatible with circular buffer interface
 */
export class CircularBufferAdapter<T extends TimestampedPPGData = TimestampedPPGData> {
  private buffer: OptimizedPPGBuffer<T>;
  
  constructor(capacity: number) {
    this.buffer = new OptimizedPPGBuffer<T>(capacity);
  }
  
  push(item: T): void {
    this.buffer.push(item);
  }
  
  get(index: number): T | null {
    return this.buffer.get(index);
  }
  
  getItems(): T[] {
    return this.buffer.getPoints();
  }
  
  clear(): void {
    this.buffer.clear();
  }
  
  size(): number {
    return this.buffer.size();
  }
  
  isEmpty(): boolean {
    return this.buffer.isEmpty();
  }
  
  isFull(): boolean {
    return this.buffer.isFull();
  }
  
  getCapacity(): number {
    return this.buffer.getCapacity();
  }
  
  getValues(): number[] {
    return this.buffer.getValues();
  }
  
  getLastN(n: number): T[] {
    return this.buffer.getLastN(n);
  }
  
  getBuffer(): OptimizedPPGBuffer<T> {
    return this.buffer;
  }
}

/**
 * Create an optimized buffer
 */
export function createOptimizedBuffer<U extends TimestampedPPGData>(capacity: number): OptimizedPPGBuffer<U> {
  return new OptimizedPPGBuffer<U>(capacity);
}

/**
 * Create a circular buffer adapter
 */
export function createCircularBufferAdapter<U extends TimestampedPPGData>(capacity: number): CircularBufferAdapter<U> {
  return new CircularBufferAdapter<U>(capacity);
}
