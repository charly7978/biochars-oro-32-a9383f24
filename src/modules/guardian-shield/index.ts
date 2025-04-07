
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * GuardianShield module exports
 */

// Export core types
export * from './types';

// Export core implementation
export { guardianShield } from './guardian-shield';

// Export initialization functions
export { 
  initializeGuardianShield,
  createTypeValidatorRecovery,
  createDuplicationFixRecovery,
  default as bootstrapGuardianShield
} from './initialize-guardian';
