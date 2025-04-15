
/**
 * Vital signs signal types
 */
export enum VitalSignType {
  SPO2 = 'spo2',
  BLOOD_PRESSURE = 'blood_pressure',
  HEARTBEAT = 'heartbeat',
  GLUCOSE = 'glucose',
  LIPIDS = 'lipids',
  HYDRATION = 'hydration'
}

/**
 * Channel feedback interface
 */
export interface ChannelFeedback {
  signalQuality?: number;
  suggestedAdjustments?: {
    amplificationFactor?: number;
    filterStrength?: number;
    [key: string]: any;
  };
  success?: boolean;
  [key: string]: any;
}

/**
 * Processed signal interface
 */
export interface ProcessedSignal {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  quality: number;
  fingerDetected: boolean;
  perfusionIndex: number;
  roi: { x: number; y: number; width: number; height: number; };
}

/**
 * Signal distributor configuration
 */
export interface SignalDistributorConfig {
  enableAdaptiveFiltering?: boolean;
  channels?: VitalSignType[];
}

