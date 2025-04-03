
import { useState, useRef, useCallback } from 'react';
import { VitalSignsProcessor, VitalSignsResult } from '@/modules/vital-signs/VitalSignsProcessor';
import { RRIntervalData } from '@/types/heart-rate';
import { DiagnosticsData } from '@/types/diagnostics';

export function useVitalSignsProcessor() {
  const [processor] = useState(() => new VitalSignsProcessor());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResults, setLastResults] = useState<VitalSignsResult | null>(null);
  const calibrationTimerRef = useRef<any>(null);
  const processingCountRef = useRef(0);
  
  const initializeProcessor = useCallback(() => {
    console.log("useVitalSignsProcessor: Inicializando");
    setIsProcessing(true);
    processingCountRef.current = 0;
  }, []);
  
  const reset = useCallback(() => {
    console.log("useVitalSignsProcessor: Reset");
    processor.reset();
    
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }
    
    return processor.getLastValidResults();
  }, [processor]);
  
  const fullReset = useCallback(() => {
    console.log("useVitalSignsProcessor: Full Reset");
    processor.fullReset();
    setLastResults(null);
    
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }
  }, [processor]);
  
  const processSignal = useCallback(
    (value: number, rrData?: RRIntervalData): VitalSignsResult | null => {
      if (!isProcessing) return null;
      
      processingCountRef.current++;
      
      try {
        const results = processor.processSignal({ value, rrData });
        setLastResults(results);
        return results;
      } catch (err) {
        console.error("Error procesando señal para signos vitales:", err);
        return null;
      }
    },
    [isProcessing, processor]
  );
  
  const getArrhythmiaCount = useCallback(() => {
    return processor.getArrhythmiaCounter();
  }, [processor]);
  
  const getLastResults = useCallback((): VitalSignsResult | null => {
    return lastResults || processor.getLastValidResults();
  }, [lastResults, processor]);
  
  const getPeakDetectionDiagnostics = useCallback((): DiagnosticsData[] => {
    // Implementación básica
    return [];
  }, []);
  
  return {
    isProcessing,
    processSignal,
    reset,
    fullReset,
    initializeProcessor,
    getArrhythmiaCount,
    getLastResults,
    getPeakDetectionDiagnostics
  };
}
