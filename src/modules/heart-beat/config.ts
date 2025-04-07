
/**
 * Heart beat detection configuration parameters
 */

export const HeartBeatConfig = {
  // Signal thresholds
  LOW_SIGNAL_THRESHOLD: 0.03,
  LOW_SIGNAL_FRAMES: 10,
  PEAK_THRESHOLD: 0.12,
  
  // Timing parameters
  MIN_PEAK_INTERVAL_MS: 300,
  MAX_PEAK_INTERVAL_MS: 1500,
  
  // BPM physiological range
  MIN_BPM: 40,
  MAX_BPM: 200,
  
  // Peak detection
  DETECTION_CONFIDENCE_THRESHOLD: 0.4,
  DERIVATIVE_THRESHOLD: -0.03,
  
  // Arrhythmia detection
  ARRHYTHMIA_VARIATION_THRESHOLD: 0.2,
  MIN_RR_INTERVALS_FOR_DETECTION: 5,
  
  // Signal processing
  FILTER_STRENGTH: 0.3,
  AMPLIFICATION_FACTOR: 1.5,
  
  // BPM calculation
  BPM_SMOOTHING_FACTOR: 0.2,
  MAX_BPM_HISTORY_LENGTH: 10
};

export default HeartBeatConfig;
