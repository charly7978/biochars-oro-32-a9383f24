
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema robusto de prevención de errores y protección contra fallos de aplicación
 */

import { logError, ErrorLevel } from './debugUtils';
import { useToast } from '@/hooks/use-toast';

/**
 * Interface for recovery actions
 */
export interface RecoveryAction {
  name: string;
  description: string;
  action: () => Promise<boolean>;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Interface for error prevention state
 */
export interface ErrorPreventionState {
  errorCount: number;
  lastErrorTime: number;
  recoveryAttempts: number;
  isRecovering: boolean;
  criticalErrors: string[];
  hasUnresolvedIssues: boolean;
}

// Global state for error prevention system
const errorPreventionState: ErrorPreventionState = {
  errorCount: 0,
  lastErrorTime: 0,
  recoveryAttempts: 0,
  isRecovering: false,
  criticalErrors: [],
  hasUnresolvedIssues: false
};

// Error thresholds
const ERROR_THRESHOLD_MILD = 5;        // Trigger basic recovery
const ERROR_THRESHOLD_MODERATE = 10;   // Trigger moderate recovery
const ERROR_THRESHOLD_SEVERE = 15;     // Trigger severe recovery
const ERROR_RESET_INTERVAL = 60000;    // Reset error count after 1 minute without errors
const MAX_RECOVERY_ATTEMPTS = 3;       // Maximum number of automatic recovery attempts

// Available recovery actions
const recoveryActions: RecoveryAction[] = [
  {
    name: 'resetDataBuffers',
    description: 'Reset all data buffers',
    action: async () => {
      logError('Executing recovery action: Reset all data buffers', ErrorLevel.INFO, 'ErrorPrevention');
      // Implementation will use the actual reset functions in the application
      return true;
    },
    severity: 'low'
  },
  {
    name: 'clearSignalProcessors',
    description: 'Clear and reinitialize signal processors',
    action: async () => {
      logError('Executing recovery action: Clear and reinitialize signal processors', ErrorLevel.INFO, 'ErrorPrevention');
      // Implementation will use the actual reset functions in the application
      return true;
    },
    severity: 'medium'
  },
  {
    name: 'restartMonitoring',
    description: 'Stop and restart monitoring completely',
    action: async () => {
      logError('Executing recovery action: Stop and restart monitoring', ErrorLevel.WARNING, 'ErrorPrevention');
      // Implementation will use the actual restart functions in the application
      return true;
    },
    severity: 'high'
  }
];

/**
 * Register an application error and potentially trigger recovery
 */
export function registerApplicationError(
  errorMessage: string,
  errorSource: string,
  data?: any,
  severity: ErrorLevel = ErrorLevel.ERROR
): void {
  const now = Date.now();
  
  // Log the error
  logError(errorMessage, severity, errorSource, data);
  
  // Reset error count if enough time has passed without errors
  if (now - errorPreventionState.lastErrorTime > ERROR_RESET_INTERVAL) {
    errorPreventionState.errorCount = 0;
    errorPreventionState.recoveryAttempts = 0;
  }
  
  // Update error state
  errorPreventionState.errorCount++;
  errorPreventionState.lastErrorTime = now;
  
  // Add to critical errors list if severe
  if (severity === ErrorLevel.CRITICAL) {
    errorPreventionState.criticalErrors.push(`${errorSource}: ${errorMessage}`);
    errorPreventionState.hasUnresolvedIssues = true;
  }
  
  // Determine if recovery action is needed
  if (!errorPreventionState.isRecovering) {
    if (errorPreventionState.errorCount >= ERROR_THRESHOLD_SEVERE) {
      triggerRecovery('high');
    } else if (errorPreventionState.errorCount >= ERROR_THRESHOLD_MODERATE) {
      triggerRecovery('medium');
    } else if (errorPreventionState.errorCount >= ERROR_THRESHOLD_MILD) {
      triggerRecovery('low');
    }
  }
}

/**
 * Trigger a recovery process based on severity
 */
async function triggerRecovery(level: 'low' | 'medium' | 'high'): Promise<void> {
  // Check if we've exceeded recovery attempts
  if (errorPreventionState.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    logError(
      `Maximum recovery attempts (${MAX_RECOVERY_ATTEMPTS}) reached. Manual intervention required.`,
      ErrorLevel.CRITICAL,
      'ErrorPrevention'
    );
    errorPreventionState.hasUnresolvedIssues = true;
    return;
  }
  
  // Set recovering flag
  errorPreventionState.isRecovering = true;
  errorPreventionState.recoveryAttempts++;
  
  // Log recovery attempt
  logError(
    `Triggering ${level} recovery (attempt ${errorPreventionState.recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`,
    ErrorLevel.WARNING,
    'ErrorPrevention'
  );
  
  try {
    // Get applicable recovery actions based on severity
    const applicableActions = recoveryActions.filter(action => {
      if (level === 'high') return true; // All actions for high severity
      if (level === 'medium') return action.severity !== 'high'; // Low and medium for medium severity
      return action.severity === 'low'; // Only low for low severity
    });
    
    // Execute recovery actions sequentially
    for (const action of applicableActions) {
      logError(`Attempting recovery action: ${action.name}`, ErrorLevel.INFO, 'ErrorPrevention');
      await action.action();
    }
    
    // Reset error count if recovery was successful
    errorPreventionState.errorCount = 0;
    
  } catch (error) {
    logError(
      `Error during recovery process: ${error}`,
      ErrorLevel.CRITICAL,
      'ErrorPrevention',
      { error }
    );
    errorPreventionState.hasUnresolvedIssues = true;
  } finally {
    // Reset recovery flag
    errorPreventionState.isRecovering = false;
  }
}

/**
 * Reset the error prevention system state
 */
export function resetErrorPreventionSystem(): void {
  errorPreventionState.errorCount = 0;
  errorPreventionState.lastErrorTime = 0;
  errorPreventionState.recoveryAttempts = 0;
  errorPreventionState.isRecovering = false;
  errorPreventionState.criticalErrors = [];
  errorPreventionState.hasUnresolvedIssues = false;
  
  logError('Error prevention system reset', ErrorLevel.INFO, 'ErrorPrevention');
}

/**
 * Get the current state of the error prevention system
 */
export function getErrorPreventionState(): ErrorPreventionState {
  return {...errorPreventionState};
}

/**
 * Hook for using the error prevention system
 */
export function useErrorPrevention() {
  const { toast } = useToast();
  
  /**
   * Register an error with optional toast notification
   */
  const registerError = (
    message: string,
    source: string,
    data?: any,
    severity: ErrorLevel = ErrorLevel.ERROR,
    showToast: boolean = true
  ) => {
    registerApplicationError(message, source, data, severity);
    
    if (showToast && severity !== ErrorLevel.INFO) {
      toast({
        title: `${severity.toUpperCase()} in ${source}`,
        description: message,
        variant: severity === ErrorLevel.WARNING ? "default" : "destructive",
        duration: severity === ErrorLevel.CRITICAL ? 5000 : 3000,
      });
    }
  };
  
  /**
   * Handle a critical error with enhanced logging
   */
  const handleCriticalError = (
    error: unknown,
    source: string,
    context?: any
  ) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : new Error().stack;
    
    registerApplicationError(
      errorMessage,
      source,
      {
        context,
        stack: errorStack
      },
      ErrorLevel.CRITICAL
    );
    
    toast({
      title: "Critical Error",
      description: `${source}: ${errorMessage}`,
      variant: "destructive",
      duration: 5000,
    });
    
    return errorMessage;
  };
  
  /**
   * Check if a specific operation should be allowed based on current system state
   */
  const shouldAllowOperation = (operationType: 'standard' | 'risky' | 'critical'): boolean => {
    // If system is recovering, only allow standard operations
    if (errorPreventionState.isRecovering && operationType !== 'standard') {
      return false;
    }
    
    // If there are unresolved critical issues, don't allow critical operations
    if (errorPreventionState.hasUnresolvedIssues && operationType === 'critical') {
      return false;
    }
    
    // If error count is high, restrict risky and critical operations
    if (errorPreventionState.errorCount >= ERROR_THRESHOLD_MODERATE && operationType !== 'standard') {
      return false;
    }
    
    return true;
  };
  
  return {
    registerError,
    handleCriticalError,
    getState: getErrorPreventionState,
    resetSystem: resetErrorPreventionSystem,
    shouldAllowOperation
  };
}

/**
 * Registers all recovery actions for the specific application
 */
export function registerRecoveryActions(
  actions: {
    resetBuffers: () => Promise<boolean>;
    resetProcessors: () => Promise<boolean>;
    restartMonitoring: () => Promise<boolean>;
  }
): void {
  // Update the implementation of the recovery actions
  recoveryActions[0].action = actions.resetBuffers;
  recoveryActions[1].action = actions.resetProcessors;
  recoveryActions[2].action = actions.restartMonitoring;
  
  logError('Recovery actions registered with the error prevention system', 
    ErrorLevel.INFO, 
    'ErrorPrevention'
  );
}
