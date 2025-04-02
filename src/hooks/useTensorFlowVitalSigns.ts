
import { useState, useRef, useEffect, useCallback } from 'react';
import { TFVitalSignsProcessor } from '../modules/vital-signs/TFVitalSignsProcessor';
import { VitalSignsResult } from '../modules/vital-signs/types/vital-signs-result';
import { RRIntervalData } from './heart-beat/types';
import { initializeTensorFlow, disposeTensors } from '../utils/tfModelInitializer';
import { toast } from './use-toast';

export interface UseTensorFlowVitalSignsReturn {
  processSignal: (value: number, rrData?: RRIntervalData, isWeakSignal?: boolean) => Promise<VitalSignsResult>;
  reset: () => void;
  fullReset: () => void;
  arrhythmiaCounter: number;
  isTensorFlowReady: boolean;
  isInitializing: boolean;
  arrhythmiaWindows: Array<{ start: number, end: number }>;
  debugInfo: any;
}

/**
 * Hook for TensorFlow-based vital signs processing
 */
export const useTensorFlowVitalSigns = (): UseTensorFlowVitalSignsReturn => {
  const [isTensorFlowReady, setIsTensorFlowReady] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const processorRef = useRef<TFVitalSignsProcessor | null>(null);
  const arrhythmiaWindowsRef = useRef<Array<{ start: number, end: number }>>([]);
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const processingCountRef = useRef<number>(0);
  
  // Initialize TensorFlow and processor
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitializing(true);
        console.log("useTensorFlowVitalSigns: Initializing TensorFlow", {
          sessionId: sessionIdRef.current,
          timestamp: new Date().toISOString()
        });
        
        // Initialize TensorFlow
        const tfInitialized = await initializeTensorFlow();
        
        if (!tfInitialized) {
          console.error("Failed to initialize TensorFlow");
          toast({
            title: "TensorFlow initialization failed",
            description: "Advanced vital signs processing will be limited",
            variant: "destructive"
          });
          setIsInitializing(false);
          return;
        }
        
        setIsTensorFlowReady(true);
        
        // Create processor instance
        if (!processorRef.current) {
          processorRef.current = new TFVitalSignsProcessor();
          console.log("useTensorFlowVitalSigns: Processor created successfully");
        }
        
        // Perform a test calculation to ensure everything is working
        if (processorRef.current) {
          const testResult = await processorRef.current.processSignal(0.5);
          console.log("TensorFlow test calculation result:", testResult);
        }
        
        setIsInitializing(false);
        
        toast({
          title: "TensorFlow initialized",
          description: "Advanced vital signs processing ready",
          variant: "default"
        });
      } catch (error) {
        console.error("Error initializing TensorFlow:", error);
        toast({
          title: "Initialization Error",
          description: "Failed to set up vital signs processing",
          variant: "destructive"
        });
        setIsInitializing(false);
      }
    };
    
    initialize();
    
    // Cleanup
    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
      }
      
      disposeTensors();
      console.log("useTensorFlowVitalSigns: Cleaned up resources");
    };
  }, []);
  
  /**
   * Process PPG signal to calculate vital signs
   */
  const processSignal = useCallback(async (
    value: number, 
    rrData?: RRIntervalData,
    isWeakSignal: boolean = false
  ): Promise<VitalSignsResult> => {
    processingCountRef.current++;
    
    if (!processorRef.current) {
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "NOT_INITIALIZED|0",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          hydration: 0
        }
      };
    }
    
    // Log processing count
    if (processingCountRef.current % 30 === 0 || processingCountRef.current < 5) {
      console.log("useTensorFlowVitalSigns: Processing signal", {
        count: processingCountRef.current,
        value,
        hasRRData: !!rrData,
        isWeakSignal,
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      // Process the signal with TensorFlow
      const result = await processorRef.current.processSignal(value, rrData, isWeakSignal);
      
      // Handle arrhythmia visualization
      if (result.arrhythmiaStatus.includes("ARRHYTHMIA DETECTED") && result.lastArrhythmiaData) {
        const arrhythmiaTime = result.lastArrhythmiaData.timestamp;
        
        // Create window around the arrhythmia
        const windowWidth = 500; // ms
        arrhythmiaWindowsRef.current.push({
          start: arrhythmiaTime - windowWidth/2,
          end: arrhythmiaTime + windowWidth/2
        });
        
        // Keep only recent windows
        const now = Date.now();
        arrhythmiaWindowsRef.current = arrhythmiaWindowsRef.current.filter(
          window => now - window.end < 10000
        );
      }
      
      // Log successful results
      if (
        result.spo2 > 0 || 
        result.glucose > 0 || 
        result.lipids.totalCholesterol > 0 || 
        result.lipids.hydration > 0
      ) {
        console.log("useTensorFlowVitalSigns: Successfully processed vital signs", {
          spo2: result.spo2,
          pressure: result.pressure,
          glucose: result.glucose,
          cholesterol: result.lipids.totalCholesterol,
          hydration: result.lipids.hydration,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error processing signal with TensorFlow:", error);
      
      // Return empty result on error
      return {
        spo2: 0,
        pressure: "--/--",
        arrhythmiaStatus: "ERROR|0",
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          hydration: 0
        }
      };
    }
  }, []);
  
  /**
   * Reset processor
   */
  const reset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.reset();
      console.log("useTensorFlowVitalSigns: Processor reset");
    }
    
    // Clear arrhythmia windows
    arrhythmiaWindowsRef.current = [];
    
    return null;
  }, []);
  
  /**
   * Full reset including arrhythmia counter
   */
  const fullReset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.fullReset();
      console.log("useTensorFlowVitalSigns: Processor fully reset");
    }
    
    // Clear arrhythmia windows
    arrhythmiaWindowsRef.current = [];
    processingCountRef.current = 0;
  }, []);
  
  /**
   * Get debug information
   */
  const getDebugInfo = useCallback(() => {
    return {
      tensorflowReady: isTensorFlowReady,
      sessionId: sessionIdRef.current,
      arrhythmiaWindows: arrhythmiaWindowsRef.current.length,
      processorInitialized: !!processorRef.current,
      processingCount: processingCountRef.current,
      timestamp: new Date().toISOString()
    };
  }, [isTensorFlowReady]);
  
  return {
    processSignal,
    reset,
    fullReset,
    arrhythmiaCounter: processorRef.current?.getArrhythmiaCounter() || 0,
    isTensorFlowReady,
    isInitializing,
    arrhythmiaWindows: arrhythmiaWindowsRef.current,
    debugInfo: getDebugInfo()
  };
};
