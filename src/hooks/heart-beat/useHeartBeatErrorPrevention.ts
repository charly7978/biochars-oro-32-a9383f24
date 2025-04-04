/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook for integrating error prevention with heart beat monitoring
 */

import { useCallback, useEffect, useRef } from 'react';
import { 
  useErrorPrevention, 
  registerRecoveryAction,
  trackDiagnosticWithPrevention,
  validateSignalQuality,
  shouldProceedWithOperation
} from '@/utils/errorPrevention';
import { trackDeviceError, setCameraState, CameraState } from '@/utils/deviceErrorTracker';
import { 
  clearDiagnosticsData, 
  getDiagnosticsData 
} from '@/hooks/heart-beat/signal-processing/peak-detection';
import { 
  resetSignalQualityState 
} from '@/hooks/heart-beat/signal-processing/signal-quality';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';

/**
 * Hook that integrates error prevention with heart beat processing
 */
export function useHeartBeatErrorPrevention(
  heartBeatProcessor: any | null,
  signalProcessor: any | null,
  vitalSignsProcessor: any | null
) {
  const errorPrevention = useErrorPrevention({
    autoRecover: true,
    notifyOnRecovery: true
  });
  
  const isMonitoringRef = useRef<boolean>(false);
  const signalQualityHistoryRef = useRef<number[]>([]);
  const diagnosticsSyncedRef = useRef<boolean>(false);
  
  /**
   * Register processor-specific recovery actions
   */
  const registerRecoveryActions = useCallback(() => {
    // Reset heart beat processor
    registerRecoveryAction(
      'resetHeartBeatProcessor',
      'Reset heart beat processor and buffers',
      async () => {
        if (heartBeatProcessor) {
          try {
            heartBeatProcessor.reset();
            logError(
              'Heart beat processor reset successful',
              ErrorLevel.INFO,
              'HeartBeatRecovery'
            );
            return true;
          } catch (error) {
            logError(
              `Heart beat processor reset failed: ${error instanceof Error ? error.message : String(error)}`,
              ErrorLevel.ERROR,
              'HeartBeatRecovery'
            );
            return false;
          }
        }
        return false;
      }
    );
    
    // Reset signal processor
    registerRecoveryAction(
      'resetSignalProcessor',
      'Reset signal processor and quality tracking',
      async () => {
        try {
          if (signalProcessor) {
            signalProcessor.reset();
          }
          resetSignalQualityState();
          clearDiagnosticsData();
          signalQualityHistoryRef.current = [];
          
          logError(
            'Signal processor reset successful',
            ErrorLevel.INFO,
            'SignalProcessorRecovery'
          );
          return true;
        } catch (error) {
          logError(
            `Signal processor reset failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorLevel.ERROR,
            'SignalProcessorRecovery'
          );
          return false;
        }
      }
    );
    
    // Restart finger detection
    registerRecoveryAction(
      'restartFingerDetection',
      'Reset and recalibrate finger detection',
      async () => {
        try {
          unifiedFingerDetector.reset();
          
          // Force recalibration on next signal
          if (vitalSignsProcessor) {
            try {
              vitalSignsProcessor.reset();
            } catch (err) {
              // Just log, don't fail the whole recovery
              console.error('Error resetting vital signs processor:', err);
            }
          }
          
          logError(
            'Finger detection restart successful',
            ErrorLevel.INFO,
            'FingerDetectionRecovery'
          );
          return true;
        } catch (error) {
          logError(
            `Finger detection restart failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorLevel.ERROR,
            'FingerDetectionRecovery'
          );
          return false;
        }
      }
    );
    
    // Reset camera connection
    registerRecoveryAction(
      'resetCameraConnection',
      'Reset camera state and connection',
      async () => {
        try {
          // Reset camera state
          setCameraState(CameraState.INACTIVE);
          
          // Wait for state change to take effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Request camera again
          setCameraState(CameraState.REQUESTING);
          
          logError(
            'Camera connection reset successful',
            ErrorLevel.INFO,
            'CameraRecovery'
          );
          return true;
        } catch (error) {
          logError(
            `Camera connection reset failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorLevel.ERROR,
            'CameraRecovery'
          );
          return false;
        }
      }
    );
    
    // Full restart of monitoring
    registerRecoveryAction(
      'restartMonitoring',
      'Perform full restart of monitoring system',
      async () => {
        try {
          // Stop all processors
          if (heartBeatProcessor && isMonitoringRef.current) {
            heartBeatProcessor.stopMonitoring();
          }
          
          // Reset all components
          resetSignalQualityState();
          clearDiagnosticsData();
          unifiedFingerDetector.reset();
          signalQualityHistoryRef.current = [];
          
          if (vitalSignsProcessor) {
            try {
              vitalSignsProcessor.reset();
            } catch (err) {
              console.error('Error resetting vital signs processor:', err);
            }
          }
          
          // Delay to ensure everything is stopped
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Restart if was monitoring
          if (isMonitoringRef.current && heartBeatProcessor) {
            heartBeatProcessor.startMonitoring();
          }
          
          logError(
            'Full monitoring restart successful',
            ErrorLevel.INFO,
            'MonitoringRecovery'
          );
          return true;
        } catch (error) {
          logError(
            `Full monitoring restart failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorLevel.ERROR,
            'MonitoringRecovery'
          );
          return false;
        }
      }
    );
    
  }, [heartBeatProcessor, signalProcessor, vitalSignsProcessor]);
  
  /**
   * Initialize error prevention system
   */
  useEffect(() => {
    registerRecoveryActions();
    
    // Sync diagnostics data with prevention system
    const syncDiagnosticsInterval = setInterval(() => {
      if (!diagnosticsSyncedRef.current) {
        const diagnostics = getDiagnosticsData();
        
        if (diagnostics.length > 0) {
          // Take the last 5 diagnostics entries
          const recentDiagnostics = diagnostics.slice(-5);
          
          for (const diagnostic of recentDiagnostics) {
            trackDiagnosticWithPrevention({
              ...diagnostic,
              source: 'signal-processing'
            });
          }
          
          diagnosticsSyncedRef.current = true;
        }
      }
    }, 2000);
    
    return () => {
      clearInterval(syncDiagnosticsInterval);
    };
  }, [registerRecoveryActions]);
  
  /**
   * Track monitoring state changes
   */
  const setMonitoring = useCallback((isMonitoring: boolean) => {
    isMonitoringRef.current = isMonitoring;
    
    if (isMonitoring) {
      logError(
        'Heart beat monitoring started with error prevention',
        ErrorLevel.INFO,
        'HeartBeatErrorPrevention'
      );
      
      // Reset quality history
      signalQualityHistoryRef.current = [];
      diagnosticsSyncedRef.current = false;
    } else {
      logError(
        'Heart beat monitoring stopped',
        ErrorLevel.INFO,
        'HeartBeatErrorPrevention'
      );
    }
  }, []);
  
  /**
   * Report signal quality issues
   */
  const reportSignalQuality = useCallback((quality: number, amplitude: number) => {
    if (!isMonitoringRef.current) return;
    
    // Add to history
    signalQualityHistoryRef.current.push(quality);
    
    // Keep only recent entries
    if (signalQualityHistoryRef.current.length > 20) {
      signalQualityHistoryRef.current.shift();
    }
    
    // Validate signal quality with prevention system
    const validationResult = validateSignalQuality(
      quality, 
      amplitude,
      'HeartBeatSignal'
    );
    
    // Report only if not valid
    if (!validationResult.isValid) {
      trackDeviceError(
        `Signal quality issue: ${validationResult.reason}`,
        'signal-quality',
        'HeartBeatMonitor',
        { quality, amplitude, validationResult }
      );
      
      // Reset diagnostics synced flag to resync
      diagnosticsSyncedRef.current = false;
    }
  }, []);
  
  /**
   * Check if a signal processing operation should proceed
   */
  const shouldProcessSignal = useCallback((signalQuality: number): boolean => {
    // First check system health
    if (!shouldProceedWithOperation('normal')) {
      return false;
    }
    
    // If quality is very high, always proceed
    if (signalQuality > 70) {
      return true;
    }
    
    // Check history for consistent quality
    if (signalQualityHistoryRef.current.length >= 5) {
      // Calculate average quality
      const avgQuality = signalQualityHistoryRef.current.reduce(
        (sum, quality) => sum + quality, 0
      ) / signalQualityHistoryRef.current.length;
      
      // If average quality is decent, proceed
      if (avgQuality > 40) {
        return true;
      }
    }
    
    // Otherwise make decision based on current quality
    return signalQuality > 30;
  }, []);
  
  /**
   * Run specific recovery action
   */
  const runRecovery = useCallback(async (actionName: string) => {
    return await errorPrevention.runRecovery(actionName);
  }, [errorPrevention]);
  
  return {
    setMonitoring,
    reportSignalQuality,
    shouldProcessSignal,
    runRecovery,
    getDiagnostics: errorPrevention.getDiagnostics,
    getAvailableRecoveryActions: errorPrevention.getAvailableRecoveryActions,
    isMonitoring: () => isMonitoringRef.current
  };
}
