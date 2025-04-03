import { useState, useRef, useCallback, useEffect } from 'react';
import { VitalSignsProcessor } from '../../modules/VitalSignsProcessor';
import { VitalSignsResult } from '../../modules/vital-signs/types/vital-signs-result';
import { RRIntervalData } from '../heart-beat/types';
import { useTensorFlowIntegration } from '../useTensorFlowIntegration';

export const useSignalProcessing = () => {
  const [processor, setProcessor] = useState<VitalSignsProcessor | null>(null);
  const processedSignals = useRef<number>(0);
  const lastResults = useRef<VitalSignsResult | null>(null);
  const processingIntervalRef = useRef<number | null>(null);
  const signalLogRef = useRef<{ timestamp: number; value: number; result: any; }[]>([]);
  
  // Use TensorFlow integration
  const { 
    isTensorFlowReady,
    performanceMetrics
  } = useTensorFlowIntegration();
  
  // Initialize the processor
  const initializeProcessor = useCallback(() => {
    try {
      const vitalSignsProcessor = new VitalSignsProcessor();
      setProcessor(vitalSignsProcessor);
      console.log("Signal processor initialized");
    } catch (error) {
      console.error("Error initializing signal processor:", error);
    }
  }, []);
  
  // Process a single signal value
  const processSignal = useCallback(
    (value: number, rrData?: RRIntervalData, isWeakSignal: boolean = false): VitalSignsResult => {
      if (!processor) {
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
      
      try {
        processedSignals.current++;
        
        // Process through VitalSignsProcessor
        const result = processor.processSignal(value, rrData);
        lastResults.current = result;
        
        // Add to signal log
        const timestamp = Date.now();
        signalLogRef.current.push({
          timestamp,
          value,
          result: { ...result }
        });
        
        // Keep log at a reasonable size
        if (signalLogRef.current.length > 100) {
          signalLogRef.current = signalLogRef.current.slice(-100);
        }
        
        return result;
      } catch (error) {
        console.error("Error processing signal:", error);
        return {
          spo2: 0,
          pressure: "--/--",
          arrhythmiaStatus: "ERROR",
          glucose: 0,
          lipids: {
            totalCholesterol: 0,
            hydration: 0
          }
        };
      }
    },
    [processor]
  );
  
  // Reset processor state
  const reset = useCallback(() => {
    if (processor) {
      processor.reset();
      console.log("Signal processor reset");
    }
    
    return lastResults.current;
  }, [processor]);
  
  // Full reset of all data
  const fullReset = useCallback(() => {
    if (processor) {
      processor.fullReset();
      lastResults.current = null;
      processedSignals.current = 0;
      signalLogRef.current = [];
      console.log("Signal processor fully reset");
    }
  }, [processor]);
  
  // Get arrhythmia counter
  const getArrhythmiaCounter = useCallback(() => {
    if (!processor) return 0;
    return processor.getArrhythmiaCounter();
  }, [processor]);
  
  // Get debug info
  const getDebugInfo = useCallback(() => {
    return {
      processedSignals: processedSignals.current,
      hasProcessor: !!processor,
      memoryUsage: performanceMetrics?.memoryUsage || 0,
      tensorCount: performanceMetrics?.tensorCount || 0,
      tensorflowReady: isTensorFlowReady,
      signalLog: signalLogRef.current
    };
  }, [processor, performanceMetrics, isTensorFlowReady]);
  
  // Clean up resources
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    };
  }, []);
  
  return {
    processSignal,
    initializeProcessor,
    reset,
    fullReset,
    getArrhythmiaCounter,
    getDebugInfo,
    processedSignals,
    isTensorFlowReady
  };
};
