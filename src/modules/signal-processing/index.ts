
/**
 * Signal processing module exports
 * Provides a central access point to all signal processing functionality
 */

// Export types
export * from './types';

// Export signal processor implementations
export { PPGProcessor } from './ppg-processor';

// Export specialized channels
export {
  OptimizedSignalChannel,
  SpecializedChannel
} from './channels/SpecializedChannel';

// Export vital sign types for usage across the application
export { VitalSignType } from './types';

// For backward compatibility with existing code
import { PPGProcessor } from './ppg-processor';
import { GuardianShield } from '../guardian-shield/GuardianShield';

// Initialize guardian
const guardian = GuardianShield.getInstance();

// Export legacy types and functions that might be used elsewhere
export const resetFingerDetector = () => {
  console.log('Reset finger detector called');
  return true;
};

// Export HeartbeatProcessor for backward compatibility
export class HeartbeatProcessor {
  private amplificationFactor: number = 1.2;
  private filterStrength: number = 0.2;
  
  public processSignal(value: number) {
    return {
      isPeak: false,
      peakConfidence: 0,
      instantaneousBPM: null,
      rrInterval: null,
      heartRateVariability: null
    };
  }
  
  public reset() {
    console.log("HeartbeatProcessor reset");
  }
  
  public configure(options: any) {
    if (options.amplificationFactor) {
      this.amplificationFactor = options.amplificationFactor;
    }
    
    if (options.filterStrength) {
      this.filterStrength = options.filterStrength;
    }
  }
}

// Namespace for SignalBus
export namespace SignalBus {
  export enum SignalType {
    PPG_SIGNAL = 'PPG_SIGNAL',
    VALIDATED_SIGNAL = 'VALIDATED_SIGNAL',
    HEARTBEAT_SIGNAL = 'HEARTBEAT_SIGNAL'
  }
  
  export type SignalPriority = 'HIGH' | 'MEDIUM' | 'LOW';
  
  export interface ValidatedSignal {
    timestamp: number;
    rawValue: number;
    filteredValue: number;
    quality: number;
    isValid: boolean;
  }
}

// Re-export for compatibility
export const getSignalBus = () => {
  return {
    subscribe: <T>(type: string, callback: (signal: T) => void) => {
      return () => {};  // Return unsubscribe function
    }
  };
};

// Export OptimizedSignalDistributor for compatibility
export class OptimizedSignalDistributor {
  start() {
    console.log("OptimizedSignalDistributor started");
  }
  
  stop() {
    console.log("OptimizedSignalDistributor stopped");
  }
  
  reset() {
    console.log("OptimizedSignalDistributor reset");
  }
}

// Export CameraFrameProcessor factory for compatibility
export const createCameraFrameProcessor = (config: any) => {
  return {
    processImageData: (imageData: ImageData) => {},
    startProcessing: () => {},
    stopProcessing: () => {},
    reset: () => {}
  };
};

// Initialize guardian for signal processing module
console.log("Signal processing module initialized with GuardianShield protection");
