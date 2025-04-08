
/**
 * Thread-safe buffer implementation for signal processing
 */

/**
 * Safe circular buffer for multi-threaded access
 */
export class SafeBuffer<T> {
  private buffer: T[];
  private size: number = 0;
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private readonly capacity: number;
  private locked: boolean = false;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
  }

  /**
   * Safe write to buffer
   */
  push(item: T): boolean {
    if (this.locked) return false;
    
    this.lock();
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.readIndex = (this.readIndex + 1) % this.capacity;
    }
    
    this.unlock();
    return true;
  }

  /**
   * Safe read from buffer
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.size || this.locked) {
      return undefined;
    }
    
    this.lock();
    const actualIndex = (this.readIndex + index) % this.capacity;
    const item = this.buffer[actualIndex];
    this.unlock();
    
    return item;
  }

  /**
   * Safe read all items
   */
  toArray(): T[] {
    if (this.locked) return [];
    
    this.lock();
    const result = new Array<T>(this.size);
    for (let i = 0; i < this.size; i++) {
      const index = (this.readIndex + i) % this.capacity;
      result[i] = this.buffer[index];
    }
    this.unlock();
    
    return result;
  }

  /**
   * Get buffer length safely
   */
  getLength(): number {
    return this.size;
  }

  /**
   * Clear the buffer safely
   */
  clear(): boolean {
    if (this.locked) return false;
    
    this.lock();
    this.readIndex = 0;
    this.writeIndex = 0;
    this.size = 0;
    this.unlock();
    
    return true;
  }
  
  /**
   * Lock the buffer for atomic operations
   */
  private lock(): void {
    this.locked = true;
  }
  
  /**
   * Unlock the buffer after operations
   */
  private unlock(): void {
    this.locked = false;
  }
}

/**
 * Create a new safe buffer
 */
export function createSafeBuffer<T>(capacity: number): SafeBuffer<T> {
  return new SafeBuffer<T>(capacity);
}
