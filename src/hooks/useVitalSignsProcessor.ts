import { useState, useCallback, useRef } from 'react';
import { VitalSignsProcessor, VitalSignsProcessorParams } from '../modules/VitalSignsProcessor';
import { VitalSignsResult, RRIntervalData } from '../types/vital-signs';

export function useVitalSignsProcessor() {
  const processorRef = useRef<VitalSignsProcessor | null>(null);
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  const signalHistoryRef = useRef<number[]>([]);
  const lastResetTimeRef = useRef<number>(Date.now());
  
  // Initialize processor
  const initializeProcessor = useCallback(() => {
    console.log("VitalSignsProcessor: Initializing new instance with direct measurement only");
    processorRef.current = new VitalSignsProcessor();
    console.log("VitalSignsProcessor initialized with diagnostics channel and anti-simulation protection");
    
    signalHistoryRef.current = [];
    lastResetTimeRef.current = Date.now();
    
    return processorRef.current;
  }, []);
  
  // Process signal and get vital signs result
  const processSignal = useCallback((value: number, rrData?: RRIntervalData): VitalSignsResult => {
    // Create or get processor
    if (!processorRef.current) {
      initializeProcessor();
    }
    
    const processor = processorRef.current!;
    
    // Add value to history
    signalHistoryRef.current.push(value);
    if (signalHistoryRef.current.length > 100) {
      signalHistoryRef.current.shift();
    }
    
    // Ensure we have enough data
    if (signalHistoryRef.current.length < 5) {
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--"
      };
    }
    
    try {
      // Process the signal
      const params: VitalSignsProcessorParams = {
        value,
        rrData
      };
      
      const result = processor.processSignal(params);
      
      // Store last valid results
      if (result.spo2 > 0) {
        setLastValidResults(result);
      }
      
      return result;
    } catch (error) {
      console.error("Error processing vital signs:", error);
      
      // Return default values on error
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "--"
      };
    }
  }, [initializeProcessor]);
  
  // Reset the processor but keep last valid results
  const reset = useCallback((): VitalSignsResult => {
    if (processorRef.current) {
      const result = processorRef.current.reset();
      return result;
    }
    
    // Return empty result if no processor
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--"
    };
  }, []);
  
  // Full reset including last valid results
  const fullReset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.fullReset();
    }
    
    setLastValidResults(null);
    signalHistoryRef.current = [];
    lastResetTimeRef.current = Date.now();
  }, []);
  
  return {
    processSignal,
    reset,
    fullReset,
    initializeProcessor,
    lastValidResults
  };
}
