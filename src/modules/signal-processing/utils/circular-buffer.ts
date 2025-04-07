
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Circular buffer implementation for efficient data storage
 */

import type { CircularBufferState } from '../types';

/**
 * CircularBuffer class for efficient fixed-size buffer operations
 */
export class CircularBuffer<T> {
  private capacity: number;
  private items: T[];
  private head = 0; // Position to add new items
  private tail = 0; // Position to remove items
  private size = 0; // Current number of items
  
  /**
   * Create a new circular buffer with the specified capacity
   * @param capacity Maximum number of items the buffer can hold
   */
  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.items = new Array<T>(this.capacity);
  }

  /**
   * Add an item to the buffer, overwriting oldest data if full
   */
  push(item: T): void {
    // Store the item at the head position
    this.items[this.head] = item;
    
    // Increment size if not full
    if (this.size < this.capacity) {
      this.size++;
    }
    
    // Move head to next position
    this.head = (this.head + 1) % this.capacity;
    
    // If buffer is full, move tail to next position too
    if (this.size === this.capacity) {
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  /**
   * Remove and return the oldest item in the buffer
   */
  pop(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }
    
    // Get the item at the tail position
    const item = this.items[this.tail];
    
    // Move tail to next position
    this.tail = (this.tail + 1) % this.capacity;
    
    // Decrement size
    this.size--;
    
    return item;
  }

  /**
   * Get the item at the specified index (0 = oldest item)
   */
  at(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }
    
    const actualIndex = (this.tail + index) % this.capacity;
    return this.items[actualIndex];
  }

  /**
   * Get all items in the buffer as an array (oldest to newest)
   */
  toArray(): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this.size; i++) {
      const index = (this.tail + i) % this.capacity;
      result.push(this.items[index]);
    }
    
    return result;
  }

  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  /**
   * Get the current number of items in the buffer
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the maximum capacity of the buffer
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Get the current state of the circular buffer
   */
  getState(): CircularBufferState<T> {
    return {
      capacity: this.capacity,
      items: [...this.items],
      head: this.head,
      tail: this.tail,
      size: this.size
    };
  }

  /**
   * Set the state of the circular buffer
   */
  setState(state: CircularBufferState<T>): void {
    this.capacity = state.capacity;
    this.items = [...state.items];
    this.head = state.head;
    this.tail = state.tail;
    this.size = state.size;
  }
}
