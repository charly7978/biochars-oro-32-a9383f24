
/**
 * Hook for accessing vital signs processing capabilities
 * Using direct PPG signal processing without any simulation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { VitalSignsProcessor } from '../modules/signal-processing/VitalSignsProcessor';
import { VitalSignsResult } from '../modules/vital-signs/types/vital-signs-result';

/**
 * Hook for processing vital signs from PPG signal
 */
export const useVitalSignsProcessor = () => {
  // Create processor instance
  const processorRef = useRef<VitalSignsProcessor | null>(null);
  
  // States
  const [lastResult, setLastResult] = useState<VitalSignsResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedValues, setProcessedValues] = useState<number>(0);
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  
  // Debug counter for logging
  const debugCounterRef = useRef<number>(0);
  
  // Create processor on mount
  useEffect(() => {
    console.log("Creating vital signs processor with direct PPG processing");
    processorRef.current = new VitalSignsProcessor();
    
    return () => {
      console.log("Cleaning up vital signs processor");
      processorRef.current = null;
    };
  }, []);
  
  /**
   * Process a PPG signal to calculate vital signs
   * @param value PPG signal value 
   * @param rrData Optional RR interval data
   * @returns VitalSignsResult with measurements
   */
  const processSignal = useCallback(
    (
      value: number, 
      rrData?: { 
        intervals: number[], 
        lastPeakTime: number | null 
      }
    ): VitalSignsResult => {
      // Increment debug counter
      debugCounterRef.current += 1;
      
      // Debug logging every 100 values
      if (debugCounterRef.current % 100 === 0) {
        console.log("useVitalSignsProcessor: Processing signal batch", {
          processedCount: debugCounterRef.current,
          isProcessing,
          hasProcessor: !!processorRef.current,
          value: value.toFixed(4),
          hasRRData: !!rrData,
          rrIntervals: rrData?.intervals?.length || 0
        });
      }
      
      if (!processorRef.current || !isProcessing) {
        console.log("useVitalSignsProcessor: Not processing - processor not ready or not active", {
          hasProcessor: !!processorRef.current,
          isProcessing
        });
        return getEmptyResult();
      }
      
      try {
        // Process signal with direct processing - ABSOLUTELY NO SIMULATION
        const result = processorRef.current.processSignal(value, rrData);
        
        // Update state for valid results (with non-zero values)
        if (result.spo2 > 0 || result.glucose > 0) {
          setLastResult(result);
          setSignalQuality(processorRef.current.getSignalQuality());
        }
        
        // Update processed values counter
        setProcessedValues(prev => prev + 1);
        
        // More detailed periodic logging to debug values
        if (debugCounterRef.current % 30 === 0) {
          console.log("Vital signs processed:", {
            valuesProcessed: debugCounterRef.current,
            quality: processorRef.current.getSignalQuality(),
            results: {
              spo2: result.spo2,
              pressure: result.pressure,
              glucose: result.glucose,
              hydration: result.hydration,
              cholesterol: result.lipids.totalCholesterol,
              arrhythmia: result.arrhythmiaStatus
            }
          });
        }
        
        return result;
      } catch (error) {
        console.error("Error processing vital signs:", error);
        return getEmptyResult();
      }
    }, [isProcessing]
  );
  
  /**
   * Start processing
   */
  const startProcessing = useCallback((): void => {
    console.log("Starting vital signs processing with direct PPG processing");
    
    // Initialize processor if needed
    if (!processorRef.current) {
      console.log("Creating new processor instance");
      processorRef.current = new VitalSignsProcessor();
    }
    
    // Enable processing in processor
    processorRef.current.enableProcessing(true);
    
    // Reset counters
    setProcessedValues(0);
    debugCounterRef.current = 0;
    
    // Start processing
    setIsProcessing(true);
    
    console.log("Vital signs processing started");
  }, []);
  
  /**
   * Stop processing
   */
  const stopProcessing = useCallback((): void => {
    console.log("Stopping vital signs processing");
    
    // Stop processor
    if (processorRef.current) {
      processorRef.current.enableProcessing(false);
    }
    
    setIsProcessing(false);
  }, []);
  
  /**
   * Reset processor
   * @returns Last valid result before reset
   */
  const reset = useCallback((): VitalSignsResult | null => {
    console.log("Resetting vital signs processor");
    
    if (processorRef.current) {
      const lastValid = processorRef.current.reset();
      
      if (lastValid) {
        setLastValidResults(lastValid);
      }
      
      setProcessedValues(0);
      debugCounterRef.current = 0;
      
      return lastValid;
    }
    
    return null;
  }, []);
  
  /**
   * Full reset including counters
   */
  const fullReset = useCallback((): void => {
    console.log("Full reset of vital signs processor");
    
    if (processorRef.current) {
      processorRef.current.fullReset();
    }
    
    setLastResult(null);
    setLastValidResults(null);
    setProcessedValues(0);
    setSignalQuality(0);
    debugCounterRef.current = 0;
  }, []);
  
  /**
   * Get arrhythmia counter
   */
  const getArrhythmiaCounter = useCallback((): number => {
    return processorRef.current?.getArrhythmiaCounter() || 0;
  }, []);
  
  /**
   * Get empty result for initialization or errors
   */
  const getEmptyResult = (): VitalSignsResult => {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        hydrationPercentage: 0
      },
      hydration: 0
    };
  };
  
  return {
    lastResult,
    lastValidResults,
    isProcessing,
    processedValues,
    signalQuality,
    processSignal,
    startProcessing,
    stopProcessing,
    reset,
    fullReset,
    getArrhythmiaCounter,
    processor: processorRef.current
  };
};
