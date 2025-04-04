
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook unificado para procesamiento de señales
 * Consolida la funcionalidad de múltiples hooks manteniendo todas las características
 */

import { useRef, useCallback, useState } from 'react';
import { UnifiedVitalSignsProcessor } from '../modules/signal-processing/UnifiedVitalSignsProcessor';
import { UnifiedVitalSignsResult, RRIntervalAnalysis } from '../types/signal-processing';

/**
 * Hook para procesamiento de señales unificado
 * Versión simplificada centrada en SpO2
 */
export const useUnifiedSignalProcessing = () => {
  // Referencia al procesador
  const processorRef = useRef<UnifiedVitalSignsProcessor | null>(null);
  const processedSignals = useRef<number>(0);
  const signalLog = useRef<{timestamp: number, value: number, result: any}[]>([]);
  
  // Estado para seguimiento
  const [arrhythmiaCounter, setArrhythmiaCounter] = useState<number>(0);
  
  /**
   * Procesa una señal PPG y calcula signos vitales
   * Sin simulación o manipulación
   */
  const processSignal = useCallback((
    value: number, 
    rrData?: { intervals: number[], lastPeakTime: number | null },
    isWeakSignal: boolean = false
  ): UnifiedVitalSignsResult => {
    if (!processorRef.current) {
      console.log("useUnifiedSignalProcessing: Processor not initialized");
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          triglycerides: 0
        }
      };
    }
    
    processedSignals.current++;
    
    // Si la señal es débil, devolver ceros
    if (isWeakSignal) {
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          triglycerides: 0
        }
      };
    }
    
    // Logging para diagnósticos
    if (processedSignals.current % 45 === 0) {
      console.log("useUnifiedSignalProcessing: Processing signal DIRECTLY", {
        inputValue: value,
        rrDataPresent: !!rrData,
        rrIntervals: rrData?.intervals.length || 0,
        arrhythmiaCount: processorRef.current.getArrhythmiaCounter(),
        signalNumber: processedSignals.current
      });
    }
    
    // Procesar señal directamente - sin simulación
    const result = processorRef.current.processSignal(value, rrData as RRIntervalAnalysis);
    
    // Actualizar contador de arritmias
    setArrhythmiaCounter(processorRef.current.getArrhythmiaCounter());
    
    // Registrar para diagnósticos
    signalLog.current.push({
      timestamp: Date.now(),
      value,
      result
    });
    
    if (signalLog.current.length > 100) {
      signalLog.current.shift();
    }
    
    return result;
  }, []);

  /**
   * Inicializa el procesador
   */
  const initializeProcessor = useCallback(() => {
    console.log("useUnifiedSignalProcessing: Initializing processor");
    processorRef.current = new UnifiedVitalSignsProcessor();
    setArrhythmiaCounter(0);
  }, []);

  /**
   * Reinicia el procesador
   */
  const reset = useCallback(() => {
    if (!processorRef.current) return null;
    
    console.log("useUnifiedSignalProcessing: Reset initiated");
    
    const result = processorRef.current.reset();
    setArrhythmiaCounter(0);
    
    console.log("useUnifiedSignalProcessing: Reset completed");
    return result;
  }, []);
  
  /**
   * Reinicio completo - limpia todos los datos
   */
  const fullReset = useCallback(() => {
    if (!processorRef.current) return;
    
    console.log("useUnifiedSignalProcessing: Full reset initiated");
    
    processorRef.current.fullReset();
    processedSignals.current = 0;
    signalLog.current = [];
    setArrhythmiaCounter(0);
    
    console.log("useUnifiedSignalProcessing: Full reset complete");
  }, []);

  /**
   * Obtiene el contador de arritmias
   */
  const getArrhythmiaCounter = useCallback(() => {
    return processorRef.current?.getArrhythmiaCounter() || 0;
  }, []);

  /**
   * Obtiene información de depuración
   */
  const getDebugInfo = useCallback(() => {
    return {
      processedSignals: processedSignals.current,
      signalLog: signalLog.current.slice(-10)
    };
  }, []);

  return {
    processSignal,
    initializeProcessor,
    reset,
    fullReset,
    getArrhythmiaCounter,
    getDebugInfo,
    arrhythmiaCounter,
    processorRef,
    processedSignals,
    signalLog
  };
};
