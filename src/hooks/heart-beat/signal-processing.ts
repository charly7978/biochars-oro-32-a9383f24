
import { HeartBeatResult } from './types';

/**
 * Check if signal is too weak to process
 */
export function checkWeakSignal(
  value: number, 
  weakSignalsCount: number,
  thresholds: { lowSignalThreshold: number, maxWeakSignalCount: number }
): { isWeakSignal: boolean; updatedWeakSignalsCount: number } {
  const { lowSignalThreshold, maxWeakSignalCount } = thresholds;
  
  if (Math.abs(value) < lowSignalThreshold) {
    const updatedCount = weakSignalsCount + 1;
    return {
      isWeakSignal: updatedCount >= maxWeakSignalCount,
      updatedWeakSignalsCount: updatedCount
    };
  }
  
  return { isWeakSignal: false, updatedWeakSignalsCount: 0 };
}

/**
 * Determine if a measurement should be processed
 */
export function shouldProcessMeasurement(value: number, threshold: number): boolean {
  return Math.abs(value) >= threshold;
}

/**
 * Create result for weak signal
 */
export function createWeakSignalResult(arrhythmiaCount: number = 0): HeartBeatResult {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount,
    rrData: {
      intervals: [],
      lastPeakTime: null
    }
  };
}

/**
 * Handle peak detection for real-time visualization
 */
export function handlePeakDetection(
  result: HeartBeatResult, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>,
  value: number
): void {
  if (result?.isPeak && isMonitoringRef.current) {
    const now = Date.now();
    lastPeakTimeRef.current = now;
    
    requestImmediateBeep(value);
  }
}

/**
 * Update last valid BPM
 */
export function updateLastValidBpm(
  result: HeartBeatResult, 
  lastValidBpmRef: React.MutableRefObject<number>
): void {
  if (result.bpm > 30 && result.confidence > 0.5) {
    lastValidBpmRef.current = result.bpm;
  }
}

/**
 * Process low confidence result
 */
export function processLowConfidenceResult(
  result: HeartBeatResult,
  currentBPM: number,
  arrhythmiaCount: number
): HeartBeatResult {
  // If confidence is too low, use last known good BPM
  if (result.confidence < 0.3 && currentBPM > 0) {
    return {
      ...result,
      bpm: currentBPM,
      arrhythmiaCount
    };
  }
  
  return {
    ...result,
    arrhythmiaCount
  };
}
