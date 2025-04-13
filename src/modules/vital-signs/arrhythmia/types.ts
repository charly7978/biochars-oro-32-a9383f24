
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * RR interval data for cardiac measurements
 */
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

/**
 * Arrhythmia processing result
 */
export interface ArrhythmiaProcessingResult {
  arrhythmiaStatus: string;
  lastArrhythmiaData: {
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
}

/**
 * Arrhythmia pattern type
 */
export enum ArrhythmiaPatternType {
  NORMAL = 'normal',
  PREMATURE_BEAT = 'premature_beat',
  MISSED_BEAT = 'missed_beat',
  IRREGULAR_RHYTHM = 'irregular_rhythm',
  TACHYCARDIA = 'tachycardia',
  BRADYCARDIA = 'bradycardia'
}

/**
 * Arrhythmia detection result
 */
export interface ArrhythmiaDetectionResult {
  isArrhythmia: boolean;
  patternType: ArrhythmiaPatternType;
  confidence: number;
  rmssd?: number;
  rrVariation?: number;
  timestamp: number;
}

/**
 * Arrhythmia detection window
 */
export interface ArrhythmiaWindow {
  start: number;
  end: number;
  type?: ArrhythmiaPatternType;
  strength?: number;
}
