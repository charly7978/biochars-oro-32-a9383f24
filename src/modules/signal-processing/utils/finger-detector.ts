
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utility functions for finger detection in PPG signal
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Detects finger presence based on signal characteristics
 */
export function detectFingerPresence(
  filteredBuffer: number[],
  sensitivity: number = 0.6
): boolean {
  if (filteredBuffer.length < 10) {
    return false;
  }

  try {
    // Calculate signal metrics
    const recent = filteredBuffer.slice(-10);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // Calculate variance
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    // Calculate frequency domain characteristics
    // This is a simplified version - just checking for variations in the signal
    let signalChanges = 0;
    for (let i = 1; i < recent.length; i++) {
      if ((recent[i] > recent[i-1] && recent[i-1] <= recent[i-2]) ||
          (recent[i] < recent[i-1] && recent[i-1] >= recent[i-2])) {
        signalChanges++;
      }
    }
    
    // Apply detection criteria
    const hasAmplitude = range > 0.1 * sensitivity;
    const hasVariance = variance > 0.001 * sensitivity;
    const hasChanges = signalChanges >= 2;
    
    // Combine criteria with weights
    const amplitudeWeight = 0.5;
    const varianceWeight = 0.3;
    const changesWeight = 0.2;
    
    const detectionScore = 
      (hasAmplitude ? amplitudeWeight : 0) +
      (hasVariance ? varianceWeight : 0) +
      (hasChanges ? changesWeight : 0);
    
    // Log detection information for debugging
    if (Math.random() < 0.01) { // Only log occasionally to avoid spam
      logError(
        `Finger detection: score=${detectionScore.toFixed(2)}, range=${range.toFixed(4)}, variance=${variance.toFixed(6)}`,
        ErrorLevel.DEBUG,
        'FingerDetector'
      );
    }
    
    return detectionScore >= 0.6;
  } catch (error) {
    logError(
      `Error in finger detection: ${error}`,
      ErrorLevel.ERROR,
      'FingerDetector'
    );
    return false;
  }
}
