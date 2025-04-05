
/**
 * Hook for accessing vital signs processing capabilities
 * Including the new hydration measurement
 */

import { useState, useEffect, useRef } from 'react';
import { VitalSignsProcessor } from '../modules/vital-signs/VitalSignsProcessor';
import { VitalSignsResult } from '../modules/vital-signs/types/vital-signs-result';

/**
 * Hook for processing vital signs with integrated hydration
 */
export const useVitalSignsProcessor = () => {
  // Create processor instance
  const processorRef = useRef<VitalSignsProcessor | null>(null);
  
  // States
  const [lastResult, setLastResult] = useState<VitalSignsResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedValues, setProcessedValues] = useState<number>(0);
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  
  // Create processor on mount
  useEffect(() => {
    console.log("Creating vital signs processor with hydration support");
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
  const processSignal = (
    value: number, 
    rrData?: { 
      intervals: number[], 
      lastPeakTime: number | null 
    }
  ): VitalSignsResult => {
    // Extra debugging
    if (processedValues % 100 === 0) {
      console.log("useVitalSignsProcessor: Processing signal batch", {
        processedValues,
        isProcessing,
        hasProcessor: !!processorRef.current,
        value,
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
      // Process signal with standard interface
      const result = processorRef.current.processSignal({ value, rrData });
      
      // Update state
      setLastResult(result);
      setProcessedValues(prev => prev + 1);
      
      // Log every 30 values
      if (processedValues % 30 === 0) {
        console.log("Vital signs processed:", processedValues, "values");
        console.log("Latest vital signs:", {
          spo2: result.spo2,
          pressure: result.pressure,
          glucose: result.glucose,
          hydration: result.lipids.hydrationPercentage,
          cholesterol: result.lipids.totalCholesterol
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error processing vital signs:", error);
      return getEmptyResult();
    }
  };
  
  /**
   * Start processing
   */
  const startProcessing = (): void => {
    console.log("Starting vital signs processing");
    setIsProcessing(true);
    setProcessedValues(0);
  };
  
  /**
   * Stop processing
   */
  const stopProcessing = (): void => {
    console.log("Stopping vital signs processing");
    setIsProcessing(false);
  };
  
  /**
   * Reset processor
   * @returns Last valid result before reset
   */
  const reset = (): VitalSignsResult | null => {
    console.log("Resetting vital signs processor");
    if (processorRef.current) {
      const lastValid = processorRef.current.reset();
      if (lastValid) {
        setLastValidResults(lastValid);
      }
      setProcessedValues(0);
      return lastValid;
    }
    return null;
  };
  
  /**
   * Full reset including counters
   */
  const fullReset = (): void => {
    console.log("Full reset of vital signs processor");
    if (processorRef.current) {
      processorRef.current.fullReset();
    }
    setLastResult(null);
    setLastValidResults(null);
    setProcessedValues(0);
  };
  
  /**
   * Get arrhythmia counter
   */
  const getArrhythmiaCounter = (): number => {
    return processorRef.current?.getArrhythmiaCounter() || 0;
  };
  
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
      }
    };
  };
  
  const initializeProcessor = (): void => {
    console.log("Initializing vital signs processor");
    if (!processorRef.current) {
      processorRef.current = new VitalSignsProcessor();
    }
    setIsProcessing(true);
    setProcessedValues(0);
  };
  
  return {
    lastResult,
    lastValidResults,
    isProcessing,
    processedValues,
    processSignal,
    startProcessing,
    stopProcessing,
    reset,
    fullReset,
    getArrhythmiaCounter,
    initializeProcessor,
    processor: processorRef.current
  };
};
