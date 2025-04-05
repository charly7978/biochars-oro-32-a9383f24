
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
  };
}

export type VitalSignType = 
  | 'CARDIAC'
  | 'SPO2'
  | 'BLOOD_PRESSURE'
  | 'GLUCOSE'
  | 'LIPIDS';

export interface ChannelFeedback {
  value: number;
  timestamp: number;
  quality: number;
}
