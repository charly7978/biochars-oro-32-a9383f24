
/**
 * Hook for processing hydration data from PPG signals
 */

import { useState, useEffect, useRef } from 'react';
import { HydrationProcessor } from '../modules/vital-signs/hydration-processor';

/**
 * Hook for accessing hydration processing capabilities
 */
export const useHydrationProcessor = () => {
  // Create processor instance
  const processorRef = useRef<HydrationProcessor | null>(null);
  
  // States
  const [hydration, setHydration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  
  // Create processor on mount
  useEffect(() => {
    console.log("Creating hydration processor");
    processorRef.current = new HydrationProcessor();
    
    return () => {
      console.log("Cleaning up hydration processor");
      processorRef.current = null;
    };
  }, []);
  
  /**
   * Process PPG values to determine hydration
   */
  const processValues = (ppgValues: number[]): number => {
    if (!processorRef.current || !isProcessing || ppgValues.length === 0) {
      return 0;
    }
    
    try {
      // Calculate hydration
      const hydrationValue = processorRef.current.calculateHydration(ppgValues);
      
      // Update states
      setHydration(hydrationValue);
      setConfidence(processorRef.current.getConfidence());
      
      return hydrationValue;
    } catch (error) {
      console.error("Error processing hydration:", error);
      return 0;
    }
  };
  
  /**
   * Process a single PPG value
   */
  const processValue = (value: number): number => {
    return processValues([value]);
  };
  
  /**
   * Start processing
   */
  const startProcessing = (): void => {
    console.log("Starting hydration processing");
    setIsProcessing(true);
  };
  
  /**
   * Stop processing
   */
  const stopProcessing = (): void => {
    console.log("Stopping hydration processing");
    setIsProcessing(false);
  };
  
  /**
   * Reset processor
   */
  const reset = (): void => {
    console.log("Resetting hydration processor");
    if (processorRef.current) {
      processorRef.current.reset();
    }
    setHydration(0);
    setConfidence(0);
  };
  
  return {
    hydration,
    confidence,
    isProcessing,
    processValue,
    processValues,
    startProcessing,
    stopProcessing,
    reset
  };
};
