
import { useState, useRef, useEffect, useCallback } from 'react';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';

/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
export function useHeartBeatProcessor(): UseHeartBeatReturn {
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [isArrhythmia, setIsArrhythmia] = useState<boolean>(false);
  const [lastHeartBeatResult, setLastHeartBeatResult] = useState<HeartBeatResult | null>(null);
  const isMonitoringRef = useRef<boolean>(false);
  const lastRRIntervalsRef = useRef<number[]>([]);
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  const lastBeepTimeRef = useRef<number>(0);
  
  // Obtain processor and detector
  const arrhythmiaDetector = useArrhythmiaDetector();
  const signalProcessor = useSignalProcessor();

  // Extract values for improved readability
  const { 
    detectArrhythmia,
    heartRateVariabilityRef, 
    stabilityCounterRef,
    lastRRIntervalsRef: detectorRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef: detectorCurrentBeatIsArrhythmiaRef,
    processRRIntervals
  } = arrhythmiaDetector;
  
  /**
   * Process a single signal value and detect heartbeats
   * Only processes real data - no simulation
   */
  const processSignal = useCallback((value: number): HeartBeatResult => {
    try {
      // Process signal through processor with improved parameter amplitudes
      const result = signalProcessor.processSignal(
        value,
        currentBPM,
        confidence,
        {
          processSignal: (val: number) => {
            // Simple peak detection for direct signals
            const amplitude = Math.abs(val);
            const threshold = 0.1; // Adjusted threshold
            const minInterval = 300; // Minimum interval between beats (ms)
            const now = Date.now();
            
            const isPeak = amplitude > threshold && 
              (now - lastBeepTimeRef.current) > minInterval;
            
            if (isPeak) {
              lastBeepTimeRef.current = now;
            }
            
            return {
              isPeak,
              bpm: currentBPM, // Maintain current BPM if already calculated
              confidence: amplitude > threshold ? 0.7 : 0.3,
              arrhythmiaCount: 0
            };
          },
          getRRIntervals: () => {
            return { 
              intervals: lastRRIntervalsRef.current, 
              lastPeakTime: lastBeepTimeRef.current 
            };
          },
          getArrhythmiaCounter: () => 0
        },
        requestBeep,
        isMonitoringRef,
        lastRRIntervalsRef,
        currentBeatIsArrhythmiaRef
      );
      
      // Update states with new values
      if (result.bpm > 0 && result.confidence > 0.3) {
        // Smooth BPM updates for better visual stability
        setCurrentBPM(prev => {
          // Apply weighted average for smoother transitions
          if (prev === 0) return result.bpm;
          return Math.round((prev * 0.8) + (result.bpm * 0.2));
        });
      }
      
      // Update confidence level
      setConfidence(result.confidence);
      
      // Check for arrhythmias using the detector
      if (lastRRIntervalsRef.current.length > 3) {
        const isCurrentArrhythmia = processRRIntervals(lastRRIntervalsRef.current);
        
        // Update arrhythmia state based on detector results
        setIsArrhythmia(isCurrentArrhythmia);
        
        // Enrich result with arrhythmia information
        result.isArrhythmia = isCurrentArrhythmia;
      }
      
      // Store the most recent heartbeat result for visualization
      setLastHeartBeatResult(result);
      
      return result;
    } catch (error) {
      console.error("Error in processSignal:", error);
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        isArrhythmia: false,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
    }
  }, [
    currentBPM,
    confidence,
    signalProcessor,
    processRRIntervals
  ]);
  
  /**
   * Handles beep requests for heart beat visualization
   */
  const requestBeep = useCallback((value: number): boolean => {
    if (!isMonitoringRef.current) return false;
    
    try {
      // Ensure reasonable delay between beeps to reduce audio noise
      const now = Date.now();
      const minBeepInterval = 300; // ms
      
      if (now - lastBeepTimeRef.current < minBeepInterval) {
        return false;
      }
      
      lastBeepTimeRef.current = now;
      
      // Here you would trigger an actual beep sound if desired
      // This function now just returns success without audio
      
      return true;
    } catch (error) {
      console.error("Error requesting beep:", error);
      return false;
    }
  }, []);
  
  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setCurrentBPM(0);
    setConfidence(0);
    setIsArrhythmia(false);
    isMonitoringRef.current = false;
    lastRRIntervalsRef.current = [];
    currentBeatIsArrhythmiaRef.current = false;
    lastBeepTimeRef.current = 0;
    setLastHeartBeatResult(null);
    
    // Reset processor and detector
    signalProcessor.reset();
    arrhythmiaDetector.reset();
  }, [signalProcessor, arrhythmiaDetector]);
  
  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    isMonitoringRef.current = true;
  }, []);
  
  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
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
    lastHeartBeatResult
  };
}
