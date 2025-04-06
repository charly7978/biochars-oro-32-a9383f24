/**
 * Peak detection algorithms for heart rate analysis
 */
import { ProcessingPriority } from '../../../modules/extraction/types';

/**
 * Diagnostic data for peak detection
 */
interface PeakDetectionDiagnostic {
  timestamp: number;
  value: number;
  isPeak: boolean;
  peakValue: number;
  threshold: number;
  processTime: number;
  processingPriority: ProcessingPriority;
}

/**
 * Store for diagnostic data
 */
const diagnosticData: PeakDetectionDiagnostic[] = [];

/**
 * Clear diagnostic data
 */
export function clearDiagnosticsData(): void {
  diagnosticData.splice(0, diagnosticData.length);
}

/**
 * Get diagnostic data
 */
export function getDiagnosticsData(): PeakDetectionDiagnostic[] {
  return [...diagnosticData];
}

/**
 * Add diagnostic data
 */
function addDiagnosticData(data: PeakDetectionDiagnostic): void {
  diagnosticData.push(data);
  
  // Keep size bounded
  if (diagnosticData.length > 100) {
    diagnosticData.shift();
  }
}

/**
 * Detect peaks in signal
 * @param values Signal values
 * @param threshold Peak detection threshold
 * @returns Array of peak indices
 */
export function detectPeaks(
  values: number[], 
  threshold: number = 0.5,
  priority: ProcessingPriority = 'high'
): number[] {
  const startTime = performance.now();
  const peaks: number[] = [];
  const peakValues: number[] = [];
  
  // Simple peak detection algorithm
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && 
        values[i] > values[i + 1] &&
        values[i] > threshold) {
      
      peaks.push(i);
      peakValues.push(values[i]);
      
      // Add diagnostic data
      addDiagnosticData({
        timestamp: Date.now(),
        value: values[i],
        isPeak: true,
        peakValue: values[i],
        threshold,
        processTime: performance.now() - startTime,
        processingPriority: priority
      });
    }
  }
  
  return peaks;
}

/**
 * Calculate BPM from peak intervals
 * @param peaks Peak indices
 * @param sampleRate Sampling rate (Hz)
 * @returns BPM value
 */
export function calculateBPMFromPeaks(
  peaks: number[],
  sampleRate: number = 30
): number | null {
  if (peaks.length < 2) return null;
  
  const intervals: number[] = [];
  
  // Calculate intervals between peaks
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Convert to BPM
  return 60 * sampleRate / avgInterval;
}

/**
 * Calculate heart rate variability
 * @param peaks Peak indices
 * @param sampleRate Sampling rate (Hz)
 * @returns RMSSD value
 */
export function calculateHRV(
  peaks: number[],
  sampleRate: number = 30
): number | null {
  if (peaks.length < 3) return null;
  
  const intervals: number[] = [];
  
  // Calculate intervals between peaks in milliseconds
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) * (1000 / sampleRate));
  }
  
  // Calculate differences of successive intervals
  const differences: number[] = [];
  for (let i = 1; i < intervals.length; i++) {
    differences.push(intervals[i] - intervals[i - 1]);
  }
  
  // Calculate RMSSD (Root Mean Square of Successive Differences)
  const squaredDiffs = differences.map(diff => diff * diff);
  const meanSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
  
  return Math.sqrt(meanSquaredDiff);
}

/**
 * Adaptive peak detection
 * Adjusts threshold based on signal characteristics
 */
export function adaptivePeakDetection(
  values: number[],
  initialThreshold: number = 0.5,
  priority: ProcessingPriority = 'high'
): number[] {
  if (values.length < 10) return [];
  
  const startTime = performance.now();
  
  // Calculate signal statistics
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  
  // Adapt threshold based on signal range
  const threshold = min + (range * initialThreshold);
  
  // Use standard peak detection with adapted threshold
  const peaks = detectPeaks(values, threshold, priority);
  
  // Record processing time
  const processTime = performance.now() - startTime;
  
  // Add diagnostic data for non-peak samples
  if (peaks.length === 0 && values.length > 0) {
    addDiagnosticData({
      timestamp: Date.now(),
      value: values[values.length - 1],
      isPeak: false,
      peakValue: 0,
      threshold,
      processTime,
      processingPriority: priority
    });
  }
  
  return peaks;
}
