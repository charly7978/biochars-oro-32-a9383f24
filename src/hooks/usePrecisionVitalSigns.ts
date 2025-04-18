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
}

/**
 * Hook para gestionar signos vitales con precisión mejorada
 */
export function usePrecisionVitalSigns() {
  // Inicializar procesador
  const processorRef = useRef<PrecisionVitalSignsProcessor | null>(null);
  const signalProcessing = useSignalProcessing();
  
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
    }
  });
  
  // Inicializar procesador
  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = new PrecisionVitalSignsProcessor();
      console.log("usePrecisionVitalSigns: Procesador inicializado");
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
    
    processorRef.current.start();
    signalProcessing.startProcessing();
    
    setState(prev => ({
      ...prev,
      isProcessing: true
    }));
    
    console.log("usePrecisionVitalSigns: Procesamiento iniciado");
  }, [signalProcessing]);
  
  // Detener procesamiento
  const stopProcessing = useCallback(() => {
    if (!processorRef.current) return;
    
    processorRef.current.stop();
    signalProcessing.stopProcessing();
    
    setState(prev => ({
      ...prev,
      isProcessing: false
    }));
    
    console.log("usePrecisionVitalSigns: Procesamiento detenido");
  }, [signalProcessing]);
  
  // Procesar señal
  const processSignal = useCallback((signal: ProcessedSignal): PrecisionVitalSignsResult | null => {
    if (!processorRef.current || !state.isProcessing) {
      return null;
    }
    
    try {
      // Procesar señal con precisión mejorada
      const result = processorRef.current.processSignal(signal);
      
      // Actualizar estado con el resultado
      setState(prev => ({
        ...prev,
        lastResult: result,
        isCalibrated: result.isCalibrated,
        calibrationStatus: {
          hasReference: result.isCalibrated,
          confidence: result.precisionMetrics.calibrationConfidence
        },
        environmentalStatus: {
          lightDetected: processorRef.current?.getDiagnostics().environmentalConditions.lightLevel || 50,
          motionDetected: processorRef.current?.getDiagnostics().environmentalConditions.motionLevel || 0
        }
      }));
      
      return result;
    } catch (error) {
      console.error("usePrecisionVitalSigns: Error procesando señal", error);
      return null;
    }
  }, [state.isProcessing]);
  
  // Escuchar cambios en la señal procesada
  useEffect(() => {
    if (!state.isProcessing || !signalProcessing.fingerDetected) {
      return;
    }
    
    // Crear objeto de señal procesada - fix missing properties
    const processedSignal: ProcessedSignal = {
      timestamp: Date.now(),
      rawValue: signalProcessing.rawValue || 0,
      filteredValue: signalProcessing.rawValue || 0, // Use rawValue as fallback
      quality: signalProcessing.signalQuality,
      fingerDetected: signalProcessing.fingerDetected,
      perfusionIndex: 0,
      roi: { x: 0, y: 0, width: 0, height: 0 }
    };
    
    // Procesar señal
    processSignal(processedSignal);
    
  }, [
    state.isProcessing,
    signalProcessing.rawValue, // Changed from filteredValue to rawValue
    signalProcessing.fingerDetected,
    signalProcessing.signalQuality,
    processSignal
  ]);

  // Agregar datos de referencia para calibración
  const addCalibrationReference = useCallback((reference: CalibrationReference): boolean => {
    if (!processorRef.current) return false;
    
    const success = processorRef.current.addCalibrationReference(reference);
    
    if (success) {
      // Actualizar estado de calibración
      setState(prev => ({
        ...prev,
        isCalibrated: processorRef.current?.isCalibrated() || false,
        calibrationStatus: {
          hasReference: true,
          confidence: processorRef.current?.getDiagnostics().calibrationFactors.confidence || 0
        }
      }));
    }
    
    return success;
  }, []);
  
  // Actualizar condiciones ambientales
  const updateEnvironment = useCallback((deviceLight: number, deviceMotion: number = 0) => {
    if (!processorRef.current) return;
    
    processorRef.current.updateEnvironmentalConditions({
      lightLevel: deviceLight,
      motionLevel: deviceMotion
    });
    
    setState(prev => ({
      ...prev,
      environmentalStatus: {
        lightDetected: deviceLight,
        motionDetected: deviceMotion
      }
    }));
    
  }, []);
  
  // Resetear estado
  const reset = useCallback(() => {
    if (!processorRef.current) return;
    
    processorRef.current.reset();
    
    // Check if reset exists on signalProcessing before calling it
    if (typeof signalProcessing.reset === 'function') {
      signalProcessing.reset();
    } else {
      // Fallback for when reset doesn't exist
      if (typeof signalProcessing.stopProcessing === 'function') {
        signalProcessing.stopProcessing();
      }
    }
    
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
      }
    });
    
    console.log("usePrecisionVitalSigns: Estado reiniciado");
  }, [signalProcessing]);
  
  // Obtener diagnósticos
  const getDiagnostics = useCallback(() => {
    if (!processorRef.current) return null;
    
    return processorRef.current.getDiagnostics();
  }, []);
  
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
    heartRate: signalProcessing.heartRate
  };
}
