
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useState, useRef, useCallback } from 'react';
import { VitalSignsProcessor, VitalSignsResult } from '../modules/vital-signs';
import { HybridVitalSignsProcessor } from '../modules/vital-signs';
import { HybridProcessingOptions } from '../modules/vital-signs';

/**
 * Hook for using the hybrid vital signs processor
 */
export function useHybridVitalSignsProcessor(options?: HybridProcessingOptions) {
  const processorRef = useRef<HybridVitalSignsProcessor | null>(null);
  const [lastResult, setLastResult] = useState<VitalSignsResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  /**
   * Initialize the processor if not already initialized
   */
  const ensureInitialized = useCallback(() => {
    if (!processorRef.current) {
      processorRef.current = new HybridVitalSignsProcessor(options);
      console.log("HybridVitalSignsProcessor initialized");
    }
    return processorRef.current;
  }, [options]);
  
  /**
   * Process a signal value
   */
  const processSignal = useCallback(async (value: number, rrData?: any): Promise<VitalSignsResult | null> => {
    const processor = ensureInitialized();
    
    try {
      const result = await processor.process(value, rrData);
      setLastResult(result);
      return result;
    } catch (error) {
      console.error("Error processing signal:", error);
      return null;
    }
  }, [ensureInitialized]);
  
  /**
   * Start processing
   */
  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    console.log("HybridVitalSignsProcessor: Started processing");
  }, []);
  
  /**
   * Stop processing
   */
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    console.log("HybridVitalSignsProcessor: Stopped processing");
  }, []);
  
  /**
   * Reset processor
   */
  const reset = useCallback(() => {
    const processor = ensureInitialized();
    processor.reset();
    setLastResult(null);
    setIsProcessing(false);
    console.log("HybridVitalSignsProcessor: Reset");
  }, [ensureInitialized]);
  
  return {
    lastResult,
    isProcessing,
    processSignal,
    startProcessing,
    stopProcessing,
    reset
  };
}
