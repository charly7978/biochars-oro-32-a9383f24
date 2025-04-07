
/**
 * Peak detection utilities for heart rate analysis
 */

// Peak detection diagnostics
let diagnosticsData = {
  peakCounts: 0,
  totalPeaks: 0,
  lastPeakTime: 0,
  peakIntervals: [] as number[],
  thresholdCrossings: 0,
  falsePositives: 0
};

/**
 * Detect if a value is a peak based on value and time
 */
export const detectPeak = (
  value: number, 
  lastPeakTime: number | null, 
  threshold: number = 0.1,
  minInterval: number = 300
): boolean => {
  const now = Date.now();
  
  // Ensure enough time has passed since last peak
  if (lastPeakTime && (now - lastPeakTime) < minInterval) {
    return false;
  }
  
  // Check if value exceeds threshold
  if (value > threshold) {
    diagnosticsData.thresholdCrossings++;
    diagnosticsData.totalPeaks++;
    return true;
  }
  
  return false;
};

/**
 * Calculate heart rate from peak times
 */
export const calculateHeartRate = (peakTimes: number[]): number => {
  if (peakTimes.length < 2) {
    return 0;
  }
  
  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < peakTimes.length; i++) {
    intervals.push(peakTimes[i] - peakTimes[i - 1]);
  }
  
  // Filter out outliers (intervals too short or too long)
  const validIntervals = intervals.filter(
    interval => interval >= 300 && interval <= 1500
  );
  
  if (validIntervals.length === 0) {
    return 0;
  }
  
  // Calculate average interval
  const avgInterval = validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
  
  // Convert to BPM
  return Math.round(60000 / avgInterval);
};

/**
 * Get diagnostics data for debugging
 */
export const getDiagnosticsData = () => {
  return { ...diagnosticsData };
};

/**
 * Clear diagnostics data
 */
export const clearDiagnosticsData = () => {
  diagnosticsData = {
    peakCounts: 0,
    totalPeaks: 0,
    lastPeakTime: 0,
    peakIntervals: [],
    thresholdCrossings: 0,
    falsePositives: 0
  };
};

/**
 * Handle peak detection and trigger beep if needed
 */
export const handlePeakDetection = (
  result: any,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>,
  value: number
): void => {
  // Skip if not monitoring
  if (!isMonitoringRef.current) return;

  // Check if peak detected
  if (result && result.isPeak) {
    const now = Date.now();
    diagnosticsData.lastPeakTime = now;
    
    // Update last peak time
    if (lastPeakTimeRef.current) {
      const interval = now - lastPeakTimeRef.current;
      diagnosticsData.peakIntervals.push(interval);
      
      // Limit array size
      if (diagnosticsData.peakIntervals.length > 10) {
        diagnosticsData.peakIntervals.shift();
      }
    }
    
    lastPeakTimeRef.current = now;
    diagnosticsData.peakCounts++;
    
    // Request beep sound
    requestBeep(value);
  }
};
