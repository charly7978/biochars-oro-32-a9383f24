
import { useCallback, useRef, useState } from 'react';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';
import { RRIntervalData } from '../types/vital-signs';
import { ArrhythmiaWindow } from '../types/signal';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';

/**
 * Hook for heart beat processing
 */
export function useHeartBeatProcessor(): UseHeartBeatReturn {
  // Current values
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [isArrhythmia, setIsArrhythmia] = useState<boolean>(false);
  const [arrhythmiaWindows, setArrhythmiaWindows] = useState<ArrhythmiaWindow[]>([]);
  
  // Monitoring state
  const isMonitoringRef = useRef<boolean>(false);
  
  // Last RR intervals
  const lastRRIntervalsRef = useRef<number[]>([]);
  
  // Instantiate the arrhythmia detector
  const { 
    processRRIntervals,
    currentBeatIsArrhythmiaRef,
    getArrhythmiaCount,
    getArrhythmiaWindows,
    reset: resetArrhythmia
  } = useArrhythmiaDetector();
  
  // Instantiate the signal processor
  const { 
    processSignal: processSignalInternal,
    reset: resetProcessor
  } = useSignalProcessor();
  
  // Audio context for beep sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Initialize audio context
  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    if (!audioContextRef.current && typeof AudioContext !== 'undefined') {
      try {
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (err) {
        console.error("Error creating audio context:", err);
      }
    }
  }, []);
  
  // Play beep sound
  const requestBeep = useCallback((value: number): boolean => {
    if (!isMonitoringRef.current) return false;
    
    try {
      if (!audioContextRef.current) {
        initAudio();
      }
      
      if (!audioContextRef.current || !gainNodeRef.current) return false;
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Create oscillator
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.value = currentBeatIsArrhythmiaRef.current ? 800 : 900;
      
      // Connect and configure gain
      oscillatorRef.current.connect(gainNodeRef.current);
      const now = audioContextRef.current.currentTime;
      gainNodeRef.current.gain.cancelScheduledValues(now);
      gainNodeRef.current.gain.setValueAtTime(0, now);
      gainNodeRef.current.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      // Start and stop oscillator
      oscillatorRef.current.start(now);
      oscillatorRef.current.stop(now + 0.1);
      
      return true;
    } catch (err) {
      console.error("Error playing beep:", err);
      return false;
    }
  }, [initAudio, currentBeatIsArrhythmiaRef]);
  
  // Process signal
  const processSignal = useCallback((value: number): HeartBeatResult => {
    const result = processSignalInternal(
      value,
      currentBPM,
      confidence,
      { getArrhythmiaCounter: getArrhythmiaCount },
      requestBeep,
      isMonitoringRef,
      lastRRIntervalsRef,
      currentBeatIsArrhythmiaRef
    );
    
    // Process RR intervals for arrhythmia detection
    if (result.rrData.intervals.length > 0) {
      processRRIntervals(result.rrData.intervals);
      
      // Update arrhythmia windows
      setArrhythmiaWindows(getArrhythmiaWindows());
    }
    
    // Update state
    setCurrentBPM(result.bpm);
    setConfidence(result.confidence);
    setIsArrhythmia(currentBeatIsArrhythmiaRef.current);
    
    return {
      ...result,
      isArrhythmia: currentBeatIsArrhythmiaRef.current,
      arrhythmiaWindows: getArrhythmiaWindows()
    };
  }, [
    processSignalInternal, 
    currentBPM, 
    confidence, 
    requestBeep, 
    processRRIntervals, 
    getArrhythmiaCount,
    getArrhythmiaWindows,
    currentBeatIsArrhythmiaRef
  ]);
  
  // Reset all state
  const reset = useCallback(() => {
    setCurrentBPM(0);
    setConfidence(0);
    setIsArrhythmia(false);
    setArrhythmiaWindows([]);
    isMonitoringRef.current = false;
    lastRRIntervalsRef.current = [];
    resetProcessor();
    resetArrhythmia();
    
    // Clean up audio
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (err) {
        // Ignore errors during cleanup
      }
      oscillatorRef.current = null;
    }
  }, [resetProcessor, resetArrhythmia]);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    initAudio();
    isMonitoringRef.current = true;
  }, [initAudio]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
  }, []);
  
  return {
    currentBPM,
    confidence,
    isArrhythmia,
    arrhythmiaWindows,
    processSignal,
    reset,
    requestBeep,
    startMonitoring,
    stopMonitoring
  };
}
