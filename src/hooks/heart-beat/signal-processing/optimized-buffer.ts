
/**
 * Optimized buffer for PPG data with improved type handling and error recovery
 */
import { TimestampedPPGData, PPGDataPoint } from '../../../types/vital-signs';
import { getErrorHandler, getDiagnostics } from './safe-buffer';

// Error handler for recovery
const errorHandler = getErrorHandler();
const diagnostics = getDiagnostics();

/**
 * Create a new buffer for PPG data with specified capacity
 * @param capacity Maximum number of data points to store
 */
export function createBuffer<T extends TimestampedPPGData>(capacity: number = 100) {
  let buffer: T[] = [];
  
  /**
   * Add a data point to the buffer
   */
  function add(dataPoint: T): void {
    try {
      buffer.push(dataPoint);
      
      // Remove oldest item if buffer exceeds capacity
      if (buffer.length > capacity) {
        buffer.shift();
      }
      
      // Register as good value for error recovery
      errorHandler.registerGoodValue('buffer', dataPoint);
    } catch (error) {
      console.error('Error adding data to buffer:', error);
      diagnostics.recordDiagnosticInfo({
        validationPassed: false,
        component: 'buffer',
        operation: 'add',
        error: String(error)
      });
    }
  }
  
  /**
   * Get all data points in the buffer
   */
  function getAll(): T[] {
    return [...buffer];
  }
  
  /**
   * Get the most recent n points from the buffer
   */
  function getRecent(count: number): T[] {
    return buffer.slice(Math.max(0, buffer.length - count));
  }
  
  /**
   * Reset the buffer
   */
  function reset(): void {
    buffer = [];
  }
  
  /**
   * Map buffer values with conversion to different type
   */
  function mapBuffer<U extends PPGDataPoint>(mapper: (item: T, index: number) => U): U[] {
    try {
      return buffer.map((item, index) => {
        // Fix TS2352: Use unknown as intermediate type for safe conversion
        const result = mapper(item, index);
        // Ensure the required time property exists
        if (result.time === undefined) {
          result.time = result.timestamp;
        }
        return result;
      });
    } catch (error) {
      const recovery = errorHandler.handleError(error as Error, 'bufferMap');
      return recovery.fallbackValue || [];
    }
  }
  
  /**
   * Map and filter buffer values
   */
  function mapFilterBuffer<T extends TimestampedPPGData>(
    mapper: (item: T, index: number) => any,
    filter: (item: any, index: number) => boolean
  ): any[] {
    try {
      return buffer
        .map((item, index) => {
          // Use unknown as intermediate type for safe conversion
          const itemAny = item as unknown as T;
          
          // Ensure the timestamp and time properties
          if (!itemAny.timestamp && itemAny.time !== undefined) {
            (itemAny as any).timestamp = itemAny.time;
          }
          if (itemAny.time === undefined && itemAny.timestamp) {
            (itemAny as any).time = itemAny.timestamp;
          }
          return mapper(itemAny, index);
        })
        .filter(filter);
    } catch (error) {
      const recovery = errorHandler.handleError(error as Error, 'bufferMapFilter');
      return recovery.fallbackValue || [];
    }
  }
  
  return {
    add,
    getAll,
    getRecent,
    reset,
    mapBuffer,
    mapFilterBuffer,
    getCapacity: () => capacity
  };
}

/**
 * Calculate average value from buffer
 */
export function calculateAverage<T extends TimestampedPPGData>(
  buffer: T[],
  valueAccessor: (item: T) => number = (item) => item.value
): number {
  if (buffer.length === 0) return 0;
  
  const sum = buffer.reduce((acc, item) => acc + valueAccessor(item), 0);
  return sum / buffer.length;
}

/**
 * Calculate buffer statistics
 */
export function calculateStatistics<T extends TimestampedPPGData>(
  buffer: T[],
  valueAccessor: (item: T) => number = (item) => item.value
): {
  min: number;
  max: number;
  avg: number;
  std: number;
} {
  if (buffer.length === 0) {
    return { min: 0, max: 0, avg: 0, std: 0 };
  }
  
  const values = buffer.map(valueAccessor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const sqDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / sqDiffs.length;
  const std = Math.sqrt(avgSqDiff);
  
  return { min, max, avg, std };
}

/**
 * Export buffering utilities
 */
export const bufferUtils = {
  createBuffer,
  calculateAverage,
  calculateStatistics
};
