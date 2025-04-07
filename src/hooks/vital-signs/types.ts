
/**
 * Types for arrhythmia visualization
 */

export interface ArrhythmiaWindow {
  start: number;
  end: number;
}

export interface DiagnosticDataPoint {
  timestamp: number;
  rmssd: number | null;
  peakAmplitude: number | null;
  rrVariability: number | null;
  signalQuality: number;
  beatConfidence: number;
}
