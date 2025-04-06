
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
  getCodeDuplicationGuardian,
  registerComponent,
  checkForDuplications,
  DuplicationType,
  type DuplicationSeverity,
  type DuplicationIssue,
  type ModuleInfo
} from './duplication-guardian';

// Export Duplication Detector
export {
  DuplicationDetector,
  type CodePattern,
  type DuplicationCheckResult
} from './duplication-detector';

// Export Error Recovery Service
export { 
  errorRecovery,
  RecoveryStrategy,
  type ErrorRecoveryOptions,
  type RecoveryResult
} from './error-recovery-service';

/**
 * Main GuardianShield class that combines all protection systems
 */
export class GuardianShield {
  private static instance: GuardianShield;
  private typescriptWatchdogEnabled: boolean = true;
  private duplicationGuardianEnabled: boolean = true;
  
  private constructor() {
    console.log("GuardianShield initialized with all protection systems");
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GuardianShield {
    if (!GuardianShield.instance) {
      GuardianShield.instance = new GuardianShield();
    }
    return GuardianShield.instance;
  }
  
  /**
   * Enable or disable TypeScript watchdog
   */
  public enableTypescriptWatchdog(enabled: boolean): void {
    this.typescriptWatchdogEnabled = enabled;
    console.log(`TypeScript watchdog ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Enable or disable code duplication guardian
   */
  public enableDuplicationGuardian(enabled: boolean): void {
    this.duplicationGuardianEnabled = enabled;
    getCodeDuplicationGuardian().setEnabled(enabled);
  }
  
  /**
   * Check if TypeScript watchdog is enabled
   */
  public isTypescriptWatchdogEnabled(): boolean {
    return this.typescriptWatchdogEnabled;
  }
  
  /**
   * Check if code duplication guardian is enabled
   */
  public isDuplicationGuardianEnabled(): boolean {
    return this.duplicationGuardianEnabled;
  }
  
  /**
   * Register a component with the code duplication guardian
   */
  public registerComponent(name: string, filePath: string, exports: string[] = []): void {
    if (this.duplicationGuardianEnabled) {
      registerComponent(name, filePath, exports);
    }
  }
  
  /**
   * Generate a comprehensive report of all issues
   */
  public generateReport(): {
    timestamp: number;
    duplicationIssues: ReturnType<typeof CodeDuplicationGuardian.prototype.generateReport>;
    typeScriptStatistics: ReturnType<typeof TypeScriptWatchdog.getErrorStats>;
  } {
    return {
      timestamp: Date.now(),
      duplicationIssues: getCodeDuplicationGuardian().generateReport(),
      typeScriptStatistics: TypeScriptWatchdog.getErrorStats()
    };
  }
}

/**
 * Get the singleton instance of GuardianShield
 */
export function getGuardianShield(): GuardianShield {
  return GuardianShield.getInstance();
}
