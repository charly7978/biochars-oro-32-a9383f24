/**
 * Optimized circular buffer implementation for signal processing
 * With advanced diagnostics capabilities
 */

export interface BufferDiagnostics {
  size: number;
  capacity: number;
  isEmpty: boolean;
  isFull: boolean;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
  latestItemAge?: number;
  averageLatency?: number;
  maxLatency?: number;
  droppedItems?: number;
  processingTime?: number;
}

export class OptimizedBuffer<T> {
  private buffer: Array<T>;
  private capacity: number;
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private trackDiagnostics: boolean;
  
  // Diagnostics data
  private droppedItems: number = 0;
  private recentLatencies: number[] = [];
  private processingTimes: number[] = [];
  
  /**
   * Create a new optimized buffer
   */
  constructor(capacity: number, trackDiagnostics: boolean = false) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array<T>(this.capacity);
    this.trackDiagnostics = trackDiagnostics;
  }
  
  /**
   * Add an item to the buffer
   */
  public add(item: T): void {
    if (this.isFull()) {
      // Buffer is full, overwrite oldest item
      this.head = (this.head + 1) % this.capacity;
      this.droppedItems++;
    } else {
      // Buffer has space
      this.size++;
    }
    
    // Add new item
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    // Track diagnostics if enabled
    if (this.trackDiagnostics) {
      const now = Date.now();
      
      // Check if item has timestamp
      if (item && typeof item === 'object' && 'timestamp' in item) {
        const timestamp = (item as any).timestamp;
        if (typeof timestamp === 'number') {
          this.recentLatencies.push(now - timestamp);
          
          // Keep only recent latencies
          if (this.recentLatencies.length > 100) {
            this.recentLatencies.shift();
          }
        }
      }
    }
  }
  
  /**
   * Add many items to the buffer
   */
  public addMany(items: Array<any>): void {
    // Fast path for empty array
    if (items.length === 0) return;
    
    // Fast path for single item
    if (items.length === 1) {
      this.add(items[0]);
      return;
    }
    
    // Handle multiple items
    if (items.length >= this.capacity) {
      // If more items than capacity, just take the most recent ones
      const startIdx = items.length - this.capacity;
      for (let i = 0; i < this.capacity; i++) {
        this.buffer[i] = items[startIdx + i];
      }
      this.head = 0;
      this.tail = 0;
      this.size = this.capacity;
      this.droppedItems += items.length - this.capacity;
    } else {
      // Add items one by one
      for (let i = 0; i < items.length; i++) {
        this.add(items[i]);
      }
    }
    
    // Update stats for diagnostics
    if (this.trackDiagnostics && items.length > 0) {
      // Ensure all items have a timestamp, or use current time
      const now = Date.now();
      
      const itemsWithTime = items.map(item => {
        // Check if item is an object with timestamp
        if (item && typeof item === 'object' && 'timestamp' in item) {
          return item;
        }
        
        // Otherwise, use a number or create an object with current time
        return typeof item === 'number' 
          ? { value: item, timestamp: now }
          : { ...item, timestamp: now };
      });
      
      // Calculate latencies
      this.recentLatencies = itemsWithTime.map(item => {
        return now - item.timestamp;
      });
      
      // Keep only recent latencies
      if (this.recentLatencies.length > 100) {
        this.recentLatencies = this.recentLatencies.slice(-100);
      }
    }
  }
  
  /**
   * Get all items in the buffer as an array
   */
  public getAll(): Array<T> {
    if (this.isEmpty()) {
      return [];
    }
    
    const result = new Array<T>(this.size);
    let idx = 0;
    
    // Start from head and go to tail
    let current = this.head;
    while (current !== this.tail) {
      result[idx++] = this.buffer[current];
      current = (current + 1) % this.capacity;
    }
    
    return result;
  }
  
  /**
   * Get the last n items from the buffer
   */
  public getLast(n: number): Array<T> {
    if (this.isEmpty() || n <= 0) {
      return [];
    }
    
    const count = Math.min(n, this.size);
    const result = new Array<T>(count);
    
    // Calculate starting position
    let startPos = (this.tail - count + this.capacity) % this.capacity;
    
    // Copy items
    for (let i = 0; i < count; i++) {
      result[i] = this.buffer[(startPos + i) % this.capacity];
    }
    
    return result;
  }
  
  /**
   * Get the item at the specified index
   */
  public get(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }
    
    const bufferIndex = (this.head + index) % this.capacity;
    return this.buffer[bufferIndex];
  }
  
  /**
   * Check if the buffer is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }
  
  /**
   * Check if the buffer is full
   */
  public isFull(): boolean {
    return this.size === this.capacity;
  }
  
  /**
   * Get the current size of the buffer
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
   * Clear the buffer
   */
  public clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.droppedItems = 0;
    this.recentLatencies = [];
    this.processingTimes = [];
  }
  
  /**
   * Get diagnostic data about the buffer
   */
  public getDiagnostics(): BufferDiagnostics {
    // Base diagnostics
    const diagnostics: BufferDiagnostics = {
      size: this.size,
      capacity: this.capacity,
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
    };
    
    // Add detailed performance metrics if available
    if (this.trackDiagnostics && this.buffer.length > 0) {
      const latestItem = this.buffer[this.tail > 0 ? this.tail - 1 : this.capacity - 1];
      const now = Date.now();
      
      // Ensure latestItem has a timestamp property, or use 0
      const timestamp = (latestItem && typeof latestItem === 'object' && 'timestamp' in latestItem)
        ? (latestItem as any).timestamp
        : 0;
      
      diagnostics.latestItemAge = timestamp ? now - timestamp : 0;
      
      // Calculate average and max latency
      if (this.recentLatencies.length > 0) {
        const sum = this.recentLatencies.reduce((a, b) => a + b, 0);
        diagnostics.averageLatency = sum / this.recentLatencies.length;
        diagnostics.maxLatency = Math.max(...this.recentLatencies);
      }
      
      // Calculate average processing time
      if (this.processingTimes.length > 0) {
        const sum = this.processingTimes.reduce((a, b) => a + b, 0);
        diagnostics.processingTime = sum / this.processingTimes.length;
      }
      
      // Calculate min, max, and average values if items are numbers or have value property
      const values: number[] = [];
      for (let i = 0; i < this.size; i++) {
        const item = this.get(i);
        if (typeof item === 'number') {
          values.push(item);
        } else if (item && typeof item === 'object' && 'value' in item) {
          values.push((item as any).value);
        }
      }
      
      if (values.length > 0) {
        diagnostics.minValue = Math.min(...values);
        diagnostics.maxValue = Math.max(...values);
        diagnostics.averageValue = values.reduce((a, b) => a + b, 0) / values.length;
      }
      
      // Add dropped items count
      diagnostics.droppedItems = this.droppedItems;
    }
    
    return diagnostics;
  }
  
  /**
   * Record processing time for diagnostics
   */
  public recordProcessingTime(timeMs: number): void {
    if (this.trackDiagnostics) {
      this.processingTimes.push(timeMs);
      
      // Keep only recent times
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
    }
  }
  
  /**
   * Enable or disable diagnostics tracking
   */
  public setDiagnosticsTracking(enabled: boolean): void {
    this.trackDiagnostics = enabled;
    
    // Clear diagnostics data if disabled
    if (!enabled) {
      this.recentLatencies = [];
      this.processingTimes = [];
    }
  }
}
