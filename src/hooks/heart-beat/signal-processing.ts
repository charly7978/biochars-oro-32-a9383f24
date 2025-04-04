
import { HeartBeatResult } from './types';

/**
 * Checks if the signal is too weak to process
 */
export function checkWeakSignal(
  value: number, 
  currentWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number,
    maxWeakSignalCount: number
  }
): { isWeakSignal: boolean, updatedWeakSignalsCount: number } {
  // Umbral de señal débil reducido para mayor sensibilidad
  const isCurrentValueWeak = Math.abs(value) < config.lowSignalThreshold;
  
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isCurrentValueWeak) {
    updatedWeakSignalsCount++;
  } else {
    // Si la señal es fuerte, disminuimos el contador para recuperarse más rápidamente
    updatedWeakSignalsCount = Math.max(0, updatedWeakSignalsCount - 2);
  }
  
  const isWeakSignal = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  return { 
    isWeakSignal, 
    updatedWeakSignalsCount 
  };
}

/**
 * Determines if signal is suitable for measurement
 * Updated with threshold parameter for customization
 */
export function shouldProcessMeasurement(
  value: number, 
  threshold = 0.03 // Threshold now customizable and reduced for better sensitivity
): boolean {
  return Math.abs(value) >= threshold;
}

/**
 * Creates a result object for weak signal scenarios
 * Enhanced with additional diagnostic data
 */
export function createWeakSignalResult(arrhythmiaCount = 0): HeartBeatResult {
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
    // Add diagnostic information for weak signal
    diagnosticData: {
      signalStrength: 0,
      signalQuality: 'weak',
      detectionStatus: 'insufficient_signal',
      lastProcessedTime: Date.now()
    }
  };
}

/**
 * Handles peak detection and beep requests
 * Enhanced for improved visualization and response
 */
export function handlePeakDetection(
  result: HeartBeatResult,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean
): void {
  if (result.isPeak) {
    const now = Date.now();
    
    // Update peak time
    lastPeakTimeRef.current = now;
    
    // Enhanced diagnostics for peak detection
    if (result.diagnosticData) {
      result.diagnosticData.lastPeakDetected = now;
      result.diagnosticData.peakStrength = result.confidence;
      result.diagnosticData.detectionStatus = 'peak_detected';
    }
  }
}

/**
 * Updates the last valid BPM reference
 * Enhanced with diagnostic capture
 */
export function updateLastValidBpm(
  result: HeartBeatResult,
  lastValidBpmRef: React.MutableRefObject<number>
): void {
  if (result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.4) {
    lastValidBpmRef.current = result.bpm;
    
    // Add diagnostic information for valid BPM
    if (result.diagnosticData) {
      result.diagnosticData.lastValidBpmTime = Date.now();
      result.diagnosticData.bpmReliability = result.confidence;
    }
  }
}

/**
 * Processes low confidence results and ensures valid output
 * Enhanced with historical BPM support and diagnostic data
 */
export function processLowConfidenceResult(
  result: HeartBeatResult,
  currentBPM: number,
  arrhythmiaCount: number
): HeartBeatResult {
  // Handle low confidence results by maintaining current BPM
  if (result.confidence < 0.3 && currentBPM > 0) {
    // Enhanced diagnostics for low confidence
    const enhancedResult = {
      ...result,
      bpm: currentBPM,
      confidence: Math.max(0.3, result.confidence), // Minimum confidence to show something
      arrhythmiaCount,
      diagnosticData: {
        ...(result.diagnosticData || {}),
        confidenceStatus: 'low' as 'low',
        usingHistoricalBPM: true,
        historyBPM: currentBPM,
        originalConfidence: result.confidence,
        adjustedConfidence: Math.max(0.3, result.confidence)
      }
    };
    
    return enhancedResult;
  }
  
  // If no current BPM and low confidence, ensure arrhythmia count is preserved
  if (result.bpm === 0) {
    return {
      ...result,
      arrhythmiaCount,
      diagnosticData: {
        ...(result.diagnosticData || {}),
        bpmStatus: 'zero',
        arrhythmiaTracking: true
      }
    };
  }
  
  return {
    ...result,
    arrhythmiaCount,
    diagnosticData: {
      ...(result.diagnosticData || {}),
      processingStatus: 'normal'
    }
  };
}
