
/**
 * Types for arrhythmia detection and tracking
 */

/**
 * Represents a time window where arrhythmia was detected
 */
export interface ArrhythmiaWindow {
  /**
   * Start timestamp (milliseconds)
   */
  start: number;
  
  /**
   * End timestamp (milliseconds)
   */
  end: number;
  
  /**
   * Optional severity level (0-1)
   */
  severity?: number;
  
  /**
   * Optional classification
   */
  type?: ArrhythmiaType;
}

/**
 * Type of detected arrhythmia
 */
export enum ArrhythmiaType {
  UNSPECIFIED = 'unspecified',
  TACHYCARDIA = 'tachycardia',
  BRADYCARDIA = 'bradycardia',
  IRREGULAR = 'irregular',
  PREMATURE = 'premature'
}

/**
 * Arrhythmia detection settings
 */
export interface ArrhythmiaDetectionSettings {
  /**
   * Minimum required consecutive beats to trigger detection
   */
  minConsecutiveBeats: number;
  
  /**
   * Threshold for RR interval variation to consider irregular
   */
  rrVariationThreshold: number;
  
  /**
   * Whether to detect tachycardia
   */
  detectTachycardia: boolean;
  
  /**
   * Whether to detect bradycardia
   */
  detectBradycardia: boolean;
  
  /**
   * Threshold for tachycardia in BPM
   */
  tachycardiaThreshold: number;
  
  /**
   * Threshold for bradycardia in BPM
   */
  bradycardiaThreshold: number;
}

/**
 * Default arrhythmia detection settings
 */
export const DEFAULT_ARRHYTHMIA_SETTINGS: ArrhythmiaDetectionSettings = {
  minConsecutiveBeats: 3,
  rrVariationThreshold: 0.2,
  detectTachycardia: true,
  detectBradycardia: true,
  tachycardiaThreshold: 100,
  bradycardiaThreshold: 50
};
