
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE
 * 
 * Circular buffer implementation for efficient signal processing
 */

import { CircularBufferState } from '../types';

/**
 * Efficient circular buffer implementation for signal processing
 */
export class CircularBuffer {
  private buffer: number[];
  private capacity: number;
  private head: number = 0;
  private size: number = 0;
  
  /**
   * Create a new circular buffer with the specified capacity
   */
  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array(this.capacity).fill(0);
  }
  
  /**
   * Add a value to the buffer, overwriting the oldest value if necessary
   */
  public push(value: number): void {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }
  
  /**
   * Get the value at the specified index, where 0 is the oldest value
   */
  public get(index: number): number {
    if (index < 0 || index >= this.size) {
      throw new Error(`Index ${index} out of bounds for CircularBuffer of size ${this.size}`);
    }
    
    const actualIndex = (this.head - this.size + index + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }
  
  /**
   * Get the most recent value in the buffer
   */
  public getLatest(): number {
    if (this.size === 0) {
      throw new Error("CircularBuffer is empty");
    }
    
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
  
  /**
   * Get all values in the buffer as an array, ordered from oldest to newest
   */
  public toArray(): number[] {
    const result = new Array(this.size);
    
    for (let i = 0; i < this.size; i++) {
      result[i] = this.get(i);
    }
    
    return result;
  }
  
  /**
   * Clear the buffer
   */
  public clear(): void {
    this.head = 0;
    this.size = 0;
    this.buffer.fill(0);
  }
  
  /**
   * Get the current size of the buffer (number of elements)
   */
  public getSize(): number {
    return this.size;
  }
  
  /**
   * Get the capacity of the buffer
   */
  public getCapacity(): number {
    return this.capacity;
  }
  
  /**
   * Check if the buffer is full
   */
  public isFull(): boolean {
    return this.size === this.capacity;
  }
  
  /**
   * Check if the buffer is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }
  
  /**
   * Get the current state of the buffer
   */
  public getState(): CircularBufferState {
    return {
      buffer: [...this.buffer],
      capacity: this.capacity,
      head: this.head
    };
  }
  
  /**
   * Restore the buffer from a saved state
   */
  public setState(state: CircularBufferState): void {
    this.buffer = [...state.buffer];
    this.capacity = state.capacity;
    this.head = state.head;
    this.size = this.buffer.filter(v => v !== 0).length;
  }
}
