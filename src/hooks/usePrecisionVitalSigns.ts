
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para procesamiento de signos vitales con precisión mejorada
 * Integra calibración, validación cruzada y ajustes ambientales
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { PrecisionVitalSignsProcessor, PrecisionVitalSignsResult } from '../modules/vital-signs/PrecisionVitalSignsProcessor';
import { CalibrationReference } from '../modules/vital-signs/calibration/CalibrationManager';
import { useSignalProcessing } from './useSignalProcessing';
import type { ProcessedSignal } from '../types/signal';
import type { ProcessedPPGSignal } from '../modules/signal-processing/types';
import { TypeScriptWatchdog } from '../modules/guardian-shield/typescript-watchdog';
import { errorRecovery, RecoveryStrategy } from '../modules/guardian-shield/error-recovery-service';
import { logDiagnostics } from '../modules/signal-processing/diagnostics';

/**
 * Estado del hook de signos vitales de precisión
 */
export interface PrecisionVitalSignsState {
  isProcessing: boolean;
  isCalibrated: boolean;
  lastResult: PrecisionVitalSignsResult | null;
  calibrationStatus: {
    hasReference: boolean;
    confidence: number;
  };
  environmentalStatus: {
    lightDetected: number;
    motionDetected: number;
  };
  errorStatus?: {
    hasError: boolean;
    lastErrorTime: number | null;
    errorCount: number;
    recoverySuccessCount: number;
  };
}

/**
 * Hook para gestionar signos vitales con precisión mejorada
 */
export function usePrecisionVitalSigns() {
  // Inicializar procesador
  const processorRef = useRef<PrecisionVitalSignsProcessor | null>(null);
  const signalProcessing = useSignalProcessing();
  
  // Error tracking
  const errorCountRef = useRef<number>(0);
  const recoveryCountRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number | null>(null);
  
  // Estado local
  const [state, setState] = useState<PrecisionVitalSignsState>({
    isProcessing: false,
    isCalibrated: false,
    lastResult: null,
    calibrationStatus: {
      hasReference: false,
      confidence: 0
    },
    environmentalStatus: {
      lightDetected: 50,
      motionDetected: 0
    },
    errorStatus: {
      hasError: false,
      lastErrorTime: null,
      errorCount: 0,
      recoverySuccessCount: 0
    }
  });
  
  // Inicializar procesador
  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = new PrecisionVitalSignsProcessor();
      console.log("usePrecisionVitalSigns: Procesador inicializado");
      
      // Register default ProcessedSignal for error recovery
      errorRecovery.registerDefaultValue('ProcessedSignal', {
        timestamp: Date.now(),
        rawValue: 0,
        filteredValue: 0,
        quality: 0,
        fingerDetected: false,
        roi: { x: 0, y: 0, width: 100, height: 100 }
      });
    }
    
    return () => {
      if (processorRef.current) {
        processorRef.current.stop();
        processorRef.current = null;
      }
    };
  }, []);
  
  // Iniciar procesamiento
  const startProcessing = useCallback(() => {
    if (!processorRef.current) return;
    
    try {
      processorRef.current.start();
      signalProcessing.startProcessing();
      
      setState(prev => ({
        ...prev,
        isProcessing: true
      }));
      
      console.log("usePrecisionVitalSigns: Procesamiento iniciado");
    } catch (error) {
      console.error("Error al iniciar el procesamiento:", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error starting processing',
        'error',
        { error: String(error) }
      );
    }
  }, [signalProcessing]);
  
  // Detener procesamiento
  const stopProcessing = useCallback(() => {
    if (!processorRef.current) return;
    
    try {
      processorRef.current.stop();
      signalProcessing.stopProcessing();
      
      setState(prev => ({
        ...prev,
        isProcessing: false
      }));
      
      console.log("usePrecisionVitalSigns: Procesamiento detenido");
    } catch (error) {
      console.error("Error al detener el procesamiento:", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error stopping processing',
        'error',
        { error: String(error) }
      );
    }
  }, [signalProcessing]);
  
  // Procesar señal con manejo de errores mejorado
  const processSignal = useCallback((signal: ProcessedSignal): PrecisionVitalSignsResult | null => {
    if (!processorRef.current || !state.isProcessing) {
      return null;
    }
    
    try {
      // Validate and correct signal structure
      const correctedSignal = TypeScriptWatchdog.correctProcessedSignal(signal);
      
      if (correctedSignal.corrected) {
        // Log corrections if needed
        if (correctedSignal.appliedCorrections.length > 0) {
          logDiagnostics(
            'precision-vitals-hook',
            'Signal structure corrected',
            'info',
            { corrections: correctedSignal.appliedCorrections }
          );
        }
        
        // Use corrected signal
        signal = correctedSignal.correctedValue;
      }
      
      // Convert ProcessedSignal to ProcessedPPGSignal for the PrecisionVitalSignsProcessor
      const ppgSignal: ProcessedPPGSignal = {
        timestamp: signal.timestamp,
        rawValue: signal.rawValue,
        filteredValue: signal.filteredValue,
        normalizedValue: signal.filteredValue, // Use filteredValue as normalizedValue
        amplifiedValue: signal.filteredValue * 1.2, // Apply a simple amplification
        quality: signal.quality,
        fingerDetected: signal.fingerDetected,
        signalStrength: signal.quality // Use quality as signal strength
      };
      
      // Register good signal for recovery
      errorRecovery.registerGoodValue('processSignal', 'ProcessedPPGSignal', ppgSignal);
      
      // Procesar señal con precisión mejorada
      const result = processorRef.current.processSignal(ppgSignal);
      
      // Actualizar estado con el resultado
      setState(prev => ({
        ...prev,
        lastResult: result,
        isCalibrated: result.isCalibrated,
        calibrationStatus: {
          hasReference: result.isCalibrated,
          confidence: result.precisionMetrics.calibrationConfidence || 0
        },
        environmentalStatus: {
          lightDetected: processorRef.current?.getDiagnostics()?.environmentalConditions?.lightLevel || 50,
          motionDetected: processorRef.current?.getDiagnostics()?.environmentalConditions?.motionLevel || 0
        },
        errorStatus: {
          hasError: false,
          lastErrorTime: lastErrorTimeRef.current,
          errorCount: errorCountRef.current,
          recoverySuccessCount: recoveryCountRef.current
        }
      }));
      
      return result;
    } catch (error) {
      // Update error tracking
      errorCountRef.current++;
      lastErrorTimeRef.current = Date.now();
      
      // Log error
      console.error("usePrecisionVitalSigns: Error procesando señal", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error processing signal',
        'error',
        { 
          error: String(error),
          signalQuality: signal.quality,
          fingerDetected: signal.fingerDetected
        }
      );
      
      // Try to recover
      const recoveryResult = errorRecovery.handleError(
        error instanceof Error ? error : {
          code: 'SIGNAL_PROCESSING_ERROR',
          message: String(error),
          timestamp: Date.now(),
          severity: 'high',
          recoverable: true,
          component: 'usePrecisionVitalSigns'
        },
        'usePrecisionVitalSigns',
        'PrecisionVitalSignsResult',
        {
          context: { signal },
          preferredStrategy: RecoveryStrategy.USE_LAST_GOOD_VALUE
        }
      );
      
      // Update state with error status
      setState(prev => ({
        ...prev,
        errorStatus: {
          hasError: true,
          lastErrorTime: lastErrorTimeRef.current,
          errorCount: errorCountRef.current,
          recoverySuccessCount: recoveryCountRef.current
        }
      }));
      
      if (recoveryResult.successful) {
        // Increment recovery count
        recoveryCountRef.current++;
        return recoveryResult.resultValue;
      }
      
      return null;
    }
  }, [state.isProcessing]);
  
  // Escuchar cambios en la señal procesada
  useEffect(() => {
    if (!state.isProcessing || !signalProcessing.fingerDetected) {
      return;
    }
    
    // Crear objeto de señal procesada completo
    const processedSignal: ProcessedSignal = {
      timestamp: Date.now(),
      rawValue: signalProcessing.lastResult?.rawValue || 0,
      filteredValue: signalProcessing.lastResult?.filteredValue || 0,
      quality: signalProcessing.signalQuality,
      fingerDetected: signalProcessing.fingerDetected,
      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      }
    };
    
    // Procesar señal
    processSignal(processedSignal);
    
  }, [
    state.isProcessing,
    signalProcessing.lastResult,
    signalProcessing.fingerDetected,
    signalProcessing.signalQuality,
    processSignal
  ]);
  
  // Agregar datos de referencia para calibración
  const addCalibrationReference = useCallback((reference: CalibrationReference): boolean => {
    if (!processorRef.current) return false;
    
    try {
      // Validate reference
      if (!reference || typeof reference !== 'object') {
        throw new Error("Invalid calibration reference");
      }
      
      const success = processorRef.current.addCalibrationReference(reference);
      
      if (success) {
        // Actualizar estado de calibración
        setState(prev => ({
          ...prev,
          isCalibrated: processorRef.current?.isCalibrated ? processorRef.current.isCalibrated() : false,
          calibrationStatus: {
            hasReference: true,
            confidence: processorRef.current?.getDiagnostics()?.calibrationFactors?.confidence || 0
          }
        }));
      }
      
      return success;
    } catch (error) {
      console.error("Error adding calibration reference:", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error adding calibration reference',
        'error',
        { error: String(error) }
      );
      
      return false;
    }
  }, []);
  
  // Actualizar condiciones ambientales
  const updateEnvironment = useCallback((deviceLight: number, deviceMotion: number = 0) => {
    if (!processorRef.current) return;
    
    try {
      // Validate inputs
      const lightLevel = Number(deviceLight) || 0;
      const motionLevel = Number(deviceMotion) || 0;
      
      processorRef.current.updateEnvironmentalConditions({
        lightLevel,
        motionLevel
      });
      
      setState(prev => ({
        ...prev,
        environmentalStatus: {
          lightDetected: lightLevel,
          motionDetected: motionLevel
        }
      }));
    } catch (error) {
      console.error("Error updating environment:", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error updating environmental conditions',
        'error',
        { error: String(error) }
      );
    }
  }, []);
  
  // Resetear estado
  const reset = useCallback(() => {
    if (!processorRef.current) return;
    
    try {
      processorRef.current.reset();
      
      // Use stopProcessing instead of directly accessing reset method on signalProcessing
      stopProcessing();
      
      // Reset error tracking
      errorCountRef.current = 0;
      recoveryCountRef.current = 0;
      lastErrorTimeRef.current = null;
      
      setState({
        isProcessing: false,
        isCalibrated: processorRef.current.isCalibrated(),
        lastResult: null,
        calibrationStatus: {
          hasReference: processorRef.current.isCalibrated(),
          confidence: processorRef.current.getDiagnostics().calibrationFactors.confidence
        },
        environmentalStatus: {
          lightDetected: 50,
          motionDetected: 0
        },
        errorStatus: {
          hasError: false,
          lastErrorTime: null,
          errorCount: 0,
          recoverySuccessCount: 0
        }
      });
      
      console.log("usePrecisionVitalSigns: Estado reiniciado");
    } catch (error) {
      console.error("Error resetting state:", error);
      
      // Log to diagnostics
      logDiagnostics(
        'precision-vitals-hook',
        'Error resetting state',
        'error',
        { error: String(error) }
      );
    }
  }, [stopProcessing]);
  
  // Obtener diagnósticos
  const getDiagnostics = useCallback(() => {
    if (!processorRef.current) return null;
    
    try {
      const processorDiagnostics = processorRef.current.getDiagnostics();
      
      // Add error handling stats
      return {
        ...processorDiagnostics,
        errorHandling: {
          hookErrorCount: errorCountRef.current,
          hookRecoveryCount: recoveryCountRef.current,
          lastErrorTime: lastErrorTimeRef.current,
          recoverySuccessRate: errorCountRef.current > 0 
            ? (recoveryCountRef.current / errorCountRef.current) * 100
            : 100
        },
        typescriptWatchdogStats: TypeScriptWatchdog.getErrorStats(),
        errorRecoveryStats: errorRecovery.getErrorStats()
      };
    } catch (error) {
      console.error("Error getting diagnostics:", error);
      return null;
    }
  }, []);
  
  // Return hook state and methods
  return {
    ...state,
    startProcessing,
    stopProcessing,
    processSignal,
    addCalibrationReference,
    updateEnvironment,
    reset,
    getDiagnostics,
    signalQuality: signalProcessing.signalQuality,
    fingerDetected: signalProcessing.fingerDetected,
    heartRate: signalProcessing.heartRate,
    // Add error handling utilities
    errorHandling: {
      getErrorStats: TypeScriptWatchdog.getErrorStats,
      getRecoveryStats: errorRecovery.getErrorStats,
      resetErrorStats: () => {
        TypeScriptWatchdog.resetErrorStats();
        errorRecovery.resetErrorTracking();
        errorCountRef.current = 0;
        recoveryCountRef.current = 0;
        lastErrorTimeRef.current = null;
      }
    }
  };
}
