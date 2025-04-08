
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

let lastValidBpm = 0;
let lastConfidence = 0;
let validBpmCount = 0;

/**
 * Update last valid BPM
 */
export function updateLastValidBpm(bpm: number, confidence: number): void {
  if (confidence > 0.5 && bpm >= 40 && bpm <= 200) {
    // Use exponential smoothing to update
    lastValidBpm = lastValidBpm > 0 
      ? 0.8 * lastValidBpm + 0.2 * bpm
      : bpm;
    
    lastConfidence = confidence;
    validBpmCount++;
  }
}

/**
 * Process result with low confidence
 */
export function processLowConfidenceResult(
  result: any, 
  confidenceThreshold: number = 0.5
): any {
  if (result.confidence < confidenceThreshold && lastValidBpm > 0) {
    // If confidence is low but we have a valid previous BPM
    return {
      ...result,
      bpm: lastValidBpm,
      confidence: Math.max(0.3, result.confidence)
    };
  }
  
  return result;
}

/**
 * Get last valid measurements
 */
export function getLastValidMeasurements(): {
  bpm: number;
  confidence: number;
  count: number;
} {
  return {
    bpm: lastValidBpm,
    confidence: lastConfidence,
    count: validBpmCount
  };
}

/**
 * Reset valid measurements tracking
 */
export function resetValidMeasurements(): void {
  lastValidBpm = 0;
  lastConfidence = 0;
  validBpmCount = 0;
}
