import { useRef } from 'react';

/**
 * Circular buffer for storing and processing signal data
 */
export class CircularDataBuffer<T> {
  private buffer: T[];
  private capacity: number;
  private start: number;
  private end: number;
  private size: number;

  constructor(capacity: number) {
    this.buffer = new Array<T>(capacity);
    this.capacity = capacity;
    this.start = 0;
    this.end = 0;
    this.size = 0;
  }

  /**
   * Adds a new value to the buffer
   */
  public push(value: T): void {
    this.buffer[this.end] = value;
    this.end = (this.end + 1) % this.capacity;

    if (this.size === this.capacity) {
      this.start = (this.start + 1) % this.capacity;
    } else {
      this.size++;
    }
  }

  /**
   * Gets the value at a specific index
   */
  public get(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }

    return this.buffer[(this.start + index) % this.capacity];
  }

  /**
   * Gets the current size of the buffer
   */
  public getSize(): number {
    return this.size;
  }

  /**
   * Checks if the buffer is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Checks if the buffer is full
   */
  public isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Clears the buffer
   */
  public clear(): void {
    this.start = 0;
    this.end = 0;
    this.size = 0;
    this.buffer = new Array<T>(this.capacity);
  }

  /**
   * Returns a copy of the buffer as an array
   */
  public toArray(): T[] {
    const result: T[] = [];
    if (this.isEmpty()) {
      return result;
    }
    
    let i = this.start;
    do {
      result.push(this.buffer[i]);
      i = (i + 1) % this.capacity;
    } while (i !== this.end);
    
    return result;
  }

  /**
   * Returns the most recent value in the buffer
   */
  public getMostRecentValue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    const index = (this.end - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
}

/**
 * Optimized buffer for storing and processing signal data with adaptive thresholding
 */
export function useOptimizedBuffer(capacity: number, initialThreshold: number = 0.1) {
  const bufferRef = useRef<CircularDataBuffer<number>>(new CircularDataBuffer<number>(capacity));
  const thresholdRef = useRef<number>(initialThreshold);
  const lastPeakTimeRef = useRef<number | null>(null);
  const adaptiveFactorRef = useRef<number>(0.05);
  const minPeakIntervalRef = useRef<number>(250);
  const maxThresholdRef = useRef<number>(0.3);
  const minThresholdRef = useRef<number>(0.02);
  
  /**
   * Adds a new value to the buffer and adjusts the threshold
   */
  const push = (value: number) => {
    bufferRef.current.push(value);
    adjustThreshold(value);
  };
  
  /**
   * Adjusts the threshold based on signal characteristics
   */
  const adjustThreshold = (value: number) => {
    const recentValues = bufferRef.current.toArray();
    if (recentValues.length < 5) return;
    
    const maxValue = Math.max(...recentValues);
    const minValue = Math.min(...recentValues);
    const signalRange = maxValue - minValue;
    
    const adaptiveAdjustment = adaptiveFactorRef.current * signalRange;
    let newThreshold = thresholdRef.current + adaptiveAdjustment;
    
    newThreshold = Math.max(minThresholdRef.current, Math.min(maxThresholdRef.current, newThreshold));
    thresholdRef.current = newThreshold;
  };
  
  /**
   * Detects a peak in the buffer
   */
  const detectPeak = (currentTime: number): boolean => {
    const recentValues = bufferRef.current.toArray();
    if (recentValues.length < 3) return false;
    
    const lastIndex = recentValues.length - 1;
    const currentValue = recentValues[lastIndex];
    const previousValue = recentValues[lastIndex - 1];
    const prePreviousValue = recentValues[lastIndex - 2];
    
    const isLocalMaximum = currentValue > previousValue && currentValue > prePreviousValue;
    if (!isLocalMaximum) return false;
    
    if (currentValue < thresholdRef.current) return false;
    
    if (lastPeakTimeRef.current !== null && (currentTime - lastPeakTimeRef.current) < minPeakIntervalRef.current) {
      return false;
    }
    
    lastPeakTimeRef.current = currentTime;
    return true;
  };
  
  /**
   * Gets the current threshold
   */
  const getThreshold = (): number => {
    return thresholdRef.current;
  };
  
  /**
   * Gets the most recent value in the buffer
   */
  const getMostRecentValue = (): number | undefined => {
    return bufferRef.current.getMostRecentValue();
  };
  
  /**
   * Gets the buffer as an array
   */
  const toArray = (): number[] => {
    return bufferRef.current.toArray();
  };
  
  /**
   * Clears the buffer
   */
  const clear = () => {
    bufferRef.current.clear();
    thresholdRef.current = initialThreshold;
    lastPeakTimeRef.current = null;
  };
  
  return {
    push,
    detectPeak,
    getThreshold,
    getMostRecentValue,
    toArray,
    clear,
    lastPeakTimeRef
  };
}
