
/**
 * Configuration values for heart beat detection and processing
 */
export const HeartBeatConfig = {
  // Signal processing
  SAMPLE_RATE: 30, // Hz
  FILTER_STRENGTH: 0.2,
  
  // Peak detection
  MIN_PEAK_HEIGHT: 0.01,
  MIN_PEAK_DISTANCE_MS: 300,
  
  // Heart rate calculation
  MIN_VALID_BPM: 40,
  MAX_VALID_BPM: 200,
  
  // Arrhythmia detection
  MIN_RR_VARIATION: 0.15,
  STABILITY_COUNTER_MAX: 30,
  
  // Visualization
  DRAW_GRID: true,
  WINDOW_WIDTH_MS: 5000,
  VERTICAL_SCALE: 35.0
};

export default HeartBeatConfig;
