
/**
 * Central definition of vital sign types
 * To be imported everywhere to prevent inconsistencies
 */

/**
 * Types of vital sign measurements
 */
export enum VitalSignType {
  GLUCOSE = 'glucose',
  LIPIDS = 'lipids',
  BLOOD_PRESSURE = 'blood_pressure',
  SPO2 = 'spo2',
  CARDIAC = 'cardiac',
  HYDRATION = 'hydration'
}

/**
 * Channel feedback for optimization
 */
export interface ChannelFeedback {
  channelId: string;
  signalQuality: number;
  suggestedAdjustments?: {
    amplificationFactor?: number;
    filterStrength?: number;
    baselineCorrection?: number;
    frequencyRangeMin?: number;
    frequencyRangeMax?: number;
  };
  timestamp: number;
  success: boolean;
}
