import { useState, useRef, useCallback } from 'react';

/**
 * Hook for arrhythmia detection using RR intervals
 * Direct measurement only, no simulation
 */
export function useArrhythmiaDetector() {
  // Store HRV measures
  const heartRateVariabilityRef = useRef<number[]>([]);
  
  // Track stability of rhythm
  const stabilityCounterRef = useRef<number>(0);
  
  // Store the recent RR intervals for analysis
  const lastRRIntervalsRef = useRef<number[]>([]);
  
  // Track if current beat is arrhythmic
  const lastIsArrhythmiaRef = useRef<boolean>(false);
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  
  // Constants for detection
  const RR_VARIATION_THRESHOLD = 0.18; // 18% variation is considered potentially arrhythmic
  const CONSECUTIVE_THRESHOLD = 3; // Need 3 consecutive abnormal beats to confirm
  
  // Process RR intervals to detect arrhythmias
  const processRRIntervals = useCallback((intervals: number[]): boolean => {
    // Need at least 3 intervals for meaningful analysis
    if (!intervals || intervals.length < 3) {
      return false;
    }
    
    // Store intervals for external use
    lastRRIntervalsRef.current = intervals.slice(-10); // Keep last 10 intervals
    
    // Calculate average interval (normal expected interval)
    const validIntervals = intervals.filter(i => i >= 300 && i <= 2000);
    if (validIntervals.length < 3) {
      return false;
    }
    
    const avgInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
    
    // Get the last interval
    const lastInterval = validIntervals[validIntervals.length - 1];
    
    // Calculate deviation from average (normalized)
    const deviation = Math.abs(lastInterval - avgInterval) / avgInterval;
    
    // Calculate heart rate variability (RMSSD method)
    const rmssd = calculateRMSSD(validIntervals.slice(-5));
    heartRateVariabilityRef.current.push(rmssd);
    
    // Keep HRV buffer at reasonable size
    if (heartRateVariabilityRef.current.length > 20) {
      heartRateVariabilityRef.current.shift();
    }
    
    // Detect potential arrhythmia based on variation
    const isPotentialArrhythmia = deviation > RR_VARIATION_THRESHOLD;
    
    // Update consecutive counter
    if (isPotentialArrhythmia) {
      stabilityCounterRef.current = 0;
      currentBeatIsArrhythmiaRef.current = true;
    } else {
      stabilityCounterRef.current++;
      
      // If we've had enough stable beats, clear arrhythmia flag
      if (stabilityCounterRef.current >= CONSECUTIVE_THRESHOLD) {
        currentBeatIsArrhythmiaRef.current = false;
      }
    }
    
    // Remember last state
    lastIsArrhythmiaRef.current = currentBeatIsArrhythmiaRef.current;
    
    return currentBeatIsArrhythmiaRef.current;
  }, []);
  
  // Reset all state
  const reset = useCallback(() => {
    heartRateVariabilityRef.current = [];
    stabilityCounterRef.current = 0;
    lastRRIntervalsRef.current = [];
    lastIsArrhythmiaRef.current = false;
    currentBeatIsArrhythmiaRef.current = false;
  }, []);
  
  // Return the detector interface
  return {
    processRRIntervals,
    heartRateVariabilityRef,
    stabilityCounterRef,
    lastRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef,
    reset
  };
}

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * Standard measure of heart rate variability
 */
function calculateRMSSD(intervals: number[]): number {
  if (intervals.length < 2) {
    return 0;
  }
  
  let sumSquaredDiffs = 0;
  for (let i = 1; i < intervals.length; i++) {
    const diff = intervals[i] - intervals[i - 1];
    sumSquaredDiffs += diff * diff;
  }
  
  return Math.sqrt(sumSquaredDiffs / (intervals.length - 1));
}
