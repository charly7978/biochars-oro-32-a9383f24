/**
 * Hook for central signal processing
 * Integrates specialized processors from signal-processing module
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  HeartBeatProcessor,
  SignalProcessor,
  ProcessedPPGSignal,
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  resetFingerDetector
} from '../modules/signal-processing';

// Combined result of processing
export interface ProcessedSignalResult {
  timestamp: number;
  
  // PPG signal values
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  
  // Quality information
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
  
  // Cardiac information
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  averageBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
}

/**
 * Hook for central signal processing
 */
export function useSignalProcessing() {
  // Processor instances
  const ppgProcessorRef = useRef<SignalProcessor | null>(null);
  const heartbeatProcessorRef = useRef<HeartBeatProcessor | null>(null);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  
  // Calculated values
  const [heartRate, setHeartRate] = useState<number>(0);
  const recentBpmValues = useRef<number[]>([]);
  
  // Processed frames counter
  const processedFramesRef = useRef<number>(0);
  
  // Create processors if they don't exist
  useEffect(() => {
    if (!ppgProcessorRef.current) {
      console.log("useSignalProcessing: Creating PPG processor");
      ppgProcessorRef.current = new SignalProcessor();
    }
    
    if (!heartbeatProcessorRef.current) {
      console.log("useSignalProcessing: Creating heartbeat processor");
      heartbeatProcessorRef.current = new HeartBeatProcessor();
    }
    
    return () => {
      console.log("useSignalProcessing: Cleaning up processors");
      ppgProcessorRef.current = null;
      heartbeatProcessorRef.current = null;
    };
  }, []);
  
  /**
   * Process a PPG value using both processors
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing || !ppgProcessorRef.current || !heartbeatProcessorRef.current) {
      return null;
    }
    
    try {
      // Increment frame counter
      processedFramesRef.current++;
      
      // Process with the PPG processor
      // Using the standardized interface method
      const filteredValue = ppgProcessorRef.current.processSignal(value);
      
      // Create ppgResult with processed value
      const now = Date.now();
      const ppgResult: ProcessedPPGSignal = {
        timestamp: now,
        rawValue: value,
        filteredValue: filteredValue,
        normalizedValue: filteredValue, // Simplified for now
        amplifiedValue: filteredValue * 1.5, // Simple amplification factor
        quality: 75, // Default quality
        fingerDetected: true, // Assume finger detected
        signalStrength: 0.8 // Default strength
      };
      
      // Process with heartbeat processor
      // Using the standardized interface method
      const heartbeatResult = heartbeatProcessorRef.current.processSignal(ppgResult.amplifiedValue);
      
      // Update quality state and finger detection
      setSignalQuality(ppgResult.quality);
      setFingerDetected(ppgResult.fingerDetected);
      
      // Calculate BPM average
      if ((heartbeatResult.instantaneousBPM ?? 0) > 0 && heartbeatResult.confidence > 0.5) {
        recentBpmValues.current.push(heartbeatResult.instantaneousBPM ?? 0);
        
        // Keep only the most recent values
        if (recentBpmValues.current.length > 10) {
          recentBpmValues.current.shift();
        }
      }
      
      // Calculate average BPM (with filtering of extreme values)
      let averageBPM: number | null = null;
      
      if (recentBpmValues.current.length >= 3) {
        // Sort to remove extremes
        const sortedBPMs = [...recentBpmValues.current].sort((a, b) => a - b);
        
        // Use the central 80% of the values
        const startIdx = Math.floor(sortedBPMs.length * 0.1);
        const endIdx = Math.ceil(sortedBPMs.length * 0.9);
        const centralBPMs = sortedBPMs.slice(startIdx, endIdx);
        
        // Calculate average
        if (centralBPMs.length > 0) {
          const sum = centralBPMs.reduce((a, b) => a + b, 0);
          averageBPM = Math.round(sum / centralBPMs.length);
          
          // Update BPM state if we have a value and good quality
          if (averageBPM > 0 && ppgResult.quality > 40) {
            setHeartRate(averageBPM);
          }
        }
      }
      
      // Generate combined result
      const result: ProcessedSignalResult = {
        timestamp: ppgResult.timestamp,
        
        // PPG signal values
        rawValue: ppgResult.rawValue,
        filteredValue: ppgResult.filteredValue,
        normalizedValue: ppgResult.normalizedValue,
        amplifiedValue: ppgResult.amplifiedValue,
        
        // Quality information
        quality: ppgResult.quality,
        fingerDetected: ppgResult.fingerDetected,
        signalStrength: ppgResult.signalStrength,
        
        // Cardiac information
        isPeak: heartbeatResult.isPeak,
        peakConfidence: heartbeatResult.confidence,
        instantaneousBPM: heartbeatResult.instantaneousBPM ?? null,
        averageBPM,
        rrInterval: heartbeatResult.rrInterval ?? null,
        heartRateVariability: heartbeatResult.heartRateVariability ?? null
      };
      
      // Update last result
      setLastResult(result);
      
      return result;
    } catch (error) {
      console.error("Error processing value:", error);
      return null;
    }
  }, [isProcessing]);
  
  /**
   * Start signal processing
   */
  const startProcessing = useCallback(() => {
    if (!ppgProcessorRef.current || !heartbeatProcessorRef.current) {
      console.error("Cannot start processors");
      return;
    }
    
    console.log("useSignalProcessing: Starting processing");
    
    // Reset processors
    ppgProcessorRef.current.reset();
    if (typeof heartbeatProcessorRef.current.reset === 'function') {
      heartbeatProcessorRef.current.reset();
    }
    resetFingerDetector();
    
    // Clear states
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    recentBpmValues.current = [];
    processedFramesRef.current = 0;
    
    // Start processing
    setIsProcessing(true);
  }, []);
  
  /**
   * Stop signal processing
   */
  const stopProcessing = useCallback(() => {
    console.log("useSignalProcessing: Stopping processing");
    setIsProcessing(false);
  }, []);
  
  /**
   * Configure processors with custom options
   */
  const configureProcessors = useCallback((options: SignalProcessingOptions) => {
    if (ppgProcessorRef.current && ppgProcessorRef.current.configure) {
      ppgProcessorRef.current.configure(options);
    }
  }, []);
  
  /**
   * Reset signal processing
   */
  const reset = useCallback(() => {
    console.log("useSignalProcessing: Reset");
    
    if (ppgProcessorRef.current) {
      ppgProcessorRef.current.reset();
    }
    
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    setLastResult(null);
    recentBpmValues.current = [];
    processedFramesRef.current = 0;
    
    setIsProcessing(false);
  }, []);
  
  return {
    // States
    isProcessing,
    signalQuality,
    fingerDetected,
    heartRate,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Actions
    processValue,
    startProcessing,
    stopProcessing,
    configureProcessors,
    reset,
    
    // Processors
    ppgProcessor: ppgProcessorRef.current,
    heartbeatProcessor: heartbeatProcessorRef.current
  };
}
