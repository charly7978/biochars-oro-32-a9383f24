
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Integration of vital signs processing with error prevention system
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVitalSignsWithProcessing } from './useVitalSignsWithProcessing';
import { useHeartBeatErrorPrevention } from './heart-beat/useHeartBeatErrorPrevention';
import { trackDeviceError } from '@/utils/errorPrevention/monitor';
import { useErrorPrevention } from '@/utils/errorPrevention/integration';
import { trackDiagnosticWithPrevention, safeExecute } from '@/utils/errorPrevention/utils';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Hook that integrates vital signs processing with error prevention
 */
export function useVitalSignsWithErrorPrevention() {
  // Original processing hook
  const vitalSignsProcessor = useVitalSignsWithProcessing();
  
  // Error prevention
  const errorPrevention = useErrorPrevention();
  
  // Heart beat specific error prevention
  const heartBeatErrorPrevention = useHeartBeatErrorPrevention(
    null, // We'll connect these later when available
    null,
    null
  );
  
  // Processing states
  const [isProcessingProtected, setIsProcessingProtected] = useState<boolean>(false);
  const processingErrorsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const recoveryAttemptedRef = useRef<boolean>(false);
  
  /**
   * Safe wrapper for processing frames
   */
  const processFrameSafely = useCallback((imageData: ImageData) => {
    if (!vitalSignsProcessor.isMonitoring) return;
    
    const now = Date.now();
    const timeSinceLastFrame = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : null;
    lastFrameTimeRef.current = now;
    
    // Track abnormal intervals
    if (timeSinceLastFrame !== null && timeSinceLastFrame > 500) {
      trackDeviceError(
        `Abnormal frame interval: ${timeSinceLastFrame}ms`, 
        'processing-timing',
        'VitalSignsProcessor'
      );
    }
    
    try {
      // Process frame safely
      safeExecute(
        () => vitalSignsProcessor.processFrame(imageData),
        (error) => {
          processingErrorsRef.current++;
          consecutiveErrorsRef.current++;
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          trackDeviceError(
            `Error processing frame: ${errorMessage}`,
            'frame-processing',
            'VitalSignsProcessor',
            { consecutiveErrors: consecutiveErrorsRef.current }
          );
          
          // After multiple consecutive errors, try recovery
          if (consecutiveErrorsRef.current > 5 && !recoveryAttemptedRef.current) {
            recoveryAttemptedRef.current = true;
            errorPrevention.runRecovery('VitalSignsProcessor:resetSignalProcessor').finally(() => {
              // Reset flag after a cooldown period
              setTimeout(() => {
                recoveryAttemptedRef.current = false;
              }, 10000);
            });
          }
        },
        'VitalSignsProcessor',
        'processFrame'
      );
      
      // Reset consecutive errors on success
      if (consecutiveErrorsRef.current > 0) {
        consecutiveErrorsRef.current = 0;
      }
      
      // Track diagnostic data
      if (vitalSignsProcessor.lastResult) {
        trackDiagnosticWithPrevention({
          timestamp: now,
          processTime: 0,
          signalStrength: Math.abs(vitalSignsProcessor.lastResult.rawValue || 0),
          processorLoad: 0,
          dataPointsProcessed: 1,
          peakDetectionConfidence: vitalSignsProcessor.lastResult.heartRate > 0 ? 0.7 : 0.1,
          processingPriority: 'medium',
          source: 'vital-signs-processor'
        });
        
        // Update heart beat error prevention with signal quality
        if (vitalSignsProcessor.signalQuality !== undefined) {
          heartBeatErrorPrevention.reportSignalQuality(
            vitalSignsProcessor.signalQuality,
            Math.abs(vitalSignsProcessor.lastResult.rawValue || 0)
          );
        }
      }
      
    } catch (error) {
      // This is a fallback since safeExecute should catch errors inside processFrame
      logError(
        `Uncaught frame processing error: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        'VitalSignsProcessor'
      );
    }
  }, [
    vitalSignsProcessor, 
    errorPrevention, 
    heartBeatErrorPrevention
  ]);
  
  /**
   * Start monitoring with error prevention
   */
  const startMonitoringSafely = useCallback(() => {
    // Reset tracking variables
    processingErrorsRef.current = 0;
    consecutiveErrorsRef.current = 0;
    lastFrameTimeRef.current = null;
    recoveryAttemptedRef.current = false;
    
    // Notify heart beat error prevention
    heartBeatErrorPrevention.setMonitoring(true);
    
    // Start actual monitoring
    vitalSignsProcessor.startMonitoring();
    setIsProcessingProtected(true);
  }, [vitalSignsProcessor, heartBeatErrorPrevention]);
  
  /**
   * Stop monitoring with cleanup
   */
  const stopMonitoringSafely = useCallback(() => {
    // Notify heart beat error prevention
    heartBeatErrorPrevention.setMonitoring(false);
    
    // Stop actual monitoring
    vitalSignsProcessor.stopMonitoring();
    setIsProcessingProtected(false);
  }, [vitalSignsProcessor, heartBeatErrorPrevention]);
  
  /**
   * Reset everything with error prevention
   */
  const resetSafely = useCallback(() => {
    // Log reset
    logError(
      "Resetting vital signs processor with error prevention",
      ErrorLevel.INFO,
      "VitalSignsProcessor"
    );
    
    // Perform reset operations safely
    stopMonitoringSafely();
    vitalSignsProcessor.reset();
    
    // Reset tracking variables
    processingErrorsRef.current = 0;
    consecutiveErrorsRef.current = 0;
    lastFrameTimeRef.current = null;
    recoveryAttemptedRef.current = false;
    
    return {
      success: true
    };
  }, [vitalSignsProcessor, stopMonitoringSafely]);
  
  /**
   * Connect processors to heart beat error prevention
   */
  useEffect(() => {
    // Register recovery actions
    errorPrevention.registerError(
      "Registering vital signs recovery actions",
      "VitalSignsProcessor",
      undefined,
      ErrorLevel.INFO,
      false
    );
    
    // Initialize connection between components
    heartBeatErrorPrevention.setMonitoring(vitalSignsProcessor.isMonitoring);
  }, [errorPrevention, vitalSignsProcessor, heartBeatErrorPrevention]);
  
  // Register recovery actions for this component
  useEffect(() => {
    // Here we would register recovery actions, but we'll just use the implementation
    // from the useErrorPrevention hook for now
  }, []);
  
  return {
    // Original vital signs processor properties
    ...vitalSignsProcessor,
    
    // Override with protected methods
    processFrame: processFrameSafely,
    startMonitoring: startMonitoringSafely,
    stopMonitoring: stopMonitoringSafely,
    reset: resetSafely,
    
    // Additional properties
    isProcessingProtected,
    errorPrevention,
    runErrorRecovery: errorPrevention.runRecovery,
    processingErrors: processingErrorsRef.current,
    
    // Expose underlying processor reference (for integration)
    getUnderlyingProcessor: () => vitalSignsProcessor
  };
}
