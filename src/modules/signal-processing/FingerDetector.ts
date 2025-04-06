
/**
 * Finger detection module
 */

// Global state for finger detection
let fingerDetected = false;
let fingerDetectionConfidence = 0;
let lastSignalQuality = 0;
let consecutiveFramesWithFinger = 0;
let consecutiveFramesWithoutFinger = 0;

/**
 * Reset the finger detector state
 */
export function resetFingerDetector(): void {
  fingerDetected = false;
  fingerDetectionConfidence = 0;
  lastSignalQuality = 0;
  consecutiveFramesWithFinger = 0;
  consecutiveFramesWithoutFinger = 0;
}

/**
 * Detect finger presence based on signal quality
 * @param signalQuality Current signal quality (0-100)
 * @param threshold Quality threshold for detection
 * @returns Whether a finger is detected
 */
export function detectFinger(signalQuality: number, threshold: number = 40): boolean {
  // Update signal quality
  lastSignalQuality = signalQuality;
  
  // Check if signal quality exceeds threshold
  if (signalQuality >= threshold) {
    // Increment counter for frames with finger
    consecutiveFramesWithFinger++;
    consecutiveFramesWithoutFinger = 0;
    
    // Require at least 5 consecutive frames with finger to detect
    if (consecutiveFramesWithFinger >= 5) {
      fingerDetected = true;
      
      // Update confidence (max 0.95)
      fingerDetectionConfidence = Math.min(0.95, fingerDetectionConfidence + 0.05);
    }
  } else {
    // Increment counter for frames without finger
    consecutiveFramesWithoutFinger++;
    consecutiveFramesWithFinger = 0;
    
    // Require at least 10 consecutive frames without finger to un-detect
    if (consecutiveFramesWithoutFinger >= 10) {
      fingerDetected = false;
      
      // Update confidence (min 0)
      fingerDetectionConfidence = Math.max(0, fingerDetectionConfidence - 0.1);
    }
  }
  
  return fingerDetected;
}

/**
 * Get the current finger detection confidence
 * @returns Confidence value (0-1)
 */
export function getFingerDetectionConfidence(): number {
  return fingerDetectionConfidence;
}

/**
 * Get the last signal quality
 * @returns Signal quality (0-100)
 */
export function getLastSignalQuality(): number {
  return lastSignalQuality;
}
