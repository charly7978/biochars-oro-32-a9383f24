
/**
 * Type definitions for signal processing
 */

export enum VitalSignType {
  SPO2 = "spo2",
  BLOOD_PRESSURE = "blood_pressure",
  GLUCOSE = "glucose",
  HYDRATION = "hydration", // Changed from LIPIDS
  HEARTBEAT = "heartbeat"
}

export interface ProcessedSignal {
  timestamp: number;
  filteredValue: number;
  rawValue: number;
  quality: number;
  fingerDetected: boolean;
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OptimizedSignalChannel {
  id: string;
  processValue(value: number): number;
  applyFeedback(feedback: ChannelFeedback): void;
  reset(): void;
  getAmplification(): number;
  getFilterStrength(): number;
}

export interface ChannelFeedback {
  channelId: string;
  signalAmplitude: number;
  signalNoise: number;
  quality: number;
  calibrationStatus: string;
  lastUpdated: number;
}
