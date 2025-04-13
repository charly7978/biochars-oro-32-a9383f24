
/**
 * Configuration for heart beat processing
 */
export const HeartBeatConfig = {
  // Signal thresholds
  LOW_SIGNAL_THRESHOLD: 0.008,
  MEDIUM_SIGNAL_THRESHOLD: 0.015,
  HIGH_SIGNAL_THRESHOLD: 0.03,
  
  // Frame counters
  LOW_SIGNAL_FRAMES: 10,
  HIGH_QUALITY_FRAMES: 20,
  
  // BPM ranges
  MIN_VALID_BPM: 40,
  MAX_VALID_BPM: 200,
  
  // Arrhythmia detection
  MIN_RR_POINTS: 3,
  ARRHYTHMIA_VARIATION_THRESHOLD: 200, // ms
  
  // Processing options
  SMOOTHING_FACTOR: 0.25,
  LEARNING_RATE: 0.05,
};
