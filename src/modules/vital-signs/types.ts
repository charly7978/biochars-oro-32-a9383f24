
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
  } | null;
}

// Using the VitalSignType enum from the central signal.ts file
export { VitalSignType } from '../../types/signal';

export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
  channelId?: string;
  suggestedAdjustments?: any;
}
