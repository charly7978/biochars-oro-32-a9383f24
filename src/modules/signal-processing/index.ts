
/**
 * Signal processing module exports
 */

// Export types and interfaces
export type {
  ProcessedPPGSignal,
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  ISignalProcessor
} from './types';

export { ProcessorType } from './types';

// Export processors
export { SignalProcessor } from '../vital-signs/signal-processor';
export { HeartBeatProcessor } from './HeartBeatProcessor';

// Export utility functions
export const resetFingerDetector = () => {
  console.log("Resetting finger detector");
  // Implementation would go here
};

// Export other components
export * from './channels/SpecializedChannel';

