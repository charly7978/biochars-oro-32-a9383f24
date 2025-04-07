
import { useState, useCallback, useRef, useEffect } from 'react';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';

export function useHeartBeatProcessor() {
  const [bpm, setBpm] = useState(0);
  const [isArrhythmia, setIsArrhythmia] = useState(false);
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const isMonitoringRef = useRef<boolean>(false);
  const lastRRIntervalsRef = useRef<number[]>([]);
  const rrDataRef = useRef<{ intervals: number[], lastPeakTime: number | null }>({
    intervals: [],
    lastPeakTime: null
  });
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize the processor
    if (!processorRef.current) {
      processorRef.current = new HeartBeatProcessor();
    }
    
    // Cleanup when component unmounts
    return () => {
      if (processorRef.current) {
        // Cleanup if processor has a dispose method
      }
    };
  }, []);

  const startMonitoring = useCallback(() => {
    if (processorRef.current) {
      isMonitoringRef.current = true;
      processorRef.current.setMonitoring(true);
      console.log("HeartBeat monitoring started");
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (processorRef.current) {
      isMonitoringRef.current = false;
      processorRef.current.setMonitoring(false);
      console.log("HeartBeat monitoring stopped");
    }
  }, []);

  const processSignal = useCallback((signal: number) => {
    if (!processorRef.current || !isMonitoringRef.current) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        rrData: { intervals: [], lastPeakTime: null },
        arrhythmiaCount: 0
      };
    }

    try {
      // Process the signal value
      const result = processorRef.current.processSignal(signal);
      
      // Update BPM state if confidence is good enough
      if (result.confidence > 0.3 && result.bpm > 0) {
        setBpm(result.bpm);
      }

      // Get RR intervals for arrhythmia detection
      const rrData = processorRef.current.getRRIntervals();
      rrDataRef.current = rrData;
      
      if (rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...rrData.intervals];
      }
      
      // Check for arrhythmia
      const detected = processorRef.current.isArrhythmia();
      currentBeatIsArrhythmiaRef.current = detected;
      setIsArrhythmia(detected);

      // Play beep for peak if monitoring
      if (result.isPeak && isMonitoringRef.current) {
        processorRef.current.playBeep();
      }

      return {
        bpm: result.bpm,
        confidence: result.confidence,
        isPeak: result.isPeak,
        rrData,
        arrhythmiaCount: processorRef.current.getArrhythmiaCounter()
      };
    } catch (e) {
      console.error("Error processing heart beat signal:", e);
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        rrData: { intervals: [], lastPeakTime: null },
        arrhythmiaCount: 0
      };
    }
  }, []);

  const reset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.reset();
      setBpm(0);
      setIsArrhythmia(false);
      lastRRIntervalsRef.current = [];
      currentBeatIsArrhythmiaRef.current = false;
      console.log("HeartBeat processor reset");
    }
  }, []);

  return {
    bpm,
    processSignal,
    isArrhythmia,
    lastRRIntervals: lastRRIntervalsRef.current,
    currentBeatIsArrhythmia: currentBeatIsArrhythmiaRef,
    startMonitoring,
    stopMonitoring,
    reset,
    rrData: rrDataRef.current
  };
}
