
/**
 * Signal quality detection utility
 */

// Configuration
const qualityConfig = {
  snrThresholds: {
    excellent: 20, // dB
    good: 15,      // dB
    fair: 10,      // dB
    poor: 5        // dB
  },
  minAmplitude: 0.05,
  stableWindow: 10,
  variabilityThreshold: 0.3
};

// State
let signalBuffer: number[] = [];
const BUFFER_SIZE = 50;
let noiseEstimate = 0;
let lastQuality = 0;

/**
 * Detect signal quality from values
 */
export function detectQuality(value: number): {
  quality: number;
  snr: number;
  classification: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
} {
  // Add to buffer
  signalBuffer.push(value);
  if (signalBuffer.length > BUFFER_SIZE) {
    signalBuffer.shift();
  }
  
  // Need enough data
  if (signalBuffer.length < 5) {
    return {
      quality: 0,
      snr: 0,
      classification: 'unusable'
    };
  }
  
  // Calculate signal metrics
  const { mean, variance, range } = calculateSignalMetrics(signalBuffer);
  
  // Estimate noise component (high frequency variation)
  updateNoiseEstimate(signalBuffer);
  
  // Calculate SNR (Signal to Noise Ratio) in dB
  const signalPower = Math.pow(range, 2) / 12; // Approximate signal power
  const noisePower = Math.max(0.0001, noiseEstimate); // Prevent division by zero
  const snr = 10 * Math.log10(signalPower / noisePower);
  
  // Calculate coefficient of variation for stability assessment
  const cv = Math.sqrt(variance) / (Math.abs(mean) > 0.001 ? mean : 0.001);
  const isStable = cv < qualityConfig.variabilityThreshold;
  
  // Calculate overall quality (0-100)
  let quality = 0;
  
  if (range < qualityConfig.minAmplitude) {
    quality = 0; // Too little variation
  } else {
    // Calculate quality based on SNR
    if (snr >= qualityConfig.snrThresholds.excellent) {
      quality = 90 + Math.min(10, (snr - qualityConfig.snrThresholds.excellent));
    } else if (snr >= qualityConfig.snrThresholds.good) {
      quality = 70 + (snr - qualityConfig.snrThresholds.good) * 20 / 
                (qualityConfig.snrThresholds.excellent - qualityConfig.snrThresholds.good);
    } else if (snr >= qualityConfig.snrThresholds.fair) {
      quality = 50 + (snr - qualityConfig.snrThresholds.fair) * 20 / 
                (qualityConfig.snrThresholds.good - qualityConfig.snrThresholds.fair);
    } else if (snr >= qualityConfig.snrThresholds.poor) {
      quality = 25 + (snr - qualityConfig.snrThresholds.poor) * 25 / 
                (qualityConfig.snrThresholds.fair - qualityConfig.snrThresholds.poor);
    } else {
      quality = Math.max(0, 25 * snr / qualityConfig.snrThresholds.poor);
    }
    
    // Penalize unstable signals
    if (!isStable) {
      quality *= 0.8;
    }
  }
  
  // Apply smoothing
  quality = 0.7 * quality + 0.3 * lastQuality;
  lastQuality = quality;
  
  // Determine classification
  let classification: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
  if (quality >= 90) {
    classification = 'excellent';
  } else if (quality >= 70) {
    classification = 'good';
  } else if (quality >= 50) {
    classification = 'fair';
  } else if (quality >= 25) {
    classification = 'poor';
  } else {
    classification = 'unusable';
  }
  
  return {
    quality: Math.round(quality),
    snr,
    classification
  };
}

/**
 * Calculate various signal metrics
 */
function calculateSignalMetrics(values: number[]): {
  mean: number;
  variance: number;
  range: number;
} {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const variance = values.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / values.length;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return { mean, variance, range };
}

/**
 * Update noise estimate using differences between consecutive samples
 */
function updateNoiseEstimate(values: number[]): void {
  // Compute differences between consecutive values
  const diffs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(Math.abs(values[i] - values[i-1]));
  }
  
  if (diffs.length === 0) return;
  
  // Sort differences and take the median
  const sortedDiffs = [...diffs].sort((a, b) => a - b);
  const medianDiff = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
  
  // Estimate noise as the median of absolute differences
  const newNoiseEstimate = medianDiff * medianDiff;
  
  // Update noise estimate with smoothing
  if (noiseEstimate === 0) {
    noiseEstimate = newNoiseEstimate;
  } else {
    noiseEstimate = 0.9 * noiseEstimate + 0.1 * newNoiseEstimate;
  }
}

/**
 * Reset quality detector
 */
export function resetQualityDetector(): void {
  signalBuffer = [];
  noiseEstimate = 0;
  lastQuality = 0;
}

/**
 * Configure quality detection parameters
 */
export function configureQualityDetector(config: Partial<typeof qualityConfig>): void {
  Object.assign(qualityConfig, config);
}

/**
 * Get current quality detector state
 */
export function getQualityDetectorState(): {
  bufferSize: number;
  noiseEstimate: number;
  lastQuality: number;
} {
  return {
    bufferSize: signalBuffer.length,
    noiseEstimate,
    lastQuality
  };
}
