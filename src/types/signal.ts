/**
 * Types for signal processing and vital sign extraction
 */

/**
 * Types of vital signs that can be measured
 */
export enum VitalSignType {
  SPO2 = 'spo2',
  BLOOD_PRESSURE = 'blood_pressure',
  HEARTBEAT = 'heartbeat',
  GLUCOSE = 'glucose',
  HYDRATION = 'hydration'  // Changed from LIPIDS to HYDRATION
}

/**
 * Channel feedback interface for providing dynamic feedback
 * during vital sign processing
 */
export interface ChannelFeedback {
  signalQuality: number;
  fingerDetected: boolean;
  message?: string;
}

/**
 * Signal processing modes for vital sign extraction
 */
export enum ProcessingMode {
  DIRECT = 'direct',          // Direct measurement
  BASELINE = 'baseline',      // Establish baseline
  CALIBRATED = 'calibrated',  // Use calibration data
  HYBRID = 'hybrid'           // Mix of direct and calibrated
}
