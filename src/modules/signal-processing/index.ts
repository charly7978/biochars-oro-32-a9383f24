
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal processing module
 * Central export for all signal processing utilities
 */

// Export signal distributor
export { OptimizedSignalDistributor } from './OptimizedSignalDistributor';

// Export vital sign types from central location
export { VitalSignType, type ChannelFeedback } from '../../types/vital-sign-types';

// Export specialized channels
export { SpecializedChannel, type OptimizedSignalChannel } from './channels/SpecializedChannel';
export { GlucoseChannel } from './channels/GlucoseChannel';
export { LipidsChannel } from './channels/LipidsChannel';
export { BloodPressureChannel } from './channels/BloodPressureChannel';
export { SpO2Channel } from './channels/SpO2Channel';
export { CardiacChannel } from './channels/CardiacChannel';
export { HydrationChannel } from './channels/HydrationChannel';

// Export utility functions
export { applySMAFilter, amplifySignal } from './utils/filter-utils';

// Export diagnostic and validation utilities
export { createDiagnosticInfo, logDiagnostics, getDiagnostics } from './diagnostics';
export { validateSignalData, validateSampleTiming } from './signal-validator';
export { handleProcessingError, isRecoverableError } from './error-handler';

// Export signal processors for hooks
export { PPGSignalProcessor } from './PPGSignalProcessor';
export { HeartbeatProcessor } from './HeartbeatProcessor';
export { type ProcessedPPGSignal } from './types';
export { type ProcessedHeartbeatSignal } from './types';
export { type SignalProcessingOptions } from './types';

// Export utility for finger detection
export { resetFingerDetector } from './FingerDetector';

// Re-export utility types
export type { SignalDistributorConfig } from '../../types/signal';

// Anti-simulation protection
export { AntiSimulationGuard } from './security/anti-simulation-guard';

// Guardian Shield system
export { 
  GuardianShield, 
  getGuardianShield,
  // New exports for duplication prevention
  CodeDuplicationGuardian,
  registerComponent,
} from '../guardian-shield/index';

// Export initialization function
export { default as initializeGuardianSystems } from '../guardian-shield/initialize-guardian';
