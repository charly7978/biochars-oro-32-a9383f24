
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal processing module
 * Central export for all signal processing utilities
 * Consolidated architecture that maintains all existing functionality
 */

// Export signal distributor
export { OptimizedSignalDistributor } from './OptimizedSignalDistributor';

// Export channel types
export { VitalSignType, type ChannelFeedback } from '../../types/signal';

// Export specialized channels
export { SpecializedChannel } from './channels/SpecializedChannel';
export { GlucoseChannel } from './channels/GlucoseChannel';
export { LipidsChannel } from './channels/LipidsChannel';
export { BloodPressureChannel } from './channels/BloodPressureChannel';
export { SpO2Channel } from './channels/SpO2Channel';
export { CardiacChannel } from './channels/CardiacChannel';

// Export unified processor (new)
export { UnifiedSignalProcessor } from './UnifiedSignalProcessor';

// Export unified vital signs processor (new)
export { UnifiedVitalSignsProcessor } from './UnifiedVitalSignsProcessor';

// Re-export utility types
export type { SignalDistributorConfig } from '../../types/signal';

// Export from unified types
export * from '../../types/signal-processing';
