
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Guardian Shield Types
 * Core type definitions for the GuardianShield system
 */

/**
 * GuardianShield Report interface
 * Contains diagnostic information about the system's operation
 */
export interface GuardianShieldReport {
  timestamp: number;
  activeSystems: string[];
  signalValidations: {
    total: number;
    issues: number;
    issueRate: number;
  };
  errorRecovery: {
    attempts: number;
    successes: number;
    successRate: number;
  };
  duplicationIssues: {
    detected: number;
    prevented: number;
    detailsByType: Record<string, number>;
  };
}

/**
 * GuardianShield State interface
 * Represents the current state of the GuardianShield system
 */
export interface GuardianShieldState {
  isActive: boolean;
  activeSystems: string[];
  lastReport: GuardianShieldReport | null;
  signalValidationsCount: number;
  errorRecoveryCount: number;
}

/**
 * Duplication Issue interface
 * Represents a detected code duplication issue
 */
export interface DuplicationIssue {
  type: 'component' | 'hook' | 'utility' | 'module' | 'file';
  path: string;
  duplicateOf: string;
  similarity: number;
  detectedAt: number;
}

/**
 * Type Validation Issue interface
 * Represents a detected TypeScript validation issue
 */
export interface TypeValidationIssue {
  path: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  detectedAt: number;
}

/**
 * Recovery Action interface
 * Represents an action that can be taken to recover from an error
 */
export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  targetIssue: string;
  action: () => Promise<boolean>;
  createdAt: number;
}

/**
 * GuardianShield Config interface
 * Configuration options for the GuardianShield system
 */
export interface GuardianShieldConfig {
  enableTypeValidation: boolean;
  enableDuplicationDetection: boolean;
  enableAutoRecovery: boolean;
  duplicationThreshold: number;
  reportingInterval: number;
  scanDirectories: string[];
  excludePatterns: string[];
}

/**
 * GuardianShield interface
 * Core interface for the GuardianShield system
 */
export interface GuardianShield {
  initialize(config?: Partial<GuardianShieldConfig>): Promise<void>;
  enableTypeValidation(): void;
  enableDuplicationDetection(): void;
  disableTypeValidation(): void;
  disableDuplicationDetection(): void;
  validateFile(path: string): Promise<TypeValidationIssue[]>;
  checkForDuplicates(path: string): Promise<DuplicationIssue[]>;
  getReport(): GuardianShieldReport;
  getState(): GuardianShieldState;
  registerRecoveryAction(action: Omit<RecoveryAction, 'id' | 'createdAt'>): string;
  executeRecovery(actionId: string): Promise<boolean>;
}
