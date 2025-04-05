
export interface VitalSignsResult {
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  glucose?: number;
  lipids?: {
    totalCholesterol: number;
    triglycerides: number;
  };
  lastArrhythmiaData?: {
    isArrhythmia: boolean;
    confidence: number;
    timestamp: number;
    rmssd?: number;
    rrVariation?: number;
  } | null;
  calibration?: {
    progress: {
      heartRate?: number;
      spo2?: number;
      pressure?: number;
      arrhythmia?: number;
    }
  };
}

// Using the VitalSignType enum from the central signal.ts file
export { VitalSignType } from '../../types/signal';

export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
  channelId?: string;
  suggestedAdjustments?: any;
  signalQuality?: number;
}
