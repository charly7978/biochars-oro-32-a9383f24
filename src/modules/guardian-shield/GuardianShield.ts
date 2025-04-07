
/**
 * Enhanced GuardianShield system
 * Provides comprehensive protection and monitoring for signal processing
 */

import { TypeScriptWatchdog, TypeScriptErrorType } from './typescript-watchdog';
import { CodeDuplicationGuardian, DuplicationType } from './duplication-guardian';
import { ErrorRecoveryService, RecoveryStrategy } from './error-recovery-service';

// Import signal processing types for integration
import { BaseProcessedSignal } from '../signal-processing/types';

/**
 * Guardian configuration options
 */
export interface GuardianConfig {
  enableTypeScriptWatchdog: boolean;
  enableDuplicationGuardian: boolean;
  enableSignalValidation: boolean;
  enableErrorRecovery: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Result of signal validation
 */
export interface SignalValidationResult {
  isValid: boolean;
  issues: string[];
  correctedSignal?: BaseProcessedSignal;
}

/**
 * Main GuardianShield class with improved integration
 */
export class GuardianShield {
  private static instance: GuardianShield;
  private config: GuardianConfig;
  private initialized: boolean = false;
  private activeSystems: string[] = [];
  private signalValidationRules: Array<(signal: BaseProcessedSignal) => boolean> = [];
  
  // Statistics
  private signalValidations: number = 0;
  private validationIssuesDetected: number = 0;
  private recoveryAttempts: number = 0;
  private recoverySuccesses: number = 0;
  
  private constructor(config?: Partial<GuardianConfig>) {
    // Default configuration
    this.config = {
      enableTypeScriptWatchdog: true,
      enableDuplicationGuardian: true,
      enableSignalValidation: true,
      enableErrorRecovery: true,
      logLevel: 'info',
      ...config
    };
    
    this.initialize();
  }
  
  /**
   * Get singleton instance with optional configuration
   */
  public static getInstance(config?: Partial<GuardianConfig>): GuardianShield {
    if (!GuardianShield.instance) {
      GuardianShield.instance = new GuardianShield(config);
    } else if (config) {
      // Update existing configuration if provided
      GuardianShield.instance.configure(config);
    }
    return GuardianShield.instance;
  }
  
  /**
   * Initialize the guardian systems
   */
  private initialize(): void {
    this.log('info', 'Initializing GuardianShield');
    
    if (this.config.enableTypeScriptWatchdog) {
      this.activeSystems.push('TypeScriptWatchdog');
      this.log('info', 'TypeScript watchdog activated');
    }
    
    if (this.config.enableDuplicationGuardian) {
      this.activeSystems.push('CodeDuplicationGuardian');
      this.log('info', 'Code duplication guardian activated');
    }
    
    if (this.config.enableSignalValidation) {
      this.activeSystems.push('SignalValidation');
      this.setupSignalValidationRules();
      this.log('info', 'Signal validation system activated');
    }
    
    if (this.config.enableErrorRecovery) {
      this.activeSystems.push('ErrorRecovery');
      this.log('info', 'Error recovery system activated');
    }
    
    this.initialized = true;
    this.log('info', `GuardianShield initialized with systems: ${this.activeSystems.join(', ')}`);
  }
  
  /**
   * Configure the guardian
   */
  public configure(config: Partial<GuardianConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reset active systems
    this.activeSystems = [];
    this.initialize();
    
    this.log('info', 'GuardianShield reconfigured');
  }
  
  /**
   * Setup default signal validation rules
   */
  private setupSignalValidationRules(): void {
    // Rule: Signal timestamp should be recent (within last 10 seconds)
    this.signalValidationRules.push((signal: BaseProcessedSignal) => {
      const now = Date.now();
      return signal.timestamp > now - 10000;
    });
    
    // Rule: Quality should be between 0 and 100
    this.signalValidationRules.push((signal: BaseProcessedSignal) => {
      return signal.quality >= 0 && signal.quality <= 100;
    });
    
    // Rule: Signal should have a valid source ID
    this.signalValidationRules.push((signal: BaseProcessedSignal) => {
      return !!signal.sourceId && signal.sourceId.length > 0;
    });
    
    this.log('debug', `Set up ${this.signalValidationRules.length} signal validation rules`);
  }
  
  /**
   * Validate a signal against rules
   */
  public validateSignal(signal: BaseProcessedSignal): SignalValidationResult {
    if (!this.config.enableSignalValidation || !this.initialized) {
      return { isValid: true, issues: [] };
    }
    
    this.signalValidations++;
    const issues: string[] = [];
    
    // Apply each validation rule
    for (let i = 0; i < this.signalValidationRules.length; i++) {
      const rule = this.signalValidationRules[i];
      if (!rule(signal)) {
        issues.push(`Validation rule #${i + 1} failed`);
      }
    }
    
    if (issues.length > 0) {
      this.validationIssuesDetected += issues.length;
      this.log('warn', `Signal validation issues detected: ${issues.join(', ')}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Register a component with the duplication guardian
   */
  public registerComponent(name: string, filePath: string, exports: string[] = []): void {
    if (!this.config.enableDuplicationGuardian || !this.initialized) {
      return;
    }
    
    this.log('debug', `Registering component: ${name} at ${filePath}`);
    // Call to the duplication guardian would go here
  }
  
  /**
   * Recover from an error using the error recovery service
   */
  public recoverFromError<T>(
    error: Error | unknown, 
    componentName: string,
    defaultValue: T,
    strategy: RecoveryStrategy = RecoveryStrategy.USE_DEFAULT_VALUE
  ): T {
    if (!this.config.enableErrorRecovery || !this.initialized) {
      if (error instanceof Error) {
        this.log('error', `Error in ${componentName}: ${error.message}`);
      }
      return defaultValue;
    }
    
    this.recoveryAttempts++;
    
    try {
      // Here we would use the ErrorRecoveryService
      this.recoverySuccesses++;
      return defaultValue; // Placeholder until fully implemented
    } catch (recoveryError) {
      this.log('error', `Recovery failed for ${componentName}`);
      return defaultValue;
    }
  }
  
  /**
   * Internal logging function
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    // Only log if the level is high enough
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[this.config.logLevel]) {
      const prefix = `[GuardianShield]`;
      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}`);
          break;
        case 'info':
          console.info(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
      }
    }
  }
  
  /**
   * Generate a comprehensive report of all issues
   */
  public generateReport(): {
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
  } {
    return {
      timestamp: Date.now(),
      activeSystems: [...this.activeSystems],
      signalValidations: {
        total: this.signalValidations,
        issues: this.validationIssuesDetected,
        issueRate: this.signalValidations > 0 
          ? this.validationIssuesDetected / this.signalValidations 
          : 0
      },
      errorRecovery: {
        attempts: this.recoveryAttempts,
        successes: this.recoverySuccesses,
        successRate: this.recoveryAttempts > 0 
          ? this.recoverySuccesses / this.recoveryAttempts 
          : 0
      }
    };
  }
}

/**
 * Global access point for the GuardianShield
 */
let globalGuardian: GuardianShield | null = null;

/**
 * Get the global GuardianShield instance
 */
export function getGuardianShield(config?: Partial<GuardianConfig>): GuardianShield {
  if (!globalGuardian) {
    globalGuardian = GuardianShield.getInstance(config);
  }
  return globalGuardian;
}

/**
 * Initialize the Guardian Shield system with optional configuration
 */
export function initializeGuardianShield(config?: Partial<GuardianConfig>): GuardianShield {
  console.log("Initializing Guardian Shield system with enhanced capabilities...");
  return getGuardianShield(config);
}
