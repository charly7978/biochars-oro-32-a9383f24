/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema robusto de prevención de errores y protección contra fallos de aplicación
 */

import { logError, ErrorLevel, detectCircular, safeStringify } from './debugUtils';
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
  healthStatus: 'healthy' | 'warning' | 'degraded' | 'critical';
  lastRecoverySuccess: boolean;
  lastRecoveryTime: number;
  errorsBySource: Record<string, number>;
}

// Global state for error prevention system
const errorPreventionState: ErrorPreventionState = {
  errorCount: 0,
  lastErrorTime: 0,
  recoveryAttempts: 0,
  isRecovering: false,
  criticalErrors: [],
  hasUnresolvedIssues: false,
  healthStatus: 'healthy',
  lastRecoverySuccess: true,
  lastRecoveryTime: 0,
  errorsBySource: {}
};

// Error thresholds
const ERROR_THRESHOLD_MILD = 5;        // Trigger basic recovery
const ERROR_THRESHOLD_MODERATE = 10;   // Trigger moderate recovery
const ERROR_THRESHOLD_SEVERE = 15;     // Trigger severe recovery
const ERROR_RESET_INTERVAL = 60000;    // Reset error count after 1 minute without errors
const MAX_RECOVERY_ATTEMPTS = 3;       // Maximum number of automatic recovery attempts
const ERROR_DECAY_RATE = 0.5;          // Rate at which old errors count less towards thresholds

// Maximum number of errors allowed per source before considering quarantine
const MAX_ERRORS_PER_SOURCE = 20;

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
 * Calculate the current health status based on error state
 */
function updateHealthStatus(): void {
  const prevStatus = errorPreventionState.healthStatus;
  
  if (errorPreventionState.hasUnresolvedIssues || errorPreventionState.criticalErrors.length > 0) {
    errorPreventionState.healthStatus = 'critical';
  } else if (errorPreventionState.errorCount >= ERROR_THRESHOLD_MODERATE) {
    errorPreventionState.healthStatus = 'degraded';
  } else if (errorPreventionState.errorCount >= ERROR_THRESHOLD_MILD) {
    errorPreventionState.healthStatus = 'warning';
  } else {
    errorPreventionState.healthStatus = 'healthy';
  }
  
  if (prevStatus !== errorPreventionState.healthStatus) {
    logError(
      `System health status changed: ${prevStatus} -> ${errorPreventionState.healthStatus}`,
      ErrorLevel.INFO,
      'ErrorPrevention'
    );
  }
}

/**
 * Apply time decay to error count to reduce impact of old errors
 */
function applyErrorDecay(): void {
  const now = Date.now();
  const timeSinceLastError = now - errorPreventionState.lastErrorTime;
  
  // Only apply decay if some time has passed since the last error
  if (timeSinceLastError > 10000 && errorPreventionState.errorCount > 0) {
    // Apply decay based on time passed
    const decayFactor = Math.min(timeSinceLastError / ERROR_RESET_INTERVAL, 1) * ERROR_DECAY_RATE;
    const newErrorCount = Math.max(0, Math.floor(errorPreventionState.errorCount * (1 - decayFactor)));
    
    if (newErrorCount !== errorPreventionState.errorCount) {
      errorPreventionState.errorCount = newErrorCount;
      logError(
        `Applied error decay, new count: ${newErrorCount}`,
        ErrorLevel.INFO,
        'ErrorPrevention'
      );
      
      // Update health status after decay
      updateHealthStatus();
    }
  }
}

/**
 * Check if a problematic source should be quarantined
 */
function checkSourceQuarantine(source: string): boolean {
  const errorCount = errorPreventionState.errorsBySource[source] || 0;
  return errorCount > MAX_ERRORS_PER_SOURCE;
}

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
  
  // Apply error decay before registering a new error
  applyErrorDecay();
  
  // Check for problematic data that might cause issues when logging
  let safeData = data;
  if (data && detectCircular(data)) {
    try {
      safeData = {
        circular: true,
        stringified: safeStringify(data)
      };
    } catch (e) {
      safeData = { circular: true, nonStringifiable: true };
    }
  }
  
  // Log the error
  logError(errorMessage, severity, errorSource, safeData);
  
  // Reset error count if enough time has passed without errors
  if (now - errorPreventionState.lastErrorTime > ERROR_RESET_INTERVAL) {
    errorPreventionState.errorCount = 0;
    // Don't reset recovery attempts here, let them decay more slowly
  }
  
  // Update error state
  errorPreventionState.errorCount++;
  errorPreventionState.lastErrorTime = now;
  
  // Track errors by source
  if (!errorPreventionState.errorsBySource[errorSource]) {
    errorPreventionState.errorsBySource[errorSource] = 1;
  } else {
    errorPreventionState.errorsBySource[errorSource]++;
  }
  
  // Check if source should be quarantined
  if (checkSourceQuarantine(errorSource)) {
    logError(
      `Source ${errorSource} has exceeded error threshold and may be quarantined`,
      ErrorLevel.WARNING,
      'ErrorPrevention'
    );
  }
  
  // Add to critical errors list if severe
  if (severity === ErrorLevel.CRITICAL) {
    errorPreventionState.criticalErrors.push(`${errorSource}: ${errorMessage}`);
    errorPreventionState.hasUnresolvedIssues = true;
  }
  
  // Update health status
  updateHealthStatus();
  
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
    updateHealthStatus();
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
  
  let recoverySuccess = false;
  
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
      const success = await action.action();
      if (!success) {
        logError(`Recovery action ${action.name} failed`, ErrorLevel.WARNING, 'ErrorPrevention');
      }
    }
    
    // Reset error count if recovery was successful
    errorPreventionState.errorCount = 0;
    recoverySuccess = true;
    
  } catch (error) {
    recoverySuccess = false;
    logError(
      `Error during recovery process: ${error}`,
      ErrorLevel.CRITICAL,
      'ErrorPrevention',
      { error }
    );
    errorPreventionState.hasUnresolvedIssues = true;
  } finally {
    // Update recovery state
    errorPreventionState.lastRecoverySuccess = recoverySuccess;
    errorPreventionState.lastRecoveryTime = Date.now();
    errorPreventionState.isRecovering = false;
    
    // Update health status
    updateHealthStatus();
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
  errorPreventionState.healthStatus = 'healthy';
  errorPreventionState.lastRecoverySuccess = true;
  errorPreventionState.lastRecoveryTime = 0;
  errorPreventionState.errorsBySource = {};
  
  logError('Error prevention system reset', ErrorLevel.INFO, 'ErrorPrevention');
}

/**
 * Manually acknowledge and resolve critical issues
 */
export function acknowledgeIssues(): void {
  if (errorPreventionState.hasUnresolvedIssues) {
    errorPreventionState.hasUnresolvedIssues = false;
    errorPreventionState.criticalErrors = [];
    updateHealthStatus();
    
    logError('Critical issues acknowledged and marked as resolved', ErrorLevel.INFO, 'ErrorPrevention');
  }
}

/**
 * Get the current state of the error prevention system
 */
export function getErrorPreventionState(): ErrorPreventionState {
  // Apply error decay before returning state
  applyErrorDecay();
  return {...errorPreventionState};
}

/**
 * Get detailed analysis of errors by source
 */
export function getErrorAnalytics(): {
  totalErrors: number;
  errorsBySource: Record<string, number>;
  topErrorSources: Array<{source: string, count: number}>;
  healthStatus: ErrorPreventionState['healthStatus'];
} {
  // Get top 5 error sources
  const sources = Object.entries(errorPreventionState.errorsBySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({source, count}));
  
  return {
    totalErrors: errorPreventionState.errorCount,
    errorsBySource: {...errorPreventionState.errorsBySource},
    topErrorSources: sources,
    healthStatus: errorPreventionState.healthStatus
  };
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
    
    // Check for quarantined sources
    const quarantinedSources = Object.entries(errorPreventionState.errorsBySource)
      .filter(([_, count]) => count > MAX_ERRORS_PER_SOURCE)
      .map(([source]) => source);
    
    if (quarantinedSources.length > 0 && operationType === 'critical') {
      return false;
    }
    
    return true;
  };
  
  /**
   * Get the analytics for error reporting
   */
  const getAnalytics = () => getErrorAnalytics();
  
  return {
    registerError,
    handleCriticalError,
    getState: getErrorPreventionState,
    resetSystem: resetErrorPreventionSystem,
    acknowledgeIssues,
    shouldAllowOperation,
    getAnalytics,
    healthStatus: errorPreventionState.healthStatus
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

/**
 * Initialize the error prevention system
 */
export function initializeErrorPreventionSystem(): (() => void) {
  // Set up interval to periodically apply error decay
  const decayInterval = setInterval(() => {
    applyErrorDecay();
  }, 30000); // Check every 30 seconds
  
  // Clean up function to be called when app is unmounted
  const cleanup = () => {
    clearInterval(decayInterval);
    logError('Error prevention system cleanup', ErrorLevel.INFO, 'ErrorPrevention');
  };
  
  // Register for cleanup on window unload
  window.addEventListener('beforeunload', cleanup);
  
  logError('Error prevention system initialized', ErrorLevel.INFO, 'ErrorPrevention');
  
  return cleanup;
}
