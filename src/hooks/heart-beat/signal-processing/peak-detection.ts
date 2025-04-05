
import { HeartBeatResult } from '../types';

/**
 * Handle peak detection for real-time visualization
 */
export function handlePeakDetection(
  result: HeartBeatResult, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean
): void {
  try {
    if (result?.isPeak) {
      const now = Date.now();
      lastPeakTimeRef.current = now;
      
      // Request beep on detected peak
      requestImmediateBeep(result?.filteredValue || 0);
    }
  } catch (error) {
    console.error('Error in handlePeakDetection:', error);
  }
}
