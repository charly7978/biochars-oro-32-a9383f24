
export interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

export interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  arrhythmiaCount: number;
  rrData: RRIntervalData;
}

export interface HeartBeatProcessorConfig {
  bufferSize: number;
  minThreshold: number;
  maxThreshold: number;
  minHeartRate: number;
  maxHeartRate: number;
  lowPassFilter: {
    cutoff: number;
    samplingRate: number;
  };
}
