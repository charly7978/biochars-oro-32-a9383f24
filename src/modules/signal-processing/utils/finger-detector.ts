
/**
 * Utility for finger detection on PPG sensor
 */

// Configurable settings
const fingerDetectionConfig = {
  minSignalStrength: 0.1,
  stabilityThreshold: 0.05,
  requiredStableFrames: 5,
  signalRange: {
    min: 50,
    max: 250
  },
  adaptiveThreshold: true
};

// State variables
let consecutiveStableFrames = 0;
let lastValues: number[] = [];
const BUFFER_SIZE = 10;
let fingerDetected = false;
let signalStrength = 0;
let adaptiveThreshold = 0.1;

/**
 * Process a value to detect finger presence
 */
export function detectFinger(value: number): {
  fingerDetected: boolean;
  signalStrength: number;
  confidence: number;
} {
  // Store value in buffer
  lastValues.push(value);
  if (lastValues.length > BUFFER_SIZE) {
    lastValues.shift();
  }
  
  // Not enough data yet
  if (lastValues.length < 3) {
    return {
      fingerDetected: false,
      signalStrength: 0,
      confidence: 0
    };
  }
  
  // Calculate signal strength
  const min = Math.min(...lastValues);
  const max = Math.max(...lastValues);
  signalStrength = max - min;
  
  // Calculate stability (standard deviation)
  const mean = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
  const variance = lastValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lastValues.length;
  const stability = Math.sqrt(variance);
  
  // Update adaptive threshold if enabled
  if (fingerDetectionConfig.adaptiveThreshold) {
    adaptiveThreshold = Math.max(
      fingerDetectionConfig.minSignalStrength,
      signalStrength * 0.2
    );
  } else {
    adaptiveThreshold = fingerDetectionConfig.minSignalStrength;
  }
  
  // Check signal strength against threshold
  const hasSignal = signalStrength > adaptiveThreshold;
  
  // Check signal stability
  const isStable = stability < fingerDetectionConfig.stabilityThreshold * signalStrength;
  
  // Check if signal is in valid range
  const inRange = mean > fingerDetectionConfig.signalRange.min && 
                  mean < fingerDetectionConfig.signalRange.max;
  
  // Update consecutive stable frames counter
  if (hasSignal && isStable && inRange) {
    consecutiveStableFrames = Math.min(
      consecutiveStableFrames + 1,
      fingerDetectionConfig.requiredStableFrames * 2
    );
  } else {
    consecutiveStableFrames = Math.max(0, consecutiveStableFrames - 1);
  }
  
  // Determine finger detection
  fingerDetected = consecutiveStableFrames >= fingerDetectionConfig.requiredStableFrames;
  
  // Calculate confidence
  let confidence = Math.min(consecutiveStableFrames / fingerDetectionConfig.requiredStableFrames, 1);
  if (!hasSignal || !inRange) {
    confidence *= 0.5;
  }
  
  return {
    fingerDetected,
    signalStrength,
    confidence
  };
}

/**
 * Reset the finger detector state
 */
export function resetFingerDetector(): void {
  consecutiveStableFrames = 0;
  lastValues = [];
  fingerDetected = false;
  signalStrength = 0;
}

/**
 * Configure finger detection parameters
 */
export function configureFingerDetector(config: Partial<typeof fingerDetectionConfig>): void {
  Object.assign(fingerDetectionConfig, config);
}

/**
 * Get current finger detection state
 */
export function getFingerDetectionState(): {
  fingerDetected: boolean;
  signalStrength: number;
  consecutiveStableFrames: number;
  adaptiveThreshold: number;
} {
  return {
    fingerDetected,
    signalStrength,
    consecutiveStableFrames,
    adaptiveThreshold
  };
}
