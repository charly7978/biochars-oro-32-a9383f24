
import { useRef } from 'react';

/**
 * Detect peaks in a signal
 */
export const detectPeak = (
  value: number,
  threshold: number,
  minTimeBetweenPeaks: number,
  lastPeakTime: number | null
): boolean => {
  const now = Date.now();
  
  // Check if enough time has passed since last peak
  if (lastPeakTime !== null && (now - lastPeakTime) < minTimeBetweenPeaks) {
    return false;
  }
  
  // Simple threshold-based peak detection
  return value >= threshold;
};

/**
 * Detect multiple peaks in a signal array
 * (Added function to match imports)
 */
export const detectPeaks = (
  signalValues: number[],
  threshold: number,
  minDistance = 5
): number[] => {
  const peaks: number[] = [];
  
  if (signalValues.length <= 2) return peaks;
  
  for (let i = 1; i < signalValues.length - 1; i++) {
    // Check if this point is higher than threshold and higher than neighbors
    if (signalValues[i] >= threshold && 
        signalValues[i] > signalValues[i-1] && 
        signalValues[i] > signalValues[i+1]) {
      
      // Check if we're far enough from the last detected peak
      if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
};

/**
 * Calculate heart rate from peaks
 */
export const calculateHeartRate = (peakTimes: number[], minBpm: number = 40, maxBpm: number = 180): number => {
  if (peakTimes.length < 3) {
    return 0;
  }
  
  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < peakTimes.length; i++) {
    intervals.push(peakTimes[i] - peakTimes[i-1]);
  }
  
  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  
  // Convert to BPM
  const bpm = Math.round(60000 / avgInterval);
  
  // Ensure it's in physiological range
  return Math.min(maxBpm, Math.max(minBpm, bpm));
};

// Diagnostics-related functions
let diagnosticsData: {
  peakValues: number[];
  timestamps: number[];
  thresholds: number[];
} = {
  peakValues: [],
  timestamps: [],
  thresholds: []
};

/**
 * Get diagnostic data for peak detection
 */
export const getDiagnosticsData = () => {
  return { ...diagnosticsData };
};

/**
 * Clear diagnostic data
 */
export const clearDiagnosticsData = () => {
  diagnosticsData = {
    peakValues: [],
    timestamps: [],
    thresholds: []
  };
};

/**
 * Handle peak detection and update state
 */
export const handlePeakDetection = (
  value: number,
  threshold: number,
  minTimeBetweenPeaks: number,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  peakTimesRef: React.MutableRefObject<number[]>,
  callback?: () => void
): boolean => {
  const now = Date.now();
  
  // Check if it's a peak
  const isPeak = detectPeak(value, threshold, minTimeBetweenPeaks, lastPeakTimeRef.current);
  
  if (isPeak) {
    // Update last peak time
    lastPeakTimeRef.current = now;
    
    // Add to peak times array
    peakTimesRef.current.push(now);
    
    // Keep array size manageable
    if (peakTimesRef.current.length > 20) {
      peakTimesRef.current.shift();
    }
    
    // Store diagnostics data
    diagnosticsData.peakValues.push(value);
    diagnosticsData.timestamps.push(now);
    diagnosticsData.thresholds.push(threshold);
    
    if (diagnosticsData.peakValues.length > 50) {
      diagnosticsData.peakValues.shift();
      diagnosticsData.timestamps.shift();
      diagnosticsData.thresholds.shift();
    }
    
    // Execute callback if provided
    if (callback) callback();
  }
  
  return isPeak;
};
