
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Integration for the error prevention system
 */

import { useCallback, useEffect, useRef } from 'react';
import { logError, ErrorLevel } from '../debugUtils';
import { trackDeviceError, CameraState, setCameraState } from '../deviceErrorTracker';
import { monitorError, getSystemHealth, SystemHealthState } from './monitor';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';
import { DiagnosticsData, addDiagnosticsData, getDiagnosticsData } from '@/hooks/heart-beat/signal-processing/peak-detection';
import { resetSignalQualityState } from '@/hooks/heart-beat/signal-processing/signal-quality';
import { useToast } from '@/hooks/use-toast';

// Prevention modes for integration
export enum PreventionMode {
  PASSIVE = 'passive',       // Only monitors and reports
  ACTIVE = 'active',         // Applies preventive measures
  AGGRESSIVE = 'aggressive'  // Maximum prevention (may affect performance)
}

// Diagnostic channel connection
interface DiagnosticChannelState {
  connected: boolean;
  lastReceived: number;
  errorRate: number;
  signalQuality: number;
  processingLoad: number;
}

// Global state
let preventionMode: PreventionMode = PreventionMode.ACTIVE;
let diagnosticChannelState: DiagnosticChannelState = {
  connected: false,
  lastReceived: 0,
  errorRate: 0,
  signalQuality: 0,
  processingLoad: 0
};

// Recovery actions registry
interface RecoveryAction {
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  lastExecuted: number | null;
  successCount: number;
  failureCount: number;
}

const recoveryActions: RecoveryAction[] = [];

/**
 * Register a recovery action
 */
export function registerRecoveryAction(
  name: string,
  description: string,
  action: () => Promise<boolean>
): void {
  // Check if action already exists
  const existingIndex = recoveryActions.findIndex(a => a.name === name);
  
  if (existingIndex >= 0) {
    // Update existing action
    recoveryActions[existingIndex] = {
      ...recoveryActions[existingIndex],
      description,
      execute: action
    };
  } else {
    // Add new action
    recoveryActions.push({
      name,
      description,
      execute: action,
      lastExecuted: null,
      successCount: 0,
      failureCount: 0
    });
  }
  
  logError(`Recovery action registered: ${name}`, ErrorLevel.INFO, 'ErrorPrevention');
}

/**
 * Execute a recovery action by name
 */
export async function executeRecoveryAction(name: string): Promise<boolean> {
  const action = recoveryActions.find(a => a.name === name);
  
  if (!action) {
    logError(`Recovery action not found: ${name}`, ErrorLevel.WARNING, 'ErrorPrevention');
    return false;
  }
  
  logError(`Executing recovery action: ${name}`, ErrorLevel.INFO, 'ErrorPrevention');
  
  try {
    action.lastExecuted = Date.now();
    const success = await action.execute();
    
    if (success) {
      action.successCount++;
      logError(`Recovery action succeeded: ${name}`, ErrorLevel.INFO, 'ErrorPrevention');
    } else {
      action.failureCount++;
      logError(`Recovery action failed: ${name}`, ErrorLevel.WARNING, 'ErrorPrevention');
    }
    
    return success;
  } catch (error) {
    action.failureCount++;
    logError(
      `Error executing recovery action ${name}: ${error instanceof Error ? error.message : String(error)}`,
      ErrorLevel.ERROR,
      'ErrorPrevention'
    );
    return false;
  }
}

/**
 * Set the prevention mode
 */
export function setPreventionMode(mode: PreventionMode): void {
  const previousMode = preventionMode;
  preventionMode = mode;
  
  logError(
    `Prevention mode changed: ${previousMode} -> ${mode}`,
    ErrorLevel.INFO,
    'ErrorPrevention'
  );
}

/**
 * Get current prevention mode
 */
export function getPreventionMode(): PreventionMode {
  return preventionMode;
}

/**
 * Connect to diagnostic channel
 */
function connectDiagnosticChannel(): void {
  // Update connection status
  diagnosticChannelState.connected = true;
  diagnosticChannelState.lastReceived = Date.now();
  
  // Set up polling for diagnostics data
  const pollDiagnostics = () => {
    try {
      const diagnostics = getDiagnosticsData();
      
      if (diagnostics.length > 0) {
        // Get most recent diagnostics
        const recent = diagnostics.slice(-10);
        
        // Calculate error rate (as percentage of low confidence data points)
        const lowConfidencePoints = recent.filter(d => d.peakDetectionConfidence < 0.3).length;
        const errorRate = (lowConfidencePoints / recent.length) * 100;
        
        // Calculate average signal quality
        const avgSignalStrength = recent.reduce((sum, d) => sum + d.signalStrength, 0) / recent.length;
        
        // Calculate average processing load
        const avgProcessingLoad = recent.reduce((sum, d) => sum + d.processorLoad, 0) / recent.length;
        
        // Update diagnostic channel state
        diagnosticChannelState = {
          connected: true,
          lastReceived: Date.now(),
          errorRate,
          signalQuality: avgSignalStrength * 100, // Normalize to 0-100
          processingLoad: avgProcessingLoad
        };
      }
    } catch (error) {
      logError(
        `Error polling diagnostics: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.WARNING,
        'DiagnosticChannel'
      );
      
      // Mark as disconnected if errors persist
      if (Date.now() - diagnosticChannelState.lastReceived > 5000) {
        diagnosticChannelState.connected = false;
      }
    }
  };
  
  // Initial poll
  pollDiagnostics();
  
  // Set up interval for polling
  const intervalId = setInterval(pollDiagnostics, 1000);
  
  // Clean up function
  return () => {
    clearInterval(intervalId);
    diagnosticChannelState.connected = false;
  };
}

/**
 * Initialize error prevention system
 */
export function initializeErrorPrevention(): (() => void) {
  logError('Initializing error prevention system', ErrorLevel.INFO, 'ErrorPrevention');
  
  // Register default recovery actions
  registerRecoveryAction(
    'resetSignalProcessing',
    'Reset signal processing state',
    async () => {
      resetSignalQualityState();
      return true;
    }
  );
  
  registerRecoveryAction(
    'resetFingerDetection',
    'Reset finger detection system',
    async () => {
      unifiedFingerDetector.reset();
      return true;
    }
  );
  
  registerRecoveryAction(
    'resetCameraState',
    'Reset camera state',
    async () => {
      setCameraState(CameraState.INACTIVE);
      // Simulate a small delay for the camera to reset
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }
  );
  
  // Connect diagnostic channel
  const cleanupDiagnostics = connectDiagnosticChannel();
  
  // Return cleanup function
  return () => {
    cleanupDiagnostics();
    logError('Error prevention system shutdown', ErrorLevel.INFO, 'ErrorPrevention');
  };
}

/**
 * Get diagnostic channel state
 */
export function getDiagnosticChannelState(): DiagnosticChannelState {
  return { ...diagnosticChannelState };
}

/**
 * Add diagnostic data with error prevention context
 */
export function trackDiagnosticWithPrevention(
  data: Partial<DiagnosticsData> & { source: string }
): void {
  try {
    // Add standard fields if missing
    const fullData: DiagnosticsData = {
      timestamp: Date.now(),
      processTime: data.processTime || 0,
      signalStrength: data.signalStrength || 0,
      processorLoad: data.processorLoad || 0,
      dataPointsProcessed: data.dataPointsProcessed || 1,
      peakDetectionConfidence: data.peakDetectionConfidence || 0,
      processingPriority: data.processingPriority || 'low'
    };
    
    // Track in diagnostics system
    addDiagnosticsData(fullData);
    
    // Also track in error monitoring if confidence is low
    if (fullData.peakDetectionConfidence < 0.3) {
      monitorError(
        `Low detection confidence: ${fullData.peakDetectionConfidence.toFixed(2)}`,
        data.source,
        'low-confidence',
        ErrorLevel.INFO
      );
    }
    
    // Update channel state
    diagnosticChannelState.lastReceived = Date.now();
    
  } catch (error) {
    logError(
      `Error tracking diagnostic: ${error instanceof Error ? error.message : String(error)}`,
      ErrorLevel.WARNING,
      'ErrorPrevention'
    );
  }
}

/**
 * Get all registered recovery actions
 */
export function getAvailableRecoveryActions(): Array<Omit<RecoveryAction, 'execute'>> {
  return recoveryActions.map(({ name, description, lastExecuted, successCount, failureCount }) => ({
    name,
    description,
    lastExecuted,
    successCount,
    failureCount
  }));
}

/**
 * Simple check if an operation should proceed based on system health
 */
export function shouldProceedWithOperation(
  operationType: 'critical' | 'normal' | 'low-risk'
): boolean {
  const health = getSystemHealth();
  
  switch (operationType) {
    case 'critical':
      return health !== SystemHealthState.CRITICAL;
    
    case 'normal':
      return health !== SystemHealthState.CRITICAL && 
             health !== SystemHealthState.DEGRADED;
    
    case 'low-risk':
      return true; // Always allow low-risk operations
      
    default:
      return health === SystemHealthState.HEALTHY;
  }
}

/**
 * Hook for using the error prevention system
 */
export function useErrorPrevention(options: {
  autoRecover?: boolean;
  notifyOnRecovery?: boolean;
  preventionMode?: PreventionMode;
} = {}) {
  const { toast } = useToast();
  const initialized = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  const {
    autoRecover = true,
    notifyOnRecovery = true,
    preventionMode: initialMode = PreventionMode.ACTIVE
  } = options;
  
  // Initialize on first render
  useEffect(() => {
    if (!initialized.current) {
      setPreventionMode(initialMode);
      cleanupRef.current = initializeErrorPrevention();
      initialized.current = true;
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [initialMode]);
  
  // Handle auto recovery
  useEffect(() => {
    if (!autoRecover) return;
    
    const checkHealthInterval = setInterval(() => {
      const health = getSystemHealth();
      
      // Auto recovery for degraded or critical state
      if (health === SystemHealthState.DEGRADED || health === SystemHealthState.CRITICAL) {
        // Find least recently executed recovery action
        const sortedActions = [...recoveryActions]
          .filter(action => !action.lastExecuted || Date.now() - action.lastExecuted > 60000) // Not executed in last minute
          .sort((a, b) => {
            // Prioritize never executed actions
            if (!a.lastExecuted && !b.lastExecuted) return 0;
            if (!a.lastExecuted) return -1;
            if (!b.lastExecuted) return 1;
            
            // Then prioritize least recently executed
            return a.lastExecuted - b.lastExecuted;
          });
        
        // Execute first available action
        if (sortedActions.length > 0) {
          const action = sortedActions[0];
          
          // Execute recovery
          executeRecoveryAction(action.name).then(success => {
            if (notifyOnRecovery) {
              toast({
                title: "Automatic Recovery",
                description: `Action '${action.name}' ${success ? 'succeeded' : 'failed'}`,
                variant: success ? "default" : "destructive",
                duration: 3000,
              });
            }
          });
        }
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(checkHealthInterval);
  }, [autoRecover, notifyOnRecovery, toast]);
  
  const runRecoveryAction = useCallback(async (name: string) => {
    const success = await executeRecoveryAction(name);
    
    if (notifyOnRecovery) {
      toast({
        title: "Recovery Action",
        description: `${name}: ${success ? 'Succeeded' : 'Failed'}`,
        variant: success ? "default" : "destructive",
        duration: 3000,
      });
    }
    
    return success;
  }, [notifyOnRecovery, toast]);
  
  const changePreventionMode = useCallback((mode: PreventionMode) => {
    setPreventionMode(mode);
    
    toast({
      title: "Prevention Mode Changed",
      description: `Mode set to: ${mode}`,
      duration: 2000,
    });
  }, [toast]);
  
  return {
    currentMode: getPreventionMode,
    setMode: changePreventionMode,
    systemHealth: getSystemHealth,
    runRecovery: runRecoveryAction,
    getDiagnostics: getDiagnosticChannelState,
    getAvailableRecoveryActions,
    shouldProceedWithOperation,
    trackDiagnostic: trackDiagnosticWithPrevention
  };
}
