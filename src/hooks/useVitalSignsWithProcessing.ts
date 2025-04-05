
/**
 * Integrated hook that connects signal extraction with vital signs processing
 * Optimized for performance and memory usage
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { usePPGExtraction } from './usePPGExtraction';
import { useSignalProcessing } from './useSignalProcessing';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { useHybridVitalSignsProcessor } from './useHybridVitalSignsProcessor';

/**
 * Integrated result type
 */
export interface IntegratedVitalsResult {
  // Signal data
  timestamp: number;
  quality: number;
  fingerDetected: boolean;
  
  // Processed signals
  rawValue: number;
  filteredValue: number;
  amplifiedValue: number;
  
  // Heart data
  heartRate: number;
  isPeak: boolean;
  rrInterval: number | null;
  
  // Vital signs
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  arrhythmiaCount: number;
  hydration?: number;
}

/**
 * Hook configuration
 */
interface UseVitalSignsWithProcessingOptions {
  useNeuralModels?: boolean;
  useAdaptiveProcessing?: boolean;
  useWebGPU?: boolean;
}

/**
 * Integrated hook for vital signs extraction and processing
 */
export function useVitalSignsWithProcessing(options?: UseVitalSignsWithProcessingOptions) {
  // Core processing hooks
  const extraction = usePPGExtraction();
  const signalProcessing = useSignalProcessing();
  const standardProcessor = useVitalSignsProcessor();
  const hybridProcessor = useHybridVitalSignsProcessor({
    useNeuralModels: options?.useNeuralModels ?? false,
    adaptiveProcessing: options?.useAdaptiveProcessing ?? true,
    useWebGPU: options?.useWebGPU ?? false
  });
  
  // Integrated state
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedVitalsResult | null>(null);
  const [useNeural, setUseNeural] = useState<boolean>(options?.useNeuralModels ?? false);
  
  // Performance metrics
  const processedFramesRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(Date.now());
  const fpsCounterRef = useRef<{count: number, lastUpdate: number}>({count: 0, lastUpdate: Date.now()});
  const [fps, setFps] = useState<number>(0);
  
  /**
   * Process a camera frame
   */
  const processFrame = useCallback((imageData: ImageData) => {
    if (!isMonitoring) return;
    
    try {
      // Extract PPG value from frame
      extraction.processFrame(imageData);
      
      // Track FPS
      fpsCounterRef.current.count++;
      const now = Date.now();
      if (now - fpsCounterRef.current.lastUpdate > 1000) {
        setFps(fpsCounterRef.current.count);
        fpsCounterRef.current = {count: 0, lastUpdate: now};
      }
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  }, [isMonitoring, extraction]);
  
  /**
   * Process signal when new extraction result is available
   */
  useEffect(() => {
    if (!isMonitoring || !extraction.lastResult) return;
    
    try {
      // Process the extracted PPG value
      const processedSignal = signalProcessing.processValue(extraction.lastResult.filteredValue);
      
      if (processedSignal && processedSignal.fingerDetected) {
        // Process vital signs using appropriate processor
        const processor = useNeural ? hybridProcessor : standardProcessor;
        const vitalsResult = processor.processSignal(
          processedSignal.filteredValue, 
          { 
            intervals: processedSignal.rrInterval ? [processedSignal.rrInterval] : [],
            lastPeakTime: processedSignal.isPeak ? processedSignal.timestamp : null
          }
        );
        
        // Create integrated result
        const integratedResult: IntegratedVitalsResult = {
          timestamp: processedSignal.timestamp,
          quality: processedSignal.quality,
          fingerDetected: processedSignal.fingerDetected,
          
          rawValue: processedSignal.rawValue,
          filteredValue: processedSignal.filteredValue,
          amplifiedValue: processedSignal.amplifiedValue,
          
          heartRate: processedSignal.averageBPM || 0,
          isPeak: processedSignal.isPeak,
          rrInterval: processedSignal.rrInterval,
          
          spo2: vitalsResult.spo2,
          pressure: vitalsResult.pressure,
          arrhythmiaStatus: vitalsResult.arrhythmiaStatus.split('|')[0] || '--',
          arrhythmiaCount: parseInt(vitalsResult.arrhythmiaStatus.split('|')[1] || '0', 10),
          hydration: vitalsResult.lipids.hydrationPercentage
        };
        
        // Update result
        setLastResult(integratedResult);
        
        // Increment counter and update timestamp
        processedFramesRef.current++;
        lastProcessTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error("Error in integrated processing:", error);
    }
  }, [isMonitoring, extraction.lastResult, signalProcessing, standardProcessor, hybridProcessor, useNeural]);
  
  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Starting monitoring");
    
    // Start all subsystems
    extraction.startProcessing();
    signalProcessing.startProcessing();
    standardProcessor.startProcessing();
    
    // Reset counters
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    fpsCounterRef.current = {count: 0, lastUpdate: Date.now()};
    
    setIsMonitoring(true);
  }, [extraction, signalProcessing, standardProcessor]);
  
  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Stopping monitoring");
    
    // Stop all subsystems
    extraction.stopProcessing();
    signalProcessing.stopProcessing();
    standardProcessor.reset();
    hybridProcessor.reset();
    
    setIsMonitoring(false);
    setLastResult(null);
  }, [extraction, signalProcessing, standardProcessor, hybridProcessor]);
  
  /**
   * Toggle neural processing
   */
  const toggleNeuralProcessing = useCallback((enabled: boolean) => {
    setUseNeural(enabled);
    hybridProcessor.toggleNeuralProcessing(enabled);
  }, [hybridProcessor]);
  
  /**
   * Reset the entire system
   */
  const reset = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Resetting system");
    
    stopMonitoring();
    
    // Reset all subsystems
    extraction.reset();
    signalProcessing.reset();
    standardProcessor.fullReset();
    hybridProcessor.reset();
    
    // Reset counters
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    fpsCounterRef.current = {count: 0, lastUpdate: Date.now()};
  }, [extraction, signalProcessing, standardProcessor, hybridProcessor, stopMonitoring]);
  
  // Optimized return object using useMemo
  return useMemo(() => ({
    // State
    isMonitoring,
    lastResult,
    processedFrames: processedFramesRef.current,
    fps,
    useNeural,
    
    // Metrics from extraction
    signalQuality: signalProcessing.signalQuality,
    fingerDetected: signalProcessing.fingerDetected,
    heartRate: signalProcessing.heartRate,
    
    // Actions
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset,
    toggleNeuralProcessing
  }), [
    isMonitoring,
    lastResult,
    fps,
    useNeural,
    signalProcessing.signalQuality,
    signalProcessing.fingerDetected,
    signalProcessing.heartRate,
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset,
    toggleNeuralProcessing
  ]);
}
