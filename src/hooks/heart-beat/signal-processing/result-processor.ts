
/**
 * Result processing utilities
 */
import { HeartBeatResult } from '../types';

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

/**
 * Enhance diagnostic data with additional metrics
 */
export function enhanceDiagnosticData(
  result: HeartBeatResult,
  signalStrength: number,
  lastValidBpm: number = 0,
  lastPeakTime: number | null = null
): HeartBeatResult {
  if (!result.diagnosticData) {
    result.diagnosticData = {};
  }
  
  result.diagnosticData = {
    ...result.diagnosticData,
    signalStrength: signalStrength * 100,
    signalQuality: result.confidence > 0.7 ? 'excellent' : 
                  result.confidence > 0.5 ? 'good' : 
                  result.confidence > 0.3 ? 'moderate' : 'weak',
    lastProcessedTime: Date.now(),
    lastPeakDetected: lastPeakTime,
    lastValidBpmTime: lastValidBpm > 0 ? Date.now() : 0,
    bpmReliability: result.confidence * 100,
    confidenceStatus: result.confidence > 0.7 ? 'high' : 
                      result.confidence > 0.4 ? 'moderate' : 'low',
  };
  
  return result;
}

/**
 * Check for arrhythmia windows in the signal
 */
export function checkArrhythmiaWindows(
  intervals: number[],
  threshold: number = 0.2
): boolean {
  if (intervals.length < 3) return false;
  
  try {
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    let abnormalIntervals = 0;
    
    for (let i = 0; i < intervals.length; i++) {
      const variation = Math.abs(intervals[i] - avgInterval) / avgInterval;
      if (variation > threshold) {
        abnormalIntervals++;
      }
    }
    
    // If more than 30% of intervals are abnormal, consider it an arrhythmia window
    return (abnormalIntervals / intervals.length) > 0.3;
  } catch (error) {
    console.error('Error checking arrhythmia windows:', error);
    return false;
  }
}
