
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
