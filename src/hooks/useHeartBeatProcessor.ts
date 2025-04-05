import { useState, useCallback, useRef, useEffect } from 'react';
import { HeartBeatResult } from './heart-beat/types';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';

/**
 * Hook for processing heart beat signals
 */
export function useHeartBeatProcessor() {
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [lastValidValue, setLastValidValue] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isArrhythmia, setIsArrhythmia] = useState<boolean>(false);

  const detectorRef = useRef<any | null>(null);
  const monitoringRef = useRef<boolean>(false);
  const lastRRIntervalsRef = useRef<number[]>([]);
  const lastBeepTimeRef = useRef<number>(0);
  const heartbeatAudioRef = useRef<AudioContext | null>(null);
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  
  // Use arrhythmia detector for enhanced detection
  const {
    processRRIntervals,
    reset: resetArrhythmia,
    heartRateVariabilityRef,
    currentBeatIsArrhythmiaRef: arrhythmiaDataRef
  } = useArrhythmiaDetector();
  
  // Initialize processor if needed
  useEffect(() => {
    if (!detectorRef.current) {
      try {
        console.log("useHeartBeatProcessor: Initializing new processor", {
          sessionId: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString()
        });
        
        // For now, we'll just use a simplified detector object instead of HeartBeatDetector
        detectorRef.current = {
          processSignal: (value: number): HeartBeatResult => {
            return {
              bpm: value > 0 ? Math.floor(60 + value * 20) : 0,
              confidence: value > 0.1 ? 0.7 : 0.3,
              isPeak: value > 0.5,
              arrhythmiaCount: 0,
              rrData: {
                intervals: [],
                lastPeakTime: null
              }
            };
          },
          reset: () => {},
          getArrhythmiaCounter: () => 0
        };
      } catch (err) {
        console.error("Error initializing heart beat detector:", err);
      }
    }
  }, []);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    monitoringRef.current = true;
    
    // Initialize audio if not already
    if (!heartbeatAudioRef.current && typeof AudioContext !== 'undefined') {
      try {
        heartbeatAudioRef.current = new AudioContext();
      } catch (err) {
        console.error("Error creating audio context:", err);
      }
    }
    
    console.log("HeartBeatProcessor: Monitoring state set to true");
  }, []);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    monitoringRef.current = false;
    console.log("HeartBeatProcessor: Monitoring stopped");
    
    // Close audio context if it exists
    if (heartbeatAudioRef.current) {
      heartbeatAudioRef.current.close().catch(err => {
        console.error("Error closing audio context:", err);
      });
      heartbeatAudioRef.current = null;
    }
  }, []);
  
  /**
   * Process a PPG signal and extract heart beat information
   */
  const processSignal = useCallback((value: number): HeartBeatResult => {
    if (!detectorRef.current) {
      console.error("Heart beat detector not initialized");
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
      // Get results from detector
      const result = detectorRef.current.processSignal(value);
      
      // Update RR intervals for arrhythmia detection
      if (result.rrData && result.rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...result.rrData.intervals];
        
        // Check for arrhythmia
        if (lastRRIntervalsRef.current.length >= 3) {
          const isArrhythmic = processRRIntervals(lastRRIntervalsRef.current);
          currentBeatIsArrhythmiaRef.current = isArrhythmic;
          
          // Update global arrhythmia state
          if (isArrhythmic !== isArrhythmia) {
            setIsArrhythmia(isArrhythmic);
          }
          
          // Assign arrhythmia detection to result
          if (isArrhythmic) {
            result.isArrhythmia = true;
          }
        }
      }
      
      // Update state
      if (result.bpm > 0 && result.confidence > 0.4) {
        setCurrentBPM(result.bpm);
        setConfidence(result.confidence);
        
        if (result.confidence > 0.6) {
          setLastValidValue(value);
        }
      }
      
      // Get arrhythmia status from detector
      result.isArrhythmia = result.isArrhythmia || currentBeatIsArrhythmiaRef.current;
      
      // Include filtered value for display purposes
      result.filteredValue = value;
      
      return result;
    } catch (error) {
      console.error("Error processing heart beat signal:", error);
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
  }, [isArrhythmia, processRRIntervals]);
  
  /**
   * Request a beep sound for heartbeats
   */
  const requestBeep = useCallback((value: number): boolean => {
    const now = Date.now();
    if (now - lastBeepTimeRef.current < 300) return false; // Prevent too frequent beeps
    
    try {
      if (heartbeatAudioRef.current && heartbeatAudioRef.current.state === 'running') {
        const oscillator = heartbeatAudioRef.current.createOscillator();
        const gainNode = heartbeatAudioRef.current.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        
        gainNode.gain.setValueAtTime(0, heartbeatAudioRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, heartbeatAudioRef.current.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, heartbeatAudioRef.current.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(heartbeatAudioRef.current.destination);
        
        oscillator.start();
        oscillator.stop(heartbeatAudioRef.current.currentTime + 0.1);
        
        lastBeepTimeRef.current = now;
        return true;
      }
    } catch (error) {
      console.error("Error playing beep:", error);
    }
    
    return false;
  }, []);
  
  /**
   * Reset the processor to its initial state
   */
  const reset = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
    }
    
    resetArrhythmia();
    lastRRIntervalsRef.current = [];
    currentBeatIsArrhythmiaRef.current = false;
    
    setCurrentBPM(0);
    setConfidence(0);
    setIsArrhythmia(false);
    
    console.log("HeartBeatProcessor: Reset completed");
  }, [resetArrhythmia]);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    monitoringRef.current = true;
    
    // Initialize audio if not already
    if (!heartbeatAudioRef.current && typeof AudioContext !== 'undefined') {
      try {
        heartbeatAudioRef.current = new AudioContext();
      } catch (err) {
        console.error("Error creating audio context:", err);
      }
    }
    
    console.log("HeartBeatProcessor: Monitoring state set to true");
  }, []);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    monitoringRef.current = false;
    console.log("HeartBeatProcessor: Monitoring stopped");
    
    // Close audio context if it exists
    if (heartbeatAudioRef.current) {
      heartbeatAudioRef.current.close().catch(err => {
        console.error("Error closing audio context:", err);
      });
      heartbeatAudioRef.current = null;
    }
  }, []);
  
  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia,
    requestBeep,
    startMonitoring,
    stopMonitoring,
    heartRateVariabilityRef,
    lastRRIntervalsRef,
    audioContext: heartbeatAudioRef.current
  };
}
