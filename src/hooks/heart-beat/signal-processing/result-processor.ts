
/**
 * Process and validate heart rate measurement results
 */

// Store last valid measurements
const lastValidBpms: number[] = [];
const lastValidConfidences: number[] = [];
let lastValidTime = 0;

/**
 * Update last valid BPM measurements
 */
export function updateLastValidBpm(bpm: number, confidence: number) {
  // Only store if confidence is reasonable and BPM is physiologically plausible
  if (confidence > 0.3 && bpm >= 40 && bpm <= 200) {
    lastValidBpms.push(bpm);
    lastValidConfidences.push(confidence);
    lastValidTime = Date.now();
    
    // Limit size of history
    if (lastValidBpms.length > 10) {
      lastValidBpms.shift();
      lastValidConfidences.shift();
    }
  }
}

/**
 * Process low confidence results by filling in with past data if available
 */
export function processLowConfidenceResult(result: any): any {
  // Use original result if confidence is good
  if (result.confidence > 0.3) {
    return result;
  }
  
  // If we have valid past measurements and the last one was recent
  const timeSinceLastValid = Date.now() - lastValidTime;
  if (lastValidBpms.length > 0 && timeSinceLastValid < 5000) {
    // Average of recent valid BPMs
    const averageBpm = lastValidBpms.reduce((sum, bpm) => sum + bpm, 0) / lastValidBpms.length;
    const averageConfidence = lastValidConfidences.reduce((sum, conf) => sum + conf, 0) / lastValidConfidences.length * 0.7; // Reduce confidence for historical data
    
    return {
      ...result,
      bpm: Math.round(averageBpm),
      confidence: averageConfidence,
      isHistorical: true
    };
  }
  
  // No recent valid data, use original low confidence result
  return result;
}

/**
 * Get last valid measurements for comparison
 */
export function getLastValidMeasurements() {
  return {
    bpms: [...lastValidBpms],
    confidences: [...lastValidConfidences],
    lastValidTime
  };
}

/**
 * Reset all stored valid measurements
 */
export function resetValidMeasurements() {
  lastValidBpms.length = 0;
  lastValidConfidences.length = 0;
  lastValidTime = 0;
}
