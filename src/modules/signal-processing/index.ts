
/**
 * Signal Processing Module Exports
 */

export * from './types';
export { OptimizedSignalDistributor } from './OptimizedSignalDistributor';

// Export PPG Signal Processor
export class PPGSignalProcessor {
  constructor() {
    console.log("PPGSignalProcessor created");
  }
  
  processSignal(value: number) {
    return {
      timestamp: Date.now(),
      rawValue: value,
      filteredValue: value,
      normalizedValue: value,
      amplifiedValue: value * 1.5,
      quality: 0.8,
      fingerDetected: true,
      signalStrength: 0.7
    };
  }
  
  reset() {
    console.log("PPGSignalProcessor reset");
  }
  
  configure(options: any) {
    console.log("PPGSignalProcessor configured", options);
  }
}

// Export Heartbeat Processor
export class HeartbeatProcessor {
  constructor() {
    console.log("HeartbeatProcessor created");
  }
  
  processSignal(value: number) {
    return {
      isPeak: Math.random() > 0.8,
      peakConfidence: 0.9,
      instantaneousBPM: 72,
      rrInterval: 833,
      heartRateVariability: 25
    };
  }
  
  reset() {
    console.log("HeartbeatProcessor reset");
  }
  
  configure(options: any) {
    console.log("HeartbeatProcessor configured", options);
  }
}
