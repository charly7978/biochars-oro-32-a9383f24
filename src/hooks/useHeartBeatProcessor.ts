import { useState, useRef, useCallback, useEffect } from 'react';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { getDetailedQualityStats, clearDiagnosticsData } from './heart-beat/signal-processing/peak-detection';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';

/**
 * Hook for processing heart beat signals with improved detection algorithms
 */
export function useHeartBeatProcessor(): UseHeartBeatReturn {
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  
  // Heart beat processor reference
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const lastValidBpmRef = useRef<number>(0);
  const isArrhythmiaRef = useRef<boolean>(false);
  
  // Use arrhythmia detector
  const { 
    processRRIntervals, 
    currentBeatIsArrhythmiaRef,
    lastRRIntervalsRef,
    reset: resetArrhythmiaDetector 
  } = useArrhythmiaDetector();
  
  // Last arrhythmia detection time to prevent frequent alerts
  const lastArrhythmiaAlertTime = useRef<number>(0);
  const MIN_ARRHYTHMIA_ALERT_INTERVAL = 3000; // 3 seconds
  
  // Initialize processor
  useEffect(() => {
    if (!processorRef.current) {
      console.log("useHeartBeatProcessor: Initializing new processor", {
        sessionId: Math.random().toString(36).substring(2, 10),
        timestamp: new Date().toISOString()
      });
      
      // Create new instance
      processorRef.current = new HeartBeatProcessor();
      
      console.log("HeartBeatProcessor: New instance created - direct measurement mode only");
      console.log("HeartBeatProcessor: New instance created - sin audio activado");
      
      // Start in monitoring mode
      processorRef.current.setMonitoring(true);
      console.log("HeartBeatProcessor: Monitoring state set to true");
      console.log("HeartBeatProcessor: Monitoring state set to true, audio centralizado en PPGSignalMeter");
    }
    
    // Reset diagnostics data on component unmount
    return () => {
      clearDiagnosticsData();
    };
  }, []);
  
  // Process a signal value and return heart beat data
  const processSignal = useCallback((value: number): HeartBeatResult => {
    if (!processorRef.current) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
    }
    
    try {
      const startTime = performance.now();
      
      // Process the signal to extract heart beat
      const result = processorRef.current.processSignal(value);
      
      // Extract RR intervals for arrhythmia detection
      const rrData = processorRef.current.getRRIntervals();
      if (rrData?.intervals?.length > 3) {
        // Process intervals for arrhythmia detection
        const isArrhythmia = processRRIntervals(rrData.intervals);
        
        // Check if we should trigger an arrhythmia alert
        const now = Date.now();
        if (isArrhythmia && now - lastArrhythmiaAlertTime.current > MIN_ARRHYTHMIA_ALERT_INTERVAL) {
          isArrhythmiaRef.current = true;
          lastArrhythmiaAlertTime.current = now;
          
          // Dispatch arrhythmia event for other components to respond
          const event = new CustomEvent('arrhythmia-detected', {
            detail: {
              timestamp: now,
              rrIntervals: rrData.intervals,
              heartRate: result.bpm
            }
          });
          window.dispatchEvent(event);
          
          console.log("useHeartBeatProcessor: Arrhythmia detected and event dispatched", {
            heartRate: result.bpm,
            time: new Date(now).toISOString()
          });
        } else if (!isArrhythmia) {
          isArrhythmiaRef.current = false;
        }
      }
      
      // Update state with results
      if (result.confidence > 0.4 && result.bpm > 0) {
        setCurrentBPM(result.bpm);
        setConfidence(result.confidence);
        lastValidBpmRef.current = result.bpm;
      }
      
      const processingTime = performance.now() - startTime;
      if (processingTime > 10) {
        console.log(`useHeartBeatProcessor: Slow processing detected: ${processingTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      console.error("useHeartBeatProcessor: Error processing signal", error);
      return {
        bpm: lastValidBpmRef.current,
        confidence: 0.1,
        isPeak: false,
        arrhythmiaCount: 0,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
    }
  }, [processRRIntervals]);
  
  // Request beep on heart beat peak
  const requestBeep = useCallback((value: number): boolean => {
    // This function now handled by AudioManager and PPGSignalMeter
    return true;
  }, []);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    if (processorRef.current) {
      processorRef.current.setMonitoring(true);
    }
  }, []);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (processorRef.current) {
      processorRef.current.setMonitoring(false);
    }
  }, []);
  
  // Reset processor
  const reset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.reset();
    }
    
    resetArrhythmiaDetector();
    setCurrentBPM(0);
    setConfidence(0);
    lastValidBpmRef.current = 0;
    isArrhythmiaRef.current = false;
    
    // Clear diagnostic data
    clearDiagnosticsData();
    
    console.log("useHeartBeatProcessor: Reset complete");
  }, [resetArrhythmiaDetector]);
  
  // Get diagnostics data
  const getDiagnostics = useCallback(() => {
    const qualityStats = getDetailedQualityStats();
    
    return {
      heartRate: currentBPM,
      confidence,
      isMonitoring,
      lastValidBpm: lastValidBpmRef.current,
      arrhythmia: {
        isDetected: isArrhythmiaRef.current,
        lastDetectionTime: lastArrhythmiaAlertTime.current,
        count: processorRef.current?.getArrhythmiaCounter() || 0
      },
      qualityDistribution: qualityStats.qualityDistribution,
      qualityTrend: qualityStats.qualityTrend as any // Fix for TS error
    };
  }, [currentBPM, confidence, isMonitoring]);
  
  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia: isArrhythmiaRef.current,
    requestBeep,
    startMonitoring,
    stopMonitoring,
    getDiagnostics
  };
}
