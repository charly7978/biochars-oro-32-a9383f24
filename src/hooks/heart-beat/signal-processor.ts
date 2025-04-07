
import { useCallback, useRef } from 'react';
import { HeartBeatResult, RRIntervalData } from '../vital-signs/types';
import { HeartBeatConfig } from '../../modules/heart-beat/config';
import { 
  checkWeakSignal, 
  shouldProcessMeasurement, 
  createWeakSignalResult, 
  handlePeakDetection,
  updateLastValidBpm,
  processLowConfidenceResult
} from './signal-processing';

export function useSignalProcessor() {
  const lastPeakTimeRef = useRef<number | null>(null);
  const consistentBeatsCountRef = useRef<number>(0);
  const lastValidBpmRef = useRef<number>(0);
  const calibrationCounterRef = useRef<number>(0);
  const lastSignalQualityRef = useRef<number>(0);
  
  // Simple reference counter for compatibility
  const consecutiveWeakSignalsRef = useRef<number>(0);
  const WEAK_SIGNAL_THRESHOLD = HeartBeatConfig.LOW_SIGNAL_THRESHOLD; 
  const MAX_CONSECUTIVE_WEAK_SIGNALS = HeartBeatConfig.LOW_SIGNAL_FRAMES;

  const processSignal = useCallback((
    value: number,
    currentBPM: number,
    confidence: number,
    processor: any,
    requestImmediateBeep: (value: number) => boolean,
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastRRIntervalsRef: React.MutableRefObject<number[]>,
    currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>
  ): HeartBeatResult => {
    if (!processor) {
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
      calibrationCounterRef.current++;
      
      // Check for weak signal - fixed implementation
      const result = checkWeakSignal(value, consecutiveWeakSignalsRef.current);
      
      const isWeakSignal = result.isWeakSignal;
      consecutiveWeakSignalsRef.current = result.updatedCount;
      
      if (isWeakSignal) {
        return {
          bpm: 0,
          confidence: 0,
          isPeak: false,
          arrhythmiaCount: processor.getArrhythmiaCounter ? processor.getArrhythmiaCounter() : 0,
          rrData: {
            intervals: [],
            lastPeakTime: null
          }
        };
      }
      
      // Only process signals with sufficient amplitude
      if (!shouldProcessMeasurement(value)) {
        return {
          bpm: 0,
          confidence: 0,
          isPeak: false,
          arrhythmiaCount: processor.getArrhythmiaCounter ? processor.getArrhythmiaCounter() : 0,
          rrData: {
            intervals: [],
            lastPeakTime: null
          }
        };
      }
      
      // Process real signal
      const processorResult = processor.processSignal(value);
      const rrData = processor.getRRIntervals();
      
      if (rrData && rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...rrData.intervals];
      }
      
      // Handle peak detection
      handlePeakDetection(
        processorResult, 
        lastPeakTimeRef, 
        requestImmediateBeep,
        isMonitoringRef
      );
      
      // Update last valid BPM
      updateLastValidBpm(processorResult.bpm, processorResult.confidence);
      
      lastSignalQualityRef.current = processorResult.confidence;

      // Process result with proper parameters
      const finalResult = processLowConfidenceResult(processorResult);
      
      return {
        bpm: finalResult.bpm || currentBPM,
        confidence: finalResult.confidence,
        isPeak: finalResult.isPeak,
        arrhythmiaCount: processor.getArrhythmiaCounter ? processor.getArrhythmiaCounter() : 0,
        rrData: {
          intervals: lastRRIntervalsRef.current,
          lastPeakTime: lastPeakTimeRef.current
        }
      };
    } catch (error) {
      console.error('useHeartBeatProcessor: Error processing signal', error);
      return {
        bpm: currentBPM,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
    }
  }, []);

  const reset = useCallback(() => {
    lastPeakTimeRef.current = null;
    consistentBeatsCountRef.current = 0;
    lastValidBpmRef.current = 0;
    calibrationCounterRef.current = 0;
    lastSignalQualityRef.current = 0;
    consecutiveWeakSignalsRef.current = 0;
  }, []);

  return {
    processSignal,
    reset,
    lastPeakTimeRef,
    lastValidBpmRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    MAX_CONSECUTIVE_WEAK_SIGNALS
  };
}
