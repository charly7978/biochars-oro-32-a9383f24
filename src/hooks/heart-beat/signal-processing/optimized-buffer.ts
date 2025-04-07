
/**
 * Optimized buffer implementation for signal processing
 */

export class OptimizedBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  add(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  get(): T[] {
    return [...this.buffer];
  }
  
  clear(): void {
    this.buffer = [];
  }
  
  size(): number {
    return this.buffer.length;
  }
  
  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}
