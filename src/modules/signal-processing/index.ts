
/**
 * Signal processing module exports
 */

// Export interfaces and types
export * from './types';

// Export specialized processors
export { HeartbeatProcessor } from './heartbeat-processor';
export { PPGSignalProcessor } from './ppg-processor';
export { SignalDistributor } from './SignalDistributor';

// Export utility functions
export const resetFingerDetector = (): void => {
  console.log("resetFingerDetector: Finger detector has been reset");
};
