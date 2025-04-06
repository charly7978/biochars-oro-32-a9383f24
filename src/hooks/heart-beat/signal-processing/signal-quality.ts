
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

// Signal quality state
let qualityState = {
  lastValues: [] as number[],
  averageAmplitude: 0,
  fingerDetected: false
};

/**
 * Check if signal is too weak for processing
 */
export function checkWeakSignal(value: number, threshold: number = 0.05): boolean {
  return Math.abs(value) < threshold;
}

/**
 * Determine if a measurement should be processed
 */
export function shouldProcessMeasurement(
  value: number, 
  fingerDetected: boolean
): boolean {
  return !checkWeakSignal(value, 0.05) && fingerDetected;
}

/**
 * Create result for weak signal
 */
export function createWeakSignalResult(): any {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    fingerDetected: false,
    rrData: { intervals: [], lastPeakTime: null }
  };
}

/**
 * Reset signal quality state
 */
export function resetSignalQualityState(): void {
  qualityState = {
    lastValues: [],
    averageAmplitude: 0,
    fingerDetected: false
  };
}

/**
 * Check if finger is detected based on signal quality
 */
export function isFingerDetected(value: number): boolean {
  // Update buffer
  qualityState.lastValues.push(value);
  if (qualityState.lastValues.length > 20) {
    qualityState.lastValues.shift();
  }
  
  // Need enough samples
  if (qualityState.lastValues.length < 10) {
    return false;
  }
  
  // Calculate amplitude
  const max = Math.max(...qualityState.lastValues);
  const min = Math.min(...qualityState.lastValues);
  const amplitude = max - min;
  
  // Update average amplitude with exponential smoothing
  qualityState.averageAmplitude = 
    0.9 * qualityState.averageAmplitude + 0.1 * amplitude;
  
  // Update finger detection status
  qualityState.fingerDetected = qualityState.averageAmplitude > 0.1;
  
  return qualityState.fingerDetected;
}
