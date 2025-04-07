/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Index file for signal processing utilities
 */
export * from './signal-quality';
export * from './peak-detection';
export * from './result-processor';
export * from './adaptive-control';

// Export specific functions for direct use
export { 
  checkWeakSignal, 
  shouldProcessMeasurement, 
  createWeakSignalResult,
  resetSignalQualityState,
  isFingerDetected
} from './signal-quality';

// Export specific functions from peak-detection
export {
  detectPeak,
  detectPeaks,
  calculateHeartRate,
  getDiagnosticsData,
  clearDiagnosticsData,
  handlePeakDetection
} from './peak-detection';

export { 
  updateLastValidBpm, 
  processLowConfidenceResult,
  getLastValidMeasurements,
  resetValidMeasurements
} from './result-processor';

export {
  applyAdaptiveFilter,
  predictNextValue,
  correctSignalAnomalies,
  updateQualityWithPrediction,
  resetAdaptiveControl,
  getAdaptiveModelState,
  applyBayesianOptimization,
  applyGaussianProcessModeling,
  applyMixedModelPrediction
} from './adaptive-control';

// Export buffer utilities
export * from './optimized-buffer';
export * from './safe-buffer';

import { useCallback, useRef, useState } from 'react';
import { detectPeak, calculateHeartRate, handlePeakDetection } from './peak-detection';

// Constants
const MIN_QUALITY_THRESHOLD = 20;
const MAX_CONSECUTIVE_WEAK_SIGNALS = 30;
const PEAK_THRESHOLD = 0.1;
const MIN_PEAK_INTERVAL_MS = 400;

export function useSignalProcessor() {
  // State for tracking signal quality
  const lastPeakTimeRef = useRef<number | null>(null);
  const peakTimesRef = useRef<number[]>([]);
  const lastValidBpmRef = useRef<number>(0);
  const lastSignalQualityRef = useRef<number>(0);
  const consecutiveWeakSignalsRef = useRef<number>(0);
  
  // Reset all state
  const reset = useCallback(() => {
    lastPeakTimeRef.current = null;
    peakTimesRef.current = [];
    lastValidBpmRef.current = 0;
    lastSignalQualityRef.current = 0;
    consecutiveWeakSignalsRef.current = 0;
  }, []);
  
  // Process an incoming signal value
  const processSignal = useCallback((
    value: number,
    currentBPM: number,
    confidence: number,
    processor: any, 
    requestBeep: (value: number) => boolean,
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastRRIntervalsRef: React.MutableRefObject<number[]>,
    currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>
  ) => {
    const now = Date.now();
    
    // Check for weak signal
    if (Math.abs(value) < 0.05) {
      consecutiveWeakSignalsRef.current++;
      if (consecutiveWeakSignalsRef.current > MAX_CONSECUTIVE_WEAK_SIGNALS) {
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
    } else {
      consecutiveWeakSignalsRef.current = Math.max(0, consecutiveWeakSignalsRef.current - 1);
    }
    
    // Detect peak
    const isPeak = handlePeakDetection(
      value, 
      PEAK_THRESHOLD, 
      MIN_PEAK_INTERVAL_MS,
      lastPeakTimeRef,
      peakTimesRef,
      () => {
        if (isMonitoringRef.current) {
          requestBeep(value);
        }
      }
    );
    
    // Calculate BPM from peaks
    const bpm = calculateHeartRate(peakTimesRef.current);
    
    // Only update reference if we have a valid BPM
    if (bpm > 0) {
      lastValidBpmRef.current = bpm;
    }
    
    // Update RR intervals
    let rrInterval: number | null = null;
    if (isPeak && lastPeakTimeRef.current !== null) {
      rrInterval = now - lastPeakTimeRef.current;
      
      // Add to intervals array if valid
      if (rrInterval > 300 && rrInterval < 2000) {
        lastRRIntervalsRef.current.push(rrInterval);
        
        // Keep array size manageable
        if (lastRRIntervalsRef.current.length > 20) {
          lastRRIntervalsRef.current.shift();
        }
      }
    }
    
    // Calculate confidence
    let calculatedConfidence = 0;
    if (peakTimesRef.current.length >= 3) {
      // Calculate average interval
      const intervals = [];
      for (let i = 1; i < peakTimesRef.current.length; i++) {
        intervals.push(peakTimesRef.current[i] - peakTimesRef.current[i-1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Calculate regularity (lower variability = higher confidence)
      let variability = 0;
      for (const interval of intervals) {
        variability += Math.pow(interval - avgInterval, 2);
      }
      variability = Math.sqrt(variability / intervals.length) / avgInterval;
      
      calculatedConfidence = Math.max(0, Math.min(1, 1 - variability));
    }
    
    // Use processor's arrhythmia counter if available
    const arrhythmiaCount = processor?.getArrhythmiaCounter ? 
      processor.getArrhythmiaCounter() : 0;
    
    return {
      bpm: bpm > 0 ? bpm : lastValidBpmRef.current,
      confidence: calculatedConfidence,
      isPeak,
      arrhythmiaCount,
      isArrhythmia: currentBeatIsArrhythmiaRef.current,
      rrData: {
        intervals: lastRRIntervalsRef.current,
        lastPeakTime: lastPeakTimeRef.current
      }
    };
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
