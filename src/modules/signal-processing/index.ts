
// Export all signal processing utilities
export * from './types';
export * from './ppg-processor';

export * from './utils/signal-normalizer';
export * from './utils/finger-detector';
export * from './utils/quality-detector';
export * from './utils/mixed-model';

export * from './signal-validator';
export * from './error-handler';
export * from './diagnostics';
export * from './channels/SpecializedChannel';

// Export specific types for external use
export type {
  ProcessedPPGSignal,
  SignalProcessor,
  SignalProcessingOptions
} from './types';

// Re-export from channels
export { OptimizedSignalChannel } from './channels/SpecializedChannel';

// Export the resetFingerDetector function separately to avoid ambiguity
export { resetFingerDetector } from './utils/finger-detector';
export { resetFingerDetector as resetFingerDetectorFunc } from './types';
