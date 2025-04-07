
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

// Interfaz para el estado de arritmia
export interface ArrhythmiaState {
  isActive: boolean;
  lastDetectionTime: number;
  recoveryTime: number; // Tiempo para resetear el estado de arritmia automáticamente
  windows: ArrhythmiaWindow[];
}
