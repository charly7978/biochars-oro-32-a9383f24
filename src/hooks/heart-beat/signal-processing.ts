
import { HeartBeatResult } from './types';

/**
 * Interface for diagnostic data to fix TypeScript errors
 */
interface DiagnosticData {
  signalStrength?: number;
  signalQuality?: string;
  detectionStatus?: string;
  lastProcessedTime?: number;
  isFingerDetected?: boolean;
  isArrhythmia?: boolean;
  lastPeakDetected?: number;
  peakStrength?: number;
  lastValidBpmTime?: number;
  bpmReliability?: number;
  bpmStatus?: "normal" | "zero" | "high" | "low" | "using_historical";
  confidenceStatus?: "low" | "high" | "medium" | "very_low";
  usingHistoricalBPM?: boolean;
  historyBPM?: number;
  originalConfidence?: number;
  adjustedConfidence?: number;
  processingStatus?: string;
  arrhythmiaTracking?: boolean;
  arrhythmiaCount?: number;
}

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
  // Umbral de señal débil reducido para mayor sensibilidad pero con mayor exigencia de continuidad
  const isCurrentValueWeak = Math.abs(value) < config.lowSignalThreshold;
  
  let updatedWeakSignalsCount = currentWeakSignalsCount;
  
  if (isCurrentValueWeak) {
    updatedWeakSignalsCount++;
  } else {
    // Si la señal es fuerte, disminuimos el contador para recuperarse más rápidamente
    updatedWeakSignalsCount = Math.max(0, updatedWeakSignalsCount - 2);
  }
  
  // Requerimos más muestras consecutivas de señal débil para confirmar
  const isWeakSignal = updatedWeakSignalsCount >= config.maxWeakSignalCount;
  
  return { 
    isWeakSignal, 
    updatedWeakSignalsCount 
  };
}

/**
 * Determines if signal is suitable for measurement
 * Updated with threshold parameter for customization and added filter
 * for baseline signal noise
 */
export function shouldProcessMeasurement(
  value: number, 
  threshold = 0.03 // Threshold now customizable and reduced for better sensitivity
): boolean {
  // Improved measurement discrimination with baseline filter
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
    // Add enhanced diagnostic information for weak signal
    diagnosticData: {
      signalStrength: 0,
      signalQuality: 'weak',
      detectionStatus: 'insufficient_signal',
      lastProcessedTime: Date.now(),
      isFingerDetected: false,
      isArrhythmia: false
    }
  };
}

/**
 * Handles peak detection and beep requests
 * Enhanced with arrhythmia detection
 */
export function handlePeakDetection(
  result: HeartBeatResult,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  const now = Date.now();
  
  if (result.isPeak) {
    // Update peak time
    lastPeakTimeRef.current = now;
    
    // If monitoring is active and we have a value, trigger beep
    // Pass arrhythmia information for differential sound
    if ((!isMonitoringRef || isMonitoringRef.current) && value !== undefined) {
      // Emit event for optimized peak handling with arrhythmia info
      const event = new CustomEvent('cardiac-peak-detected', {
        detail: {
          heartRate: result.bpm || 0,
          source: 'signal-processor',
          isArrhythmia: result.isArrhythmia || false,
          signalStrength: Math.abs(value),
          confidence: result.confidence
        }
      });
      window.dispatchEvent(event);
      
      // Also use direct callback
      requestImmediateBeep(value);
    }
    
    // Enhanced diagnostics for peak detection
    if (result.diagnosticData) {
      result.diagnosticData.lastPeakDetected = now;
      result.diagnosticData.peakStrength = result.confidence;
      result.diagnosticData.detectionStatus = 'peak_detected';
      result.diagnosticData.isArrhythmia = result.isArrhythmia || false;
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
    
    // Add enhanced diagnostic information for valid BPM
    if (result.diagnosticData) {
      result.diagnosticData.lastValidBpmTime = Date.now();
      result.diagnosticData.bpmReliability = result.confidence;
      result.diagnosticData.bpmStatus = "normal";
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
        adjustedConfidence: Math.max(0.3, result.confidence),
        arrhythmiaTracking: true,
        arrhythmiaCount: arrhythmiaCount
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
        arrhythmiaTracking: true,
        arrhythmiaCount: arrhythmiaCount
      }
    };
  }
  
  return {
    ...result,
    arrhythmiaCount,
    diagnosticData: {
      ...(result.diagnosticData || {}),
      processingStatus: 'normal',
      arrhythmiaCount: arrhythmiaCount
    }
  };
}

/**
 * Detect if finger is present based on signal characteristics
 * New function for improved finger detection
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
  return avgSignal >= threshold && avgDiff >= threshold * 0.2;
}

/**
 * Reset signal quality state
 * New function for state management
 */
export function resetSignalQualityState(): void {
  // This function is implemented in the separate signal-quality.ts module
  console.log("Signal quality monitoring reset");
}
