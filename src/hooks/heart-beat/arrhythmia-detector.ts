
import { useState, useCallback, useRef } from 'react';

/**
 * Hook for detecting arrhythmias based on heart rate variability
 */
export function useArrhythmiaDetector() {
  const [arrhythmiaCount, setArrhythmiaCount] = useState<number>(0);
  const heartRateVariabilityRef = useRef<number>(0);
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  const lastRRIntervalsRef = useRef<number[]>([]);
  
  // Arrhythmia detection parameters
  const RMSSD_THRESHOLD = 50;  // Root mean square of successive differences threshold
  const RR_VARIATION_THRESHOLD = 0.2;  // RR interval variation threshold (%)
  
  /**
   * Process RR intervals and detect arrhythmia
   */
  const processRRIntervals = useCallback((rrIntervals: number[]): boolean => {
    if (rrIntervals.length < 3) {
      return false;
    }
    
    try {
      // Store the most recent intervals for analysis
      lastRRIntervalsRef.current = [...rrIntervals].slice(-10);
      
      // Calculate RR differences
      const rrDiffs: number[] = [];
      for (let i = 1; i < rrIntervals.length; i++) {
        rrDiffs.push(Math.abs(rrIntervals[i] - rrIntervals[i-1]));
      }
      
      // Calculate RMSSD (Root Mean Square of Successive Differences)
      const squaredDiffs = rrDiffs.map(diff => diff * diff);
      const meanSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
      const rmssd = Math.sqrt(meanSquaredDiff);
      
      // Calculate RR variation (coefficient of variation)
      const mean = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
      const stdDev = Math.sqrt(
        rrIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rrIntervals.length
      );
      const rrVariation = stdDev / mean;
      
      // Store HRV metrics
      heartRateVariabilityRef.current = rmssd;
      
      // Check for arrhythmia conditions
      const isArrhythmic = rmssd > RMSSD_THRESHOLD || rrVariation > RR_VARIATION_THRESHOLD;
      
      if (isArrhythmic && !currentBeatIsArrhythmiaRef.current) {
        setArrhythmiaCount(prev => prev + 1);
        
        // Dispatch arrhythmia window event for visualization
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('arrhythmia-window-detected', {
            detail: {
              start: Date.now(),
              end: Date.now() + 2000, // 2-second window
              rmssd,
              rrVariation
            }
          });
          window.dispatchEvent(event);
        }
      }
      
      currentBeatIsArrhythmiaRef.current = isArrhythmic;
      return isArrhythmic;
    } catch (error) {
      console.error('Error processing RR intervals for arrhythmia:', error);
      return false;
    }
  }, []);
  
  /**
   * Reset arrhythmia detector
   */
  const reset = useCallback(() => {
    setArrhythmiaCount(0);
    heartRateVariabilityRef.current = 0;
    currentBeatIsArrhythmiaRef.current = false;
    lastRRIntervalsRef.current = [];
  }, []);
  
  /**
   * Get arrhythmia count
   */
  const getArrhythmiaCount = useCallback(() => {
    return arrhythmiaCount;
  }, [arrhythmiaCount]);
  
  return {
    processRRIntervals,
    reset,
    getArrhythmiaCount,
    heartRateVariabilityRef,
    currentBeatIsArrhythmiaRef
  };
}
