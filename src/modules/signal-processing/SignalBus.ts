/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * SignalBus
 * Centralized communication channel for unidirectional signal flow
 */

// Signal types
export enum SignalType {
  RAW_FRAME = 'RAW_FRAME',
  PROCESSED_FRAME = 'PROCESSED_FRAME',
  PPG_SIGNAL = 'PPG_SIGNAL',
  VALIDATED_SIGNAL = 'VALIDATED_SIGNAL',
  CHANNEL_SIGNAL = 'CHANNEL_SIGNAL',
  VITAL_SIGN = 'VITAL_SIGN',
  DIAGNOSTICS = 'DIAGNOSTICS',
  ERROR = 'ERROR'
}

// Signal priorities
export enum SignalPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// Base signal interface
export interface Signal {
  readonly type: SignalType;
  readonly timestamp: number;
  readonly sourceId: string;
  readonly priority: SignalPriority;
  readonly isValid: boolean;
}

// Raw frame signal
export interface RawFrameSignal extends Signal {
  readonly type: SignalType.RAW_FRAME;
  readonly frameData: ImageData;
  readonly width: number;
  readonly height: number;
  readonly frameId: number;
}

// Processed PPG signal
export interface ProcessedPPGSignal extends Signal {
  readonly type: SignalType.PPG_SIGNAL;
  readonly rawValue: number;
  readonly filteredValue: number;
  readonly amplifiedValue: number;
  readonly quality: number;
  readonly fingerDetected: boolean;
}

// Validated signal (after passing through the OptimizedSignalDistributor)
export interface ValidatedSignal extends Signal {
  readonly type: SignalType.VALIDATED_SIGNAL;
  readonly validationId: string;
  readonly distributorVersion: string;
  readonly rawValue: number;
  readonly filteredValue: number;
  readonly amplifiedValue: number;
  readonly quality: number;
  readonly fingerDetected: boolean;
}

// Signal handler type
export type SignalHandler<T extends Signal = Signal> = (signal: T) => void;

/**
 * SignalBus - Centralized event bus for signal processing
 * Implements a unidirectional data flow pattern
 */
export class SignalBus {
  private static instance: SignalBus;
  private subscribers: Map<SignalType, Set<SignalHandler>> = new Map();
  private typedSubscribers: Map<string, Set<SignalHandler>> = new Map();
  
  private constructor() {
    console.log("SignalBus: Initialized centralized signal communication system");
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): SignalBus {
    if (!SignalBus.instance) {
      SignalBus.instance = new SignalBus();
    }
    return SignalBus.instance;
  }
  
  /**
   * Subscribe to a specific signal type
   */
  public subscribe<T extends Signal>(type: SignalType, handler: SignalHandler<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    
    const handlers = this.subscribers.get(type)!;
    handlers.add(handler as SignalHandler);
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler as SignalHandler);
    };
  }
  
  /**
   * Subscribe to a specific signal type with additional filtering
   */
  public subscribeFiltered<T extends Signal>(
    type: SignalType, 
    filter: (signal: T) => boolean,
    handler: SignalHandler<T>
  ): () => void {
    const filterId = `${type}-${Math.random().toString(36).substring(2, 9)}`;
    
    if (!this.typedSubscribers.has(filterId)) {
      this.typedSubscribers.set(filterId, new Set());
    }
    
    const wrappedHandler: SignalHandler = (signal: Signal) => {
      if (signal.type === type && filter(signal as T)) {
        handler(signal as T);
      }
    };
    
    const handlers = this.typedSubscribers.get(filterId)!;
    handlers.add(wrappedHandler);
    
    // Subscribe to the main type
    const unsubscribeMain = this.subscribe(type, wrappedHandler);
    
    // Return unsubscribe function
    return () => {
      unsubscribeMain();
      handlers.delete(wrappedHandler);
      if (handlers.size === 0) {
        this.typedSubscribers.delete(filterId);
      }
    };
  }
  
  /**
   * Publish a signal to the bus
   * Signals are immutable and cannot be modified once published
   */
  public publish(signal: Signal): void {
    // Ensure timestamp is set if not provided
    const finalSignal = signal.timestamp 
      ? signal 
      : { ...signal, timestamp: Date.now() };
    
    // Get handlers for this signal type
    const handlers = this.subscribers.get(finalSignal.type);
    
    if (handlers) {
      // Make a frozen copy of the signal to ensure immutability
      const immutableSignal = Object.freeze({ ...finalSignal });
      
      // Call all handlers
      handlers.forEach(handler => {
        try {
          handler(immutableSignal);
        } catch (error) {
          console.error(`Error in signal handler for ${finalSignal.type}:`, error);
        }
      });
    }
  }
  
  /**
   * Create a typed signal factory
   */
  public createSignalFactory<T extends Signal>(
    type: SignalType, 
    sourceId: string,
    priority: SignalPriority = SignalPriority.MEDIUM
  ) {
    return (data: Omit<T, 'type' | 'timestamp' | 'sourceId' | 'priority'>) => {
      const signal = {
        type,
        timestamp: Date.now(),
        sourceId,
        priority,
        ...data
      } as T;
      
      this.publish(signal);
      return signal;
    };
  }
  
  /**
   * Clear all subscribers
   */
  public clear(): void {
    this.subscribers.clear();
    this.typedSubscribers.clear();
  }
}

/**
 * Get the global signal bus instance
 */
export function getSignalBus(): SignalBus {
  return SignalBus.getInstance();
}

/**
 * Create a raw frame signal
 */
export function createRawFrameSignal(
  frameData: ImageData,
  frameId: number,
  sourceId: string
): RawFrameSignal {
  return {
    type: SignalType.RAW_FRAME,
    timestamp: Date.now(),
    sourceId,
    priority: SignalPriority.HIGH,
    isValid: true,
    frameData,
    width: frameData.width,
    height: frameData.height,
    frameId
  };
}

/**
 * Create a processed PPG signal
 */
export function createProcessedPPGSignal(
  data: {
    rawValue: number;
    filteredValue: number;
    amplifiedValue: number;
    quality: number;
    fingerDetected: boolean;
  },
  sourceId: string,
  priority: SignalPriority = SignalPriority.MEDIUM
): ProcessedPPGSignal {
  return {
    type: SignalType.PPG_SIGNAL,
    timestamp: Date.now(),
    sourceId,
    priority,
    isValid: data.quality > 20 && data.fingerDetected,
    ...data
  };
}

/**
 * Create a validated signal
 */
export function createValidatedSignal(
  ppgSignal: ProcessedPPGSignal,
  validationId: string
): ValidatedSignal {
  return {
    timestamp: ppgSignal.timestamp,
    sourceId: ppgSignal.sourceId,
    priority: ppgSignal.priority,
    isValid: ppgSignal.isValid,
    type: SignalType.VALIDATED_SIGNAL,
    rawValue: ppgSignal.rawValue,
    filteredValue: ppgSignal.filteredValue,
    amplifiedValue: ppgSignal.amplifiedValue,
    quality: ppgSignal.quality,
    fingerDetected: ppgSignal.fingerDetected,
    validationId,
    distributorVersion: '1.0.0'
  };
}
