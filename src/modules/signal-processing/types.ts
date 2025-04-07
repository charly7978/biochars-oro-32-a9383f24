
/**
 * Shared types for signal processing modules
 */

export type SignalPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Base interface for processed signal
 */
export interface BaseProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
  sourceId: string;
  priority: SignalPriority;
  isValid: boolean;
}

/**
 * PPG signal specific processed data
 */
export interface ProcessedPPGSignal extends BaseProcessedSignal {
  normalizedValue: number;
  amplifiedValue: number;
}

/**
 * Options for configuring signal processing
 */
export interface SignalProcessingOptions {
  amplificationFactor?: number;
  filterStrength?: number;
  qualityThreshold?: number;
  fingerDetectionSensitivity?: number;
  frequencyRangeMin?: number;
  frequencyRangeMax?: number;
}

/**
 * Generic signal processor interface
 */
export interface SignalProcessor<T extends BaseProcessedSignal> {
  processSignal(value: number): T;
  reset(): void;
  configure(options: SignalProcessingOptions): void;
}

/**
 * Types of vital signs
 */
export enum VitalSignType {
  HEART_RATE = 'HEART_RATE',
  SPO2 = 'SPO2',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  RESPIRATION = 'RESPIRATION',
  GLUCOSE = 'GLUCOSE',
  TEMPERATURE = 'TEMPERATURE',
  LIPIDS = 'LIPIDS'
}
