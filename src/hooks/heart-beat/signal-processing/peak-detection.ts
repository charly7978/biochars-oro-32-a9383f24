/**
 * Improved peak detection module with lowered thresholds for better detection
 */
import { HeartBeatConfig } from '../../../modules/heart-beat/config';

// Store diagnostics data
const diagnosticsData: Array<{
  timestamp: number;
  isPeak: boolean;
  bpm: number;
  confidence: number;
  processingPriority: 'high' | 'medium' | 'low';
  processTime: number;
}> = [];

/**
 * Get diagnostics data
 */
export function getDiagnosticsData() {
  return [...diagnosticsData];
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData() {
  diagnosticsData.length = 0;
}

/**
 * Detect peaks in the signal buffer
 * Uses a combination of amplitude, derivative, and time since last peak
 * NOW WITH LOWER THRESHOLDS FOR TESTING
 */
export function detectPeaks(
  filteredValue: number,
  buffer: number[],
  lastPeakTime: number | null,
  currentTime: number
): { isPeak: boolean; confidence: number; bpm: number | null } {
  const startTime = performance.now();
  
  if (buffer.length < 5) {
    return { isPeak: false, confidence: 0, bpm: null };
  }

  // Calculate derivative (rate of change)
  const derivative = filteredValue - buffer[buffer.length - 2];
  
  // Calculate baseline as moving average
  const recentValues = buffer.slice(-20);
  const baseline = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

  // Calculate minimum time between peaks (lowered for testing)
  const minTimeBetweenPeaks = 300; // 300ms = 200 BPM max

  // Check if enough time has passed since last peak
  if (lastPeakTime !== null) {
    const timeSinceLastPeak = currentTime - lastPeakTime;
    if (timeSinceLastPeak < minTimeBetweenPeaks) {
      return { isPeak: false, confidence: 0, bpm: null };
    }
  }

  // LOWERED THRESHOLDS for testing
  const signalThreshold = 0.01; // Was 0.6 or higher
  const derivativeThreshold = -0.005; // Was -0.03
  
  // Peak detection: value above threshold and negative derivative (falling edge)
  // This is the heart of the detection algorithm
  const isPeak = 
    derivative < derivativeThreshold && 
    filteredValue > signalThreshold && 
    filteredValue > baseline * 0.7; // Lower amplitude requirement

  // Calculate confidence based on how well the signal meets criteria
  let confidence = 0;
  let bpm = null;

  if (isPeak) {
    // Calculate confidence based on signal characteristics
    const valueConfidence = Math.min(filteredValue / 0.2, 1) * 0.6;
    const derivativeConfidence = Math.min(Math.abs(derivative) / 0.02, 1) * 0.4;
    confidence = valueConfidence + derivativeConfidence;

    // Calculate BPM if we have a previous peak time
    if (lastPeakTime !== null) {
      const interval = currentTime - lastPeakTime;
      if (interval > 0) {
        bpm = Math.round(60000 / interval);
        
        // Validate BPM is physiologically reasonable
        if (bpm < 40 || bpm > 200) {
          confidence *= 0.5; // Reduce confidence for unlikely values
        }
      }
    }
    
    console.log(`[Peak Detected] Value: ${filteredValue.toFixed(4)}, Derivative: ${derivative.toFixed(4)}, Confidence: ${confidence.toFixed(2)}, BPM: ${bpm}`);
  }

  // Calculate processing time for diagnostics
  const processTime = performance.now() - startTime;
  
  // Determine processing priority based on signal quality
  let processingPriority: 'high' | 'medium' | 'low' = 'low';
  if (confidence > 0.7) {
    processingPriority = 'high';
  } else if (confidence > 0.3) {
    processingPriority = 'medium';
  }
  
  // Record diagnostics data
  diagnosticsData.push({
    timestamp: currentTime,
    isPeak,
    bpm: bpm || 0,
    confidence,
    processingPriority,
    processTime
  });
  
  // Keep diagnostics data size manageable
  if (diagnosticsData.length > 100) {
    diagnosticsData.shift();
  }

  return { isPeak, confidence, bpm };
}

/**
 * Calculate heart rate from a buffer of peaks
 */
export function calculateHeartRate(peakTimes: number[]): number | null {
  if (peakTimes.length < 2) {
    return null;
  }

  // Calculate intervals between peaks
  const intervals: number[] = [];
  for (let i = 1; i < peakTimes.length; i++) {
    intervals.push(peakTimes[i] - peakTimes[i - 1]);
  }

  // Remove outliers (intervals that are too short or too long)
  const validIntervals = intervals.filter(
    interval => interval >= 300 && interval <= 1500
  );

  if (validIntervals.length === 0) {
    return null;
  }

  // Calculate average interval
  const avgInterval =
    validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;

  // Convert to BPM
  return Math.round(60000 / avgInterval);
}

/**
 * Handle peak detection and update lastPeakTime
 */
export function handlePeakDetection(
  processorResult: any,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>,
  signalValue: number
): void {
  // Update peak time when a peak is detected
  if (processorResult.isPeak && processorResult.confidence > 0.2) {
    const now = Date.now();
    lastPeakTimeRef.current = now;
    
    // Request immediate feedback for detected peak
    if (isMonitoringRef.current) {
      requestImmediateBeep(signalValue);
      console.log("[PEAK] Detected at:", new Date(now).toLocaleTimeString(), "Value:", signalValue);
    }
  }
}
