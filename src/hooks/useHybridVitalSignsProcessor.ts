
/**
 * Hook for using the hybrid vital signs processor
 * Combines traditional signal processing with neural networks
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { VitalSignsProcessor, HybridProcessingOptions, VitalSignsResult } from '../modules/vital-signs';
import { HybridVitalSignsProcessor } from '../modules/vital-signs/HybridVitalSignsProcessor';

/**
 * Configuration for the hook
 */
interface UseHybridVitalSignsProcessorOptions {
  useNeuralModels?: boolean;
  neuralWeight?: number;
  neuralConfidenceThreshold?: number;
}

/**
 * Hook for processing vital signs with hybrid approach
 */
export const useHybridVitalSignsProcessor = (options?: UseHybridVitalSignsProcessorOptions) => {
  // Create processor instance with hybrid capabilities
  const processorRef = useRef<HybridVitalSignsProcessor | null>(null);
  
  // States
  const [lastResult, setLastResult] = useState<VitalSignsResult | null>(null);
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  const [neuralEnabled, setNeuralEnabled] = useState<boolean>(options?.useNeuralModels ?? false);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState<boolean>(false);
  
  // Create processor on mount
  useEffect(() => {
    console.log("Creating hybrid vital signs processor");
    processorRef.current = new HybridVitalSignsProcessor({
      useNeuralModels: options?.useNeuralModels ?? false,
      neuralWeight: options?.neuralWeight ?? 0.6,
      neuralConfidenceThreshold: options?.neuralConfidenceThreshold ?? 0.5
    });
    
    return () => {
      console.log("Cleaning up hybrid vital signs processor");
      processorRef.current = null;
    };
  }, []);
  
  /**
   * Process a PPG signal to calculate vital signs
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
   * Toggle neural processing
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
   * Update processor options
   */
  const updateOptions = useCallback((newOptions: Partial<HybridProcessingOptions>) => {
    if (processorRef.current) {
      processorRef.current.updateOptions(newOptions);
    }
  }, []);
  
  /**
   * Get neural network information
   */
  const getNeuralInfo = useCallback(() => {
    if (!processorRef.current) {
      return { enabled: false };
    }
    
    return processorRef.current.getDiagnosticInfo();
  }, []);
  
  /**
   * Reset processor
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
