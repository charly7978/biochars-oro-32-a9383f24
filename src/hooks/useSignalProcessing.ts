/**
 * Hook for central signal processing
 * Integrates specialized processors from signal-processing module
 * Optimized for performance and memory usage
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  HeartBeatProcessor,
  ISignalProcessor,
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
 * Optimized for performance and memory usage
 */
export function useSignalProcessing() {
  // Processor instances - using refs to prevent recreation
  const ppgProcessorRef = useRef<ISignalProcessor | null>(null);
  const heartbeatProcessorRef = useRef<HeartBeatProcessor | null>(null);
  
  // Processing state - using React.useState for reactivity
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  
  // Calculated values
  const [heartRate, setHeartRate] = useState<number>(0);
  const recentBpmValues = useRef<number[]>([]);
  
  // Processed frames counter - using a ref for performance
  const processedFramesRef = useRef<number>(0);
  
  // Create processors if they don't exist - using dynamic import for code splitting
  useEffect(() => {
    // Dynamic imports for better code splitting
    const createProcessors = async () => {
      if (!ppgProcessorRef.current) {
        console.log("useSignalProcessing: Creating PPG processor");
        const PPGProcessor = await import('../modules/signal-processing/ppg-processor');
        ppgProcessorRef.current = new PPGProcessor.PPGSignalProcessor();
      }
      
      if (!heartbeatProcessorRef.current) {
        console.log("useSignalProcessing: Creating heartbeat processor");
        const HeartbeatProcessor = await import('../modules/signal-processing/heartbeat-processor');
        heartbeatProcessorRef.current = new HeartbeatProcessor.HeartBeatProcessor();
      }
    };
    
    createProcessors();
    
    return () => {
      console.log("useSignalProcessing: Cleaning up processors");
      ppgProcessorRef.current = null;
      heartbeatProcessorRef.current = null;
    };
  }, []);
  
  /**
   * Process a PPG value using both processors
   * Optimized for performance using useCallback
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing || !ppgProcessorRef.current || !heartbeatProcessorRef.current) {
      return null;
    }
    
    try {
      // Increment frame counter
      processedFramesRef.current++;
      
      // Process with the PPG processor
      const filteredValue = ppgProcessorRef.current.processSignal(value);
      
      // Create ppgResult with processed value
      const now = Date.now();
      const ppgResult: ProcessedPPGSignal = {
        timestamp: now,
        rawValue: value,
        filteredValue: filteredValue as number,
        normalizedValue: filteredValue as number, 
        amplifiedValue: (filteredValue as number) * 1.5, 
        quality: 75, // Default quality
        fingerDetected: true, // Assume finger detected
        signalStrength: 0.8 // Default strength
      };
      
      // Process with heartbeat processor
      const heartbeatResult = heartbeatProcessorRef.current.processSignal(ppgResult.amplifiedValue);
      
      // Update quality state and finger detection
      setSignalQuality(ppgResult.quality);
      setFingerDetected(ppgResult.fingerDetected);
      
      // Calculate BPM average using sliding window
      if ((heartbeatResult.instantaneousBPM || 0) > 0 && heartbeatResult.confidence > 0.5) {
        recentBpmValues.current.push(heartbeatResult.instantaneousBPM || 0);
        
        // Keep only the most recent values - optimize for memory
        if (recentBpmValues.current.length > 10) {
          recentBpmValues.current.shift();
        }
      }
      
      // Calculate average BPM with outlier filtering
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
        instantaneousBPM: heartbeatResult.instantaneousBPM || null,
        averageBPM,
        rrInterval: heartbeatResult.rrInterval || null,
        heartRateVariability: heartbeatResult.heartRateVariability || null
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
   * Optimized with useCallback
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
   * Optimized with useCallback
   */
  const stopProcessing = useCallback(() => {
    console.log("useSignalProcessing: Stopping processing");
    setIsProcessing(false);
  }, []);
  
  /**
   * Configure processors with custom options
   * Optimized with useCallback
   */
  const configureProcessors = useCallback((options: SignalProcessingOptions) => {
    const processor = ppgProcessorRef.current as any;
    if (processor && typeof processor.configure === 'function') {
      processor.configure(options);
    }
  }, []);
  
  /**
   * Reset signal processing
   * Optimized with useCallback
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
  
  // Memoized return object for better performance
  return useMemo(() => ({
    // States
    isProcessing,
    signalQuality,
    fingerDetected,
    heartRate,
    lastResult,
    processedFrames: processedFramesRef.current,
    filteredValue: lastResult?.filteredValue,
    
    // Actions
    processValue,
    startProcessing,
    stopProcessing,
    configureProcessors,
    reset,
    
    // Processors
    ppgProcessor: ppgProcessorRef.current,
    heartbeatProcessor: heartbeatProcessorRef.current
  }), [
    isProcessing, 
    signalQuality, 
    fingerDetected, 
    heartRate, 
    lastResult, 
    processValue, 
    startProcessing, 
    stopProcessing, 
    configureProcessors, 
    reset
  ]);
}
