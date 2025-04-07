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
    
    // Execute callback if provided
    if (callback) callback();
  }
  
  return isPeak;
};
