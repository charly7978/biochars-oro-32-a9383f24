
import { HeartBeatResult } from '../types';

// Diagnostic data storage
const diagnosticsData: Array<{
  timestamp: number;
  value: number;
  processTime: number;
  processingPriority: string;
  isPeak: boolean;
}> = [];

/**
 * Get diagnostics data for analysis
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
 * Handle peak detection for real-time visualization
 */
export function handlePeakDetection(
  result: HeartBeatResult, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  try {
    if (result?.isPeak) {
      const now = Date.now();
      lastPeakTimeRef.current = now;
      
      // Store diagnostic data
      diagnosticsData.push({
        timestamp: now,
        value: result?.filteredValue || 0,
        processTime: 0, // Processing time not available in this context
        processingPriority: 'high', // Assume high priority for peaks
        isPeak: true
      });
      
      // Limit diagnostics data size
      if (diagnosticsData.length > 100) {
        diagnosticsData.shift();
      }
      
      // Request beep on detected peak
      requestImmediateBeep(result?.filteredValue || 0);
      
      // If arrhythmia is detected, dispatch an event for visualization
      if (result?.isArrhythmia) {
        console.log("Peak with arrhythmia detected, dispatching event");
        const arrhythmiaEvent = new CustomEvent('arrhythmia-detected', {
          detail: {
            timestamp: now,
            confidence: result.confidence || 0.7,
            intensity: (result?.filteredValue || 0.5) * 1.5
          }
        });
        window.dispatchEvent(arrhythmiaEvent);
      }
    }
  } catch (error) {
    console.error('Error in handlePeakDetection:', error);
  }
}
