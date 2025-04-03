
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignsResult } from "../../modules/vital-signs/types/vital-signs-result";

export interface ArrhythmiaWindow {
  start: number;
  end: number;
}

export interface VitalSignsDebugInfo {
  processedSignals: number;
  hasProcessor: boolean;
  memoryUsage: number;
  tensorCount: number;
  tensorflowReady: boolean;
  signalLog: {timestamp: number, value: number, result: any}[];
}

// Interface for signal quality metrics
export interface SignalQualityMetrics {
  amplitude: number;
  stability: number;
  noiseLevel: number;
  fingerDetectionConfidence: number;
  overallQuality: number;
}

export interface UseVitalSignsProcessorReturn {
  processSignal: (value: number, rrData?: { intervals: number[], lastPeakTime: number | null }) => VitalSignsResult;
  reset: () => VitalSignsResult | null;
  fullReset: () => void;
  arrhythmiaCounter: number;
  lastValidResults: VitalSignsResult | null;
  arrhythmiaWindows: ArrhythmiaWindow[];
  debugInfo: VitalSignsDebugInfo;
  signalQuality?: SignalQualityMetrics; // Nueva propiedad opcional para métricas de calidad
}
