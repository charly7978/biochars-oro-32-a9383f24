
import { RRIntervalData } from '../../../types/vital-signs';

/**
 * Result of arrhythmia processing
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
 * Types of arrhythmias that can be detected
 */
export enum ArrhythmiaType {
  NORMAL = 'normal',
  PREMATURE_BEAT = 'premature_beat',
  BRADYCARDIA = 'bradycardia',
  TACHYCARDIA = 'tachycardia',
  IRREGULAR = 'irregular'
}

/**
 * Input parameters for arrhythmia processor
 */
export interface ArrhythmiaProcessorParams {
  rrData?: RRIntervalData;
  currentBPM?: number;
}

/**
 * Statistics about detected arrhythmias
 */
export interface ArrhythmiaStats {
  totalDetected: number;
  typeCounts: Record<ArrhythmiaType, number>;
  lastDetectionTime: number | null;
}
