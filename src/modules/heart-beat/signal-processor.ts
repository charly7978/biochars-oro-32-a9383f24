
/**
 * Heart beat signal processor
 */

/**
 * Process raw heartbeat signal and extract features like BPM
 */
export function processHeartbeatSignal(
  value: number,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  lastValidBpmRef: React.MutableRefObject<number>,
  arrhythmiaCount: number,
  isMonitoringRef: React.MutableRefObject<boolean>
) {
  const now = Date.now();
  
  // Detect peak in signal
  const isPeak = detectPeak(value);
  
  // Calculate BPM if peak is detected
  let bpm = 0;
  let confidence = 0;
  let intervals: number[] = [];
  
  if (isPeak) {
    if (lastPeakTimeRef.current) {
      const timeSinceLastPeak = now - lastPeakTimeRef.current;
      
      // Calculate BPM from peak-to-peak interval (60,000ms / interval in ms)
      if (timeSinceLastPeak > 300 && timeSinceLastPeak < 1500) {
        bpm = Math.round(60000 / timeSinceLastPeak);
        confidence = calculateConfidence(bpm, lastValidBpmRef.current, timeSinceLastPeak);
      }
      
      // Store interval
      intervals = [timeSinceLastPeak];
    }
    
    // Update last peak time
    lastPeakTimeRef.current = now;
  }
  
  // Return processing result
  return {
    bpm,
    confidence,
    isPeak,
    timestamp: now,
    arrhythmiaCount,
    rrData: {
      intervals,
      lastPeakTime: lastPeakTimeRef.current
    }
  };
}

/**
 * Detect if current signal value represents a heartbeat peak
 */
function detectPeak(value: number): boolean {
  // Simple threshold-based peak detection
  // In a real application, this would be more sophisticated
  return value > 0.5;
}

/**
 * Calculate confidence score for detected heartbeat
 */
function calculateConfidence(
  currentBpm: number, 
  lastValidBpm: number,
  interval: number
): number {
  // Base confidence starts at 0.5
  let confidence = 0.5;
  
  // If BPM is in physiological range (40-180), increase confidence
  if (currentBpm >= 40 && currentBpm <= 180) {
    confidence += 0.2;
  }
  
  // If interval is consistent with previous measurements, increase confidence
  if (lastValidBpm > 0) {
    const expectedInterval = 60000 / lastValidBpm;
    const intervalDeviation = Math.abs(interval - expectedInterval) / expectedInterval;
    
    if (intervalDeviation < 0.1) {
      confidence += 0.3;
    } else if (intervalDeviation < 0.2) {
      confidence += 0.1;
    }
  }
  
  return Math.min(1.0, confidence);
}
