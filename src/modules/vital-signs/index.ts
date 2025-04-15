
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Central export for vital signs module
 */

// Export the traditional processor
export { VitalSignsProcessor } from './VitalSignsProcessor';
export type { VitalSignsResult } from './types/vital-signs-result';

// Export the hybrid processor
export { HybridVitalSignsProcessor } from './HybridVitalSignsProcessor';

// Export the new modular processor
export { ModularVitalSignsProcessor } from './ModularVitalSignsProcessor';

// Export the new precision processor with advanced features
export { PrecisionVitalSignsProcessor } from './PrecisionVitalSignsProcessor';
export type { PrecisionVitalSignsResult } from './PrecisionVitalSignsProcessor';

// Export types
export type { HybridProcessingOptions, HydrationResult, ProcessorDiagnostics } from './types';

// Export specialized processors
export * from './specialized/BaseVitalSignProcessor';
export * from './specialized/GlucoseProcessor';
export * from './specialized/LipidsProcessor';
export * from './specialized/BloodPressureProcessor';
export * from './specialized/SpO2Processor';
export * from './specialized/CardiacProcessor';
export * from './specialized/HydrationProcessor';

// Export shared signal utils and arrhythmia types
export * from './arrhythmia/types';

// Export specific utility functions
export { 
  calculateAC,
  calculateDC,
  calculateStandardDeviation,
  calculateEMA,
  normalizeValue
} from './utils';

