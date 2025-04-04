
/**
 * Signal Processing Module
 * Central export point for all signal processing utilities
 */

// Export unified types
export * from './types-unified';

// Export core processors
export * from './ppg-processor';

// Export utilities
export * from '../utils/signal-normalizer';
export * from './utils/finger-detector';
export * from './utils/quality-detector';
export * from './utils/mixed-model';

// Export validation and error handling
export * from './signal-validator';
export * from './error-handler';
export * from './diagnostics';

// Export channels
export * from './channels/SpecializedChannel';

// Export specific reset functions
export { resetFingerDetector } from './utils/finger-detector';
export { resetFingerDetectorFunc } from './types-unified';

// Re-export the OptimizedSignalChannel for convenience
export { OptimizedSignalChannel } from './channels/SpecializedChannel';

