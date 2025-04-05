
/**
 * Central export for vital signs module
 */

// Export the VitalSignsProcessor
export { VitalSignsProcessor } from './VitalSignsProcessor';

// Export type definitions for vital signs
export type { VitalSignsResult, LipidsResult } from './types/vital-signs-result';

// Export the confidence calculator
export { ConfidenceCalculator } from './calculators/confidence-calculator';

// Export the result factory
export { ResultFactory } from './factories/result-factory';

// Export specialized processors
export * from './specialized/BaseVitalSignProcessor';
export * from './specialized/HydrationProcessor';
export * from './signal-processor';

// Export shared utilities
export * from './shared-signal-utils';
