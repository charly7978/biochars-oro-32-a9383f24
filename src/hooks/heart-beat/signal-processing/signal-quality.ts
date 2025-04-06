
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Signal quality assessment functions
 */

// Track consecutive weak signals to improve finger detection
let consecutiveWeakSignalsCount = 0;
const MAX_CONSECUTIVE_WEAK_SIGNALS = 10;

// Store recent values for quality assessment
let recentValues: number[] = [];
const MAX_RECENT_VALUES = 30;

// Quality assessment state
let signalQualityState = {
  lastQuality: 0,
  fingerDetected: false,
  stabilityScore: 0,
  noiseLevel: 0
};

/**
 * Checks if the signal is too weak to process
 * Enhanced with improved finger detection
 */
export function checkWeakSignal(
  value: number, 
  currentWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number,
    maxWeakSignalCount: number
  }
): { isWeakSignal: boolean, updatedWeakSignalsCount: number } {
  // Threshold for weak signals
  const isCurrentValueWeak = Math.abs(value) < config.lowSignalThreshold;
  
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isCurrentValueWeak) {
    updatedWeakSignalsCount++;
  } else {
    // If signal is strong, decrease counter more quickly
    updatedWeakSignalsCount = Math.max(0, updatedWeakSignalsCount - 2);
  }
  
  // Require consecutive samples of weak signal to confirm
  const isWeakSignal = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  // Store for tracking
  consecutiveWeakSignalsCount = updatedWeakSignalsCount;
  
  return { 
    isWeakSignal, 
    updatedWeakSignalsCount 
  };
}

/**
 * Determines if signal is suitable for measurement
 */
export function shouldProcessMeasurement(
  value: number, 
  threshold = 0.03
): boolean {
  // Track this value for quality analysis
  recentValues.push(value);
  if (recentValues.length > MAX_RECENT_VALUES) {
    recentValues.shift();
  }
  
  // Simple threshold check for processing
  return Math.abs(value) >= threshold;
}

/**
 * Creates a result object for weak signal scenarios
 * Enhanced with arrhythmia tracking
 */
export function createWeakSignalResult(arrhythmiaCount = 0): any {
  // Reset finger detection when signal is weak
  signalQualityState.fingerDetected = false;
  
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount,
    isArrhythmia: false,
    rrData: {
      intervals: [],
      lastPeakTime: null
    },
    // Enhanced diagnostic information for weak signal
    diagnosticData: {
      signalStrength: 0,
      signalQuality: 'weak',
      detectionStatus: 'insufficient_signal',
      lastProcessedTime: Date.now(),
      isFingerDetected: false,
      isArrhythmia: false,
      arrhythmiaCount
    }
  };
}

/**
 * Detect if finger is present based on signal characteristics
 */
export function isFingerDetected(
  recentValues: number[],
  threshold: number = 0.05
): boolean {
  if (recentValues.length < 10) return false;
  
  // Calculate signal strength and variability
  const avgSignal = recentValues.reduce((sum, val) => sum + Math.abs(val), 0) / recentValues.length;
  
  // Baseline strength check
  if (avgSignal < threshold) return false;
  
  // Check for signal variability (living finger produces pulsatile signal)
  let sumDiffs = 0;
  for (let i = 1; i < recentValues.length; i++) {
    sumDiffs += Math.abs(recentValues[i] - recentValues[i-1]);
  }
  const avgDiff = sumDiffs / (recentValues.length - 1);
  
  // Need both adequate strength and variation
  const detected = avgSignal >= threshold && avgDiff >= threshold * 0.2;
  
  // Update state
  signalQualityState.fingerDetected = detected;
  
  return detected;
}

/**
 * Reset signal quality state
 */
export function resetSignalQualityState(): void {
  consecutiveWeakSignalsCount = 0;
  recentValues = [];
  signalQualityState = {
    lastQuality: 0,
    fingerDetected: false,
    stabilityScore: 0,
    noiseLevel: 0
  };
  
  console.log("Signal quality monitoring reset");
}

/**
 * Get current signal quality state
 */
export function getSignalQualityState(): any {
  return {
    ...signalQualityState,
    recentValuesCount: recentValues.length,
    consecutiveWeakSignals: consecutiveWeakSignalsCount
  };
}
