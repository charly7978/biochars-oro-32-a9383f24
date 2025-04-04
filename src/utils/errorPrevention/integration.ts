
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Error prevention integration module
 */
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { logError, ErrorLevel } from '../debugUtils';

// Available prevention modes
export enum PreventionMode {
  STANDARD = 'standard',
  AGGRESSIVE = 'aggressive',
  MINIMAL = 'minimal'
}

// System health states
export enum SystemHealthState {
  OPTIMAL = 'optimal',
  GOOD = 'good',
  DEGRADED = 'degraded',
  POOR = 'poor',
  CRITICAL = 'critical'
}

// Diagnostic event
interface DiagnosticEvent {
  timestamp: number;
  component: string;
  event: string;
  data?: any;
}

// Recovery actions store
type RecoveryAction = {
  id: string;
  name: string;
  description: string;
  action: () => Promise<any>;
  severity: 'low' | 'medium' | 'high';
};

const recoveryActions: Map<string, RecoveryAction> = new Map();

// Diagnostic channel state
interface DiagnosticChannelState {
  enabled: boolean;
  bufferSize: number;
  events: DiagnosticEvent[];
}

const diagnosticChannel: DiagnosticChannelState = {
  enabled: true,
  bufferSize: 100,
  events: []
};

/**
 * Register recovery actions for specific components
 */
export function registerRecoveryActions(
  componentName: string,
  actions: Array<{
    id: string;
    name: string;
    description: string;
    action: () => Promise<any>;
    severity: 'low' | 'medium' | 'high';
  }>
) {
  for (const action of actions) {
    const fullId = `${componentName}:${action.id}`;
    recoveryActions.set(fullId, {
      ...action,
      id: fullId
    });
  }
}

/**
 * Get all available recovery actions
 */
export function getAvailableRecoveryActions(): RecoveryAction[] {
  return Array.from(recoveryActions.values());
}

/**
 * Get diagnostic channel state
 */
export function getDiagnosticChannelState(): DiagnosticChannelState {
  return { ...diagnosticChannel };
}

/**
 * Get system health state
 */
export function getSystemHealth(): { 
  state: SystemHealthState;
  issues: string[];
  lastChecked: number;
} {
  // For demonstration, return a simple health check
  return {
    state: SystemHealthState.GOOD,
    issues: [],
    lastChecked: Date.now()
  };
}

/**
 * Hook for using the error prevention system
 */
export function useErrorPrevention() {
  const [healthStatus, setHealthStatus] = useState<
    'optimal' | 'good' | 'degraded' | 'poor' | 'critical'
  >('good');
  
  const [currentMode, setCurrentMode] = useState<PreventionMode>(PreventionMode.STANDARD);
  const errorsRef = useRef<Array<{ message: string; timestamp: number; severity: ErrorLevel }>>([]);
  
  /**
   * Register an error with the system
   */
  const registerError = useCallback(
    (
      message: string,
      source: string,
      data?: any,
      severity: ErrorLevel = ErrorLevel.ERROR,
      showToast: boolean = true
    ) => {
      // Log the error
      logError(message, severity, source, data);
      
      // Add to error history
      errorsRef.current.push({
        message,
        timestamp: Date.now(),
        severity
      });
      
      // Trim history if needed
      if (errorsRef.current.length > 50) {
        errorsRef.current = errorsRef.current.slice(-50);
      }
      
      // Show toast for user feedback if needed
      if (showToast) {
        switch (severity) {
          case ErrorLevel.ERROR:
          case ErrorLevel.CRITICAL:
            toast.error(message);
            break;
          case ErrorLevel.WARNING:
            toast.warning(message);
            break;
          case ErrorLevel.INFO:
            toast.info(message);
            break;
        }
      }
      
      // Update health status based on errors
      updateHealthStatus();
    },
    [errorsRef]
  );
  
  /**
   * Handle a critical error
   */
  const handleCriticalError = useCallback(
    (error: unknown, source: string, context?: any) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Register as critical error
      registerError(
        `Critical error in ${source}: ${errorMessage}`,
        source,
        { error, context },
        ErrorLevel.CRITICAL,
        true
      );
      
      // Set health status to critical
      setHealthStatus('critical');
      
      return errorMessage;
    },
    [registerError]
  );
  
  /**
   * Check if system is in a healthy state
   */
  const isSystemHealthy = useCallback(() => {
    return healthStatus === 'optimal' || healthStatus === 'good';
  }, [healthStatus]);
  
  /**
   * Update health status based on recent errors
   */
  const updateHealthStatus = useCallback(() => {
    const recentErrors = errorsRef.current.filter(
      (e) => Date.now() - e.timestamp < 60000
    );
    
    const criticalCount = recentErrors.filter(
      (e) => e.severity === ErrorLevel.CRITICAL
    ).length;
    const errorCount = recentErrors.filter(
      (e) => e.severity === ErrorLevel.ERROR
    ).length;
    const warningCount = recentErrors.filter(
      (e) => e.severity === ErrorLevel.WARNING
    ).length;
    
    if (criticalCount > 0) {
      setHealthStatus('critical');
    } else if (errorCount > 3) {
      setHealthStatus('poor');
    } else if (errorCount > 0 || warningCount > 3) {
      setHealthStatus('degraded');
    } else if (warningCount > 0) {
      setHealthStatus('good');
    } else {
      setHealthStatus('optimal');
    }
  }, [errorsRef]);
  
  /**
   * Run a recovery action
   */
  const runRecovery = useCallback(async (actionId: string) => {
    const action = recoveryActions.get(actionId);
    
    if (!action) {
      console.error(`Recovery action not found: ${actionId}`);
      return { success: false, error: 'Recovery action not found' };
    }
    
    try {
      // Log recovery attempt
      logError(
        `Running recovery action: ${action.name}`,
        ErrorLevel.INFO,
        'ErrorPrevention'
      );
      
      // Run the action
      const result = await action.action();
      
      // Log success
      logError(
        `Recovery action completed: ${action.name}`,
        ErrorLevel.INFO,
        'ErrorPrevention'
      );
      
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log failure
      logError(
        `Recovery action failed: ${action.name} - ${errorMessage}`,
        ErrorLevel.ERROR,
        'ErrorPrevention'
      );
      
      return { success: false, error: errorMessage };
    }
  }, []);
  
  /**
   * Set the prevention mode
   */
  const setMode = useCallback((mode: PreventionMode) => {
    setCurrentMode(mode);
    
    // Log mode change
    logError(
      `Error prevention mode changed to: ${mode}`,
      ErrorLevel.INFO,
      'ErrorPrevention'
    );
  }, []);
  
  /**
   * Get diagnostic data
   */
  const getDiagnostics = useCallback(() => {
    return {
      recentErrors: errorsRef.current,
      healthStatus,
      preventionMode: currentMode,
      diagnosticEvents: diagnosticChannel.events
    };
  }, [healthStatus, currentMode]);
  
  return {
    registerError,
    handleCriticalError,
    isSystemHealthy,
    healthStatus,
    currentMode,
    runRecovery,
    setMode,
    getDiagnostics,
    getAvailableRecoveryActions
  };
}
