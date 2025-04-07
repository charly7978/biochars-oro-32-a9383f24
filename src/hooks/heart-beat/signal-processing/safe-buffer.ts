
/**
 * Thread-safe buffer implementation for concurrent signal processing
 */

export class SafeBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  private locked: boolean = false;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  async add(item: T): Promise<void> {
    await this.acquireLock();
    try {
      this.buffer.push(item);
      if (this.buffer.length > this.maxSize) {
        this.buffer.shift();
      }
    } finally {
      this.releaseLock();
    }
  }
  
  async get(): Promise<T[]> {
    await this.acquireLock();
    try {
      return [...this.buffer];
    } finally {
      this.releaseLock();
    }
  }
  
  async clear(): Promise<void> {
    await this.acquireLock();
    try {
      this.buffer = [];
    } finally {
      this.releaseLock();
    }
  }
  
  async size(): Promise<number> {
    await this.acquireLock();
    try {
      return this.buffer.length;
    } finally {
      this.releaseLock();
    }
  }
  
  async isEmpty(): Promise<boolean> {
    await this.acquireLock();
    try {
      return this.buffer.length === 0;
    } finally {
      this.releaseLock();
    }
  }
  
  private async acquireLock(): Promise<void> {
    if (this.locked) {
      await new Promise(resolve => setTimeout(resolve, 5));
      return this.acquireLock();
    }
    this.locked = true;
  }
  
  private releaseLock(): void {
    this.locked = false;
  }
}
