
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
 * Simplified signature to match how it's called in signal-processor.ts
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

/**
 * Enhances visualization data for better graph rendering
 * @param data Raw signal data
 * @returns Enhanced data for visualization
 */
export function enhanceVisualizationData(data: number[]): number[] {
  if (!data || data.length === 0) return [];
  
  // Calculate average for normalization
  const sum = data.reduce((acc, val) => acc + val, 0);
  const avg = sum / data.length;
  
  // Enhance signal amplitude for better visualization
  return data.map(val => {
    // Center around zero and amplify differences
    const centered = val - avg;
    // Apply amplification factor (higher for small values, lower for large values)
    const amplificationFactor = Math.min(3, 2.5 / (Math.abs(centered) + 0.5));
    // Return amplified centered value
    return centered * amplificationFactor;
  });
}

/**
 * Prepares data for PPG graph rendering
 * @param buffer Signal buffer
 * @param peaks Peak information array
 * @returns Formatted data for graph
 */
export function prepareGraphData(buffer: number[], peaks: boolean[] = []): any[] {
  if (!buffer || buffer.length === 0) return [];
  
  return buffer.map((value, index) => {
    const isPeak = index < peaks.length ? peaks[index] : false;
    return {
      time: index,
      value: value,
      isPeak: isPeak
    };
  });
}
