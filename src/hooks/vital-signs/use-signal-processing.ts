
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useRef, useCallback } from 'react';
import { VitalSignsResult } from '../../modules/vital-signs/types/vital-signs-result';
import { VitalSignsProcessor } from '../../modules/vital-signs/VitalSignsProcessor';

/**
 * Hook for processing signal using the VitalSignsProcessor
 * Direct measurement only, no simulation
 */
export const useSignalProcessing = () => {
  // Reference for processor instance
  const processorRef = useRef<VitalSignsProcessor | null>(null);
  const processedSignals = useRef<number>(0);
  const signalLog = useRef<{timestamp: number, value: number, result: any}[]>([]);
  
  /**
   * Process PPG signal directly
   * No simulation or reference values
   */
  const processSignal = useCallback((
    value: number, 
    rrData?: { intervals: number[], lastPeakTime: number | null },
    isWeakSignal: boolean = false
  ): VitalSignsResult => {
    if (!processorRef.current) {
      console.log("useVitalSignsProcessor: Processor not initialized");
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          hydration: 0 // Changed from triglycerides to hydration
        }
      };
    }
    
    processedSignals.current++;
    
    // If too many weak signals, return zeros
    if (isWeakSignal) {
      console.log("useSignalProcessing: Weak signal detected, returning zeros", { value });
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          hydration: 0
        }
      };
    }
    
    // Logging for diagnostics
    if (processedSignals.current % 30 === 0 || processedSignals.current < 10) {
      console.log("useSignalProcessing: Processing signal DIRECTLY", {
        inputValue: value,
        rrDataPresent: !!rrData,
        rrIntervals: rrData?.intervals.length || 0,
        arrhythmiaCount: processorRef.current.getArrhythmiaCounter(),
        signalNumber: processedSignals.current,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process signal directly - no simulation
    let result = processorRef.current.processSignal(value, rrData);
    
    // Log the processed result
    signalLog.current.push({
      timestamp: Date.now(),
      value: value,
      result: {
        spo2: result.spo2,
        pressure: result.pressure,
        glucose: result.glucose,
        cholesterol: result.lipids.totalCholesterol,
        hydration: result.lipids.hydration
      }
    });
    
    // Keep only recent logs
    if (signalLog.current.length > 100) {
      signalLog.current.splice(0, signalLog.current.length - 100);
    }
    
    // Log output when values are present
    if (result.spo2 > 0 || result.glucose > 0 || result.lipids.totalCholesterol > 0) {
      console.log("useSignalProcessing: Successful vital sign measurement:", {
        spo2: result.spo2,
        pressure: result.pressure,
        glucose: result.glucose,
        cholesterol: result.lipids.totalCholesterol,
        hydration: result.lipids.hydration,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }, []);

  /**
   * Initialize the processor
   * Direct measurement only
   */
  const initializeProcessor = useCallback(() => {
    console.log("useVitalSignsProcessor: Initializing processor for DIRECT MEASUREMENT ONLY", {
      timestamp: new Date().toISOString()
    });
    
    // Create new instances for direct measurement
    processorRef.current = new VitalSignsProcessor();
    
    // Reset counters
    processedSignals.current = 0;
    signalLog.current = [];
    
    console.log("useSignalProcessing: Processor initialized successfully");
    
    return processorRef.current;
  }, []);

  /**
   * Reset the processor
   * No simulations or reference values
   */
  const reset = useCallback(() => {
    if (!processorRef.current) return null;
    
    console.log("useVitalSignsProcessor: Reset initiated - DIRECT MEASUREMENT mode only");
    
    processorRef.current.reset();
    
    console.log("useVitalSignsProcessor: Reset completed - all values at zero for direct measurement");
    return null;
  }, []);
  
  /**
   * Perform full reset - clear all data
   * No simulations or reference values
   */
  const fullReset = useCallback(() => {
    if (!processorRef.current) return;
    
    console.log("useVitalSignsProcessor: Full reset initiated - DIRECT MEASUREMENT mode only");
    
    processorRef.current.fullReset();
    processedSignals.current = 0;
    signalLog.current = [];
    
    console.log("useVitalSignsProcessor: Full reset complete - direct measurement mode active");
  }, []);

  /**
   * Get the arrhythmia counter
   */
  const getArrhythmiaCounter = useCallback(() => {
    return processorRef.current?.getArrhythmiaCounter() || 0;
  }, []);

  /**
   * Get debug information about signal processing
   */
  const getDebugInfo = useCallback(() => {
    return {
      processedSignals: processedSignals.current,
      signalLog: signalLog.current.slice(-10),
      processorInitialized: !!processorRef.current,
      timestamp: new Date().toISOString()
    };
  }, []);

  return {
    processSignal,
    initializeProcessor,
    reset,
    fullReset,
    getArrhythmiaCounter,
    getDebugInfo,
    processorRef,
    processedSignals,
    signalLog
  };
};
