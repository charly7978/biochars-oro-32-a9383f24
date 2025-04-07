
/**
 * Central export for all type definitions
 * Import types from here instead of individual files
 */

// Export vital sign types but with explicit naming to avoid conflicts
import * as VitalSignsTypes from './vital-signs';
export { VitalSignsTypes };

// Export signal types 
export * from './signal';

// Export screen orientation types
export * from './screen-orientation';

// Export the ArrhythmiaProcessingResult from the arrhythmia module
import { ArrhythmiaProcessingResult } from '../modules/vital-signs/arrhythmia/types';
export type { ArrhythmiaProcessingResult };

// Export RRIntervalData from vital-signs
import { RRIntervalData } from './vital-signs';
export type { RRIntervalData };

// Export SignalProcessor from signal-processing
import { SignalProcessor } from '../modules/signal-processing/types';
export type { SignalProcessor };

// Export ArrhythmiaData
import { ArrhythmiaData } from './vital-sign-types';
export type { ArrhythmiaData };
