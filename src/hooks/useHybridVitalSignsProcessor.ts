
/**
 * Hook for using the hybrid vital signs processor
 * Combines traditional signal processing with neural networks
 * Optimized for better performance and memory usage
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { HybridVitalSignsProcessor, HybridProcessingOptions, VitalSignsResult } from '../modules/vital-signs';

/**
 * Configuration for the hook
 */
interface UseHybridVitalSignsProcessorOptions {
  useNeuralModels?: boolean;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
  adaptiveProcessing?: boolean;
  enhancedCalibration?: boolean;
  useWebGPU?: boolean;
  useQuantization?: boolean;
  optimizeForMobile?: boolean;
}

/**
 * Hook for processing vital signs with hybrid approach
 */
export const useHybridVitalSignsProcessor = (options?: UseHybridVitalSignsProcessorOptions) => {
  // Create processor instance with hybrid capabilities
  const processorRef = useRef<HybridVitalSignsProcessor | null>(null);
  
  // States - optimized with React.useState for better performance
  const [lastResult, setLastResult] = useState<VitalSignsResult | null>(null);
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  const [neuralEnabled, setNeuralEnabled] = useState<boolean>(options?.useNeuralModels ?? false);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState<boolean>(false);
  
  // Create processor on mount - using useEffect for proper lifecycle management
  useEffect(() => {
    console.log("Creating hybrid vital signs processor");
    processorRef.current = new HybridVitalSignsProcessor({
      useNeuralModels: options?.useNeuralModels ?? false,
      neuralWeight: options?.neuralWeight ?? 0.6,
      neuralConfidenceThreshold: options?.neuralConfidenceThreshold ?? 0.5,
      adaptiveProcessing: options?.adaptiveProcessing ?? true,
      enhancedCalibration: options?.enhancedCalibration ?? true,
      useWebGPU: options?.useWebGPU ?? false,
      useQuantization: options?.useQuantization ?? false,
      optimizeForMobile: options?.optimizeForMobile ?? true
    });
    
    return () => {
      console.log("Cleaning up hybrid vital signs processor");
      processorRef.current = null;
    };
  }, []);
  
  /**
   * Process a PPG signal to calculate vital signs
   * Optimized for performance with memoization via useCallback
   */
  const processSignal = useCallback((
    value: number, 
    rrData?: { 
      intervals: number[], 
      lastPeakTime: number | null 
    }
  ): VitalSignsResult => {
    if (!processorRef.current) {
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
    }
    
    try {
      // Process signal with hybrid processor
      const result = processorRef.current.processSignal({ value, rrData });
      
      // Update state
      setLastResult(result);
      
      return result;
    } catch (error) {
      console.error("Error processing vital signs:", error);
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
    }
  }, []);
  
  /**
   * Toggle neural processing - optimized for reduced rerenders
   */
  const toggleNeuralProcessing = useCallback((enabled: boolean) => {
    if (processorRef.current) {
      processorRef.current.toggleNeuralProcessing(enabled);
      setNeuralEnabled(enabled);
    }
  }, []);
  
  /**
   * Toggle diagnostics
   */
  const toggleDiagnostics = useCallback((enabled: boolean) => {
    setDiagnosticsEnabled(enabled);
  }, []);
  
  /**
   * Update processor options - optimized with useCallback
   */
  const updateOptions = useCallback((newOptions: Partial<HybridProcessingOptions>) => {
    if (processorRef.current) {
      processorRef.current.updateOptions(newOptions);
    }
  }, []);
  
  /**
   * Get neural network information - optimized with useCallback
   */
  const getNeuralInfo = useCallback(() => {
    if (!processorRef.current) {
      return { enabled: false };
    }
    
    return processorRef.current.getDiagnosticInfo();
  }, []);
  
  /**
   * Reset processor - optimized with useCallback
   */
  const reset = useCallback(() => {
    if (!processorRef.current) return null;
    
    const lastValid = processorRef.current.reset();
    if (lastValid) {
      setLastValidResults(lastValid);
    }
    
    return lastValid;
  }, []);
  
  return {
    processSignal,
    lastResult,
    lastValidResults,
    neuralEnabled,
    toggleNeuralProcessing,
    updateOptions,
    diagnosticsEnabled,
    toggleDiagnostics,
    debugInfo: diagnosticsEnabled ? getNeuralInfo() : null,
    getNeuralInfo,
    reset,
    processor: processorRef.current
  };
};
