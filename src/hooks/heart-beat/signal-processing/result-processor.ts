
/**
 * Functions for processing signal results
 */
import React from 'react';

/**
 * Process signal results with low confidence
 */
export function processLowConfidenceResult(
  result: any, 
  currentBPM: number,
  arrhythmiaCounter: number = 0
): any {
  // If confidence is very low, don't update values
  if (result.confidence < 0.25) {
    return {
      bpm: currentBPM,
      confidence: result.confidence,
      isPeak: false,
      arrhythmiaCount: arrhythmiaCounter || 0,
      rrData: {
        intervals: [],
        lastPeakTime: null
      }
    };
  }
  
  return result;
}

/**
 * Updates the reference to last valid BPM when condition is met
 */
export function updateLastValidBpm(result: any, lastValidBpmRef: React.MutableRefObject<number>): void {
  if (result.bpm >= 40 && result.bpm <= 200) {
    lastValidBpmRef.current = result.bpm;
  }
}

/**
 * Handle peak detection
 * Compatible with both simplified and complete call signatures
 */
export function handlePeakDetection(
  result: any, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestBeepCallback: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  const now = Date.now();
  
  // Only process peaks with minimum confidence
  if (result.isPeak && result.confidence > 0.4) {
    lastPeakTimeRef.current = now;
    
    // If monitoring is active and confidence is high enough, trigger beep
    if ((!isMonitoringRef || isMonitoringRef.current) && result.confidence > 0.5) {
      requestBeepCallback(value || 1);  // Use provided value or default to 1
    }
  }
}
