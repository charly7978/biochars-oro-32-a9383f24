
/**
 * Peak detection functions for heart beat processing
 */

/**
 * Handle peak detection and update state
 */
export function handlePeakDetection(
  result: any, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>
) {
  if (result.isPeak) {
    const now = Date.now();
    lastPeakTimeRef.current = now;
    
    if (isMonitoringRef.current && requestImmediateBeep) {
      requestImmediateBeep(result.value);
    }
  }
}

/**
 * Detect if current value is a peak
 */
export function detectPeak(
  value: number,
  previousValues: number[],
  threshold: number
): boolean {
  if (previousValues.length < 3) return false;
  
  const isPeak = value > threshold &&
    previousValues.every(prev => value > prev);
  
  return isPeak;
}

/**
 * Detect peaks in a series of values
 */
export function detectPeaks(
  values: number[],
  threshold: number
): number[] {
  const peaks: number[] = [];
  
  for (let i = 2; i < values.length - 2; i++) {
    const current = values[i];
    const leftWindow = values.slice(i - 2, i);
    const rightWindow = values.slice(i + 1, i + 3);
    
    if (current > threshold && 
        leftWindow.every(v => current > v) && 
        rightWindow.every(v => current > v)) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Calculate heart rate from peaks
 */
export function calculateHeartRate(
  peaks: number[],
  sampleRate: number
): number {
  if (peaks.length < 2) return 0;
  
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const heartRate = 60 * sampleRate / avgInterval;
  
  return Math.round(heartRate);
}

// Store diagnostic data
let diagnosticData: any = {
  peaks: [],
  heartRates: [],
  signalQuality: []
};

/**
 * Add diagnostics data
 */
export function getDiagnosticsData() {
  return {...diagnosticData};
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData() {
  diagnosticData = {
    peaks: [],
    heartRates: [],
    signalQuality: []
  };
}
