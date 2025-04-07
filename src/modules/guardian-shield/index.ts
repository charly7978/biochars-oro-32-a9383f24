
/**
 * Guardian Shield System
 * Comprehensive protection for TypeScript applications
 */

// Export TypeScript error watchdog
export { 
  TypeScriptWatchdog, 
  TypeScriptErrorType,
  type ErrorSeverityLevel,
  type TypeScriptError,
  type CorrectionResult 
} from './typescript-watchdog';

// Export Code Duplication Guardian
export { 
  CodeDuplicationGuardian,
  type DuplicationSeverity,
  type DuplicationIssue,
  type ModuleInfo
} from './duplication-guardian';

// Export registration functions from duplication-guardian
export { 
  registerComponent,
  checkForDuplications,
  DuplicationType
} from './duplication-guardian';

// Export Duplication Detector
export {
  DuplicationDetector,
  type CodePattern,
  type DuplicationCheckResult
} from './duplication-detector';

// Export Error Recovery Service
export { 
  ErrorRecoveryService,
  RecoveryStrategy,
  type RecoveryAttemptResult
} from './error-recovery-service';

// Export Enhanced GuardianShield
export {
  GuardianShield,
  getGuardianShield,
  initializeGuardianShield,
  type GuardianConfig,
  type SignalValidationResult
} from './GuardianShield';

// Initialize the guardian by default
import { initializeGuardianShield } from './GuardianShield';
const guardian = initializeGuardianShield();
console.log("Guardian Shield initialized with all protection systems");

// Export the instance for direct use
export { guardian };
