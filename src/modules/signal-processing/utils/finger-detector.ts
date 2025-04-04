
import { unifiedFingerDetector } from '../finger-detection/unified-finger-detector';

/**
 * Detects finger presence based on a buffer of filtered values
 * @param filteredBuffer Array of filtered signal values
 * @param sensitivity Detection sensitivity threshold
 * @returns Boolean indicating finger presence
 */
export function detectFingerPresence(
  filteredBuffer: number[], 
  sensitivity: number = 0.5
): boolean {
  // Use the unified finger detector for consistency
  const currentState = unifiedFingerDetector.getDetectionState();
  
  // If buffer is too small, return false
  if (filteredBuffer.length < 5) return false;

  // Calculate signal variation
  const maxVal = Math.max(...filteredBuffer);
  const minVal = Math.min(...filteredBuffer);
  const variation = maxVal - minVal;
  
  // Combine unified detector state with local signal analysis
  const localDetectionConfidence = variation / Math.max(maxVal, 1);
  
  return currentState.isFingerDetected && 
         localDetectionConfidence >= sensitivity;
}
