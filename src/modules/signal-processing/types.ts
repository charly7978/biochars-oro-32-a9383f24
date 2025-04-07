
/**
 * Types for signal processing
 */

export interface ProcessedPPGSignal {
  timestamp: number;
  value: number;
  quality: number;
  isPeak: boolean;
}

export interface SignalProcessor {
  processSignal: (value: number) => any;
  reset: () => void;
  initialize?: () => Promise<void>;
}
