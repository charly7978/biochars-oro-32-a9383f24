import { useState, useEffect, useCallback, useRef } from 'react';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';
import { toast } from 'sonner';
import { RRAnalysisResult } from './arrhythmia/types';
import { useBeepProcessor } from './heart-beat/beep-processor';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';
import { useCardiacSignal } from './useCardiacSignal';

export const useHeartBeatProcessor = (): UseHeartBeatReturn => {
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const sessionId = useRef<string>(Math.random().toString(36).substring(2, 9));
  
  const missedBeepsCounter = useRef<number>(0);
  const isMonitoringRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const lastProcessedPeakTimeRef = useRef<number>(0);
  
  // Unified cardiac signal processor
  const { 
    processSignal: processCardiacSignal,
    lastPeak: lastCardiacPeak,
    reset: resetCardiacSignal,
    peakCount,
    arrhythmiaCount
  } = useCardiacSignal();
  
  // Hooks for processing and detection, without functionality of beep
  const { 
    requestImmediateBeep, 
    processBeepQueue, 
    pendingBeepsQueue, 
    lastBeepTimeRef, 
    beepProcessorTimeoutRef, 
    cleanup: cleanupBeepProcessor 
  } = useBeepProcessor();
  
  const {
    detectArrhythmia,
    heartRateVariabilityRef,
    stabilityCounterRef,
    lastRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef,
    reset: resetArrhythmiaDetector
  } = useArrhythmiaDetector();
  
  const {
    processSignal: processSignalInternal,
    reset: resetSignalProcessor,
    lastPeakTimeRef,
    lastValidBpmRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    MAX_CONSECUTIVE_WEAK_SIGNALS
  } = useSignalProcessor();

  useEffect(() => {
    console.log('useHeartBeatProcessor: Initializing new processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!processorRef.current) {
        processorRef.current = new HeartBeatProcessor();
        console.log('HeartBeatProcessor: New instance created - sin audio activado');
        initializedRef.current = true;
        
        if (typeof window !== 'undefined') {
          (window as any).heartBeatProcessor = processorRef.current;
        }
      }
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(true);
        console.log('HeartBeatProcessor: Monitoring state set to true, audio centralizado en PPGSignalMeter');
        isMonitoringRef.current = true;
      }
    } catch (error) {
      console.error('Error initializing HeartBeatProcessor:', error);
      toast.error('Error initializing heartbeat processor');
    }

    return () => {
      console.log('useHeartBeatProcessor: Cleaning up processor', {
        sessionId: sessionId.current,
        timestamp: new Date().toISOString()
      });
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(false);
        processorRef.current = null;
      }
      
      if (typeof window !== 'undefined') {
        (window as any).heartBeatProcessor = undefined;
      }
    };
  }, []);

  // Esta función ahora no hace nada, el beep está centralizado en PPGSignalMeter
  const requestBeep = useCallback((value: number): boolean => {
    console.log('useHeartBeatProcessor: Beep ELIMINADO - Todo el sonido SOLO en PPGSignalMeter', {
      value,
      isMonitoring: isMonitoringRef.current,
      processorExists: !!processorRef.current,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }, []);

  // Effect to update BPM when cardiac peaks are detected
  useEffect(() => {
    if (lastCardiacPeak && isMonitoringRef.current) {
      // Update RR intervals for arrhythmia detection
      const now = Date.now();
      
      if (lastPeakTimeRef.current && lastPeakTimeRef.current > 0) {
        const rrInterval = now - lastPeakTimeRef.current;
        if (rrInterval > 300 && rrInterval < 1500) { // Valid RR interval range
          lastRRIntervalsRef.current.push({
            time: now,
            rrInterval,
            isValid: true
          });
          
          // Keep only recent intervals
          if (lastRRIntervalsRef.current.length > 10) {
            lastRRIntervalsRef.current.shift();
          }
        }
      }
      
      lastPeakTimeRef.current = now;
      
      // Calculate BPM from RR intervals
      if (lastRRIntervalsRef.current.length >= 3) {
        const validIntervals = lastRRIntervalsRef.current
          .filter(item => item.isValid)
          .map(item => item.rrInterval);
          
        if (validIntervals.length >= 3) {
          const avgInterval = validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
          const calculatedBPM = Math.round(60000 / avgInterval);
          
          if (calculatedBPM >= 40 && calculatedBPM <= 200) {
            setCurrentBPM(calculatedBPM);
            
            // Calculate confidence based on stability
            const stdDev = Math.sqrt(
              validIntervals.reduce((sum, interval) => {
                return sum + Math.pow(interval - avgInterval, 2);
              }, 0) / validIntervals.length
            );
            
            const stabilityFactor = Math.max(0, Math.min(1, 1 - (stdDev / avgInterval) * 2));
            const qualityFactor = lastCardiacPeak.confidence;
            const newConfidence = (stabilityFactor * 0.7) + (qualityFactor * 0.3);
            
            setConfidence(newConfidence);
          }
        }
      }
      
      // Update arrhythmia status
      if (lastCardiacPeak.isArrhythmia) {
        currentBeatIsArrhythmiaRef.current = true;
      }
    }
  }, [lastCardiacPeak]);

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

    // Process with original signal processor for backward compatibility
    const result = processSignalInternal(
      value, 
      currentBPM, 
      confidence, 
      processorRef.current, 
      requestBeep, 
      isMonitoringRef, 
      lastRRIntervalsRef, 
      currentBeatIsArrhythmiaRef
    );

    // Process with unified cardiac signal service
    const isPeak = processCardiacSignal(
      value, 
      lastSignalQualityRef.current * 100, 
      { isArrhythmia: currentBeatIsArrhythmiaRef.current }
    );

    // If the original processor detected a peak but CardiacSignalService didn't,
    // or vice versa, log it for analysis
    if (isPeak !== result.isPeak) {
      console.log('Peak detection difference:', {
        cardiacSignalDetectedPeak: isPeak,
        originalProcessorDetectedPeak: result.isPeak,
        value,
        quality: lastSignalQualityRef.current
      });
    }

    // Return the result from the original processor for backward compatibility
    return {
      ...result,
      // Include cardiac signal data
      cardiacPeakCount: peakCount,
      cardiacArrhythmiaCount: arrhythmiaCount
    };
  }, [
    currentBPM, 
    confidence, 
    processSignalInternal, 
    processCardiacSignal,
    requestBeep,
    peakCount,
    arrhythmiaCount
  ]);

  const reset = useCallback(() => {
    console.log('useHeartBeatProcessor: Resetting processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    if (processorRef.current) {
      processorRef.current.setMonitoring(false);
      isMonitoringRef.current = false;
      
      processorRef.current.reset();
      // No iniciamos audio aquí, está centralizado en PPGSignalMeter
    }
    
    setCurrentBPM(0);
    setConfidence(0);
    
    resetArrhythmiaDetector();
    resetSignalProcessor();
    resetCardiacSignal();
    
    missedBeepsCounter.current = 0;
    lastProcessedPeakTimeRef.current = 0;
    
    cleanupBeepProcessor();
  }, [resetArrhythmiaDetector, resetSignalProcessor, cleanupBeepProcessor, resetCardiacSignal]);

  const startMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Starting monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = true;
      processorRef.current.setMonitoring(true);
      console.log('HeartBeatProcessor: Monitoring state set to true');
      
      lastPeakTimeRef.current = null;
      lastBeepTimeRef.current = 0;
      lastProcessedPeakTimeRef.current = 0;
      pendingBeepsQueue.current = [];
      consecutiveWeakSignalsRef.current = 0;
      
      // No iniciamos audio ni test beep aquí, está centralizado en PPGSignalMeter
      
      if (beepProcessorTimeoutRef.current) {
        clearTimeout(beepProcessorTimeoutRef.current);
        beepProcessorTimeoutRef.current = null;
      }
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Stopping monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = false;
      processorRef.current.setMonitoring(false);
      console.log('HeartBeatProcessor: Monitoring state set to false');
    }
    
    cleanupBeepProcessor();
    
    setCurrentBPM(0);
    setConfidence(0);
  }, [cleanupBeepProcessor]);

  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia: currentBeatIsArrhythmiaRef.current,
    requestBeep,
    startMonitoring,
    stopMonitoring
  };
};
