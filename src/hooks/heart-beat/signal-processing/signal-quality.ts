/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Functions for checking signal quality and weak signals
 * Improved to reduce false positives and add rhythmic pattern detection
 */
import { checkSignalQuality, isFingerDetectedByPattern } from '../../../modules/heart-beat/signal-quality';
import { evaluateSignalQuality, calculatePerfusionIndex } from '../../../modules/vital-signs/utils/signal-processing-utils';

// Signal history for pattern detection
let signalHistory: Array<{time: number, value: number}> = [];
let patternDetectionCount = 0;
let fingDetectionConfirmed = false;

// Track signal statistics to detect non-physiological patterns
let signalMean = 0;
let signalVariance = 0;
let consecutiveStableFrames = 0;
const REQUIRED_STABLE_FRAMES = 15; // Must have physiologically stable signal for this many frames

// Advanced metrics for optimal detection
let perfusionIndexHistory: number[] = [];
const MIN_VALID_PERFUSION_INDEX = 0.25; // Minimum perfusion index for valid signal
let stabilityScore = 0;
let noiseLevel = 0;

// Track time-based consistency
let lastProcessTime = 0;
const MAX_ALLOWED_GAP_MS = 150; // Maximum time gap allowed between processing

// Save raw quality metrics for external use
let qualityMetrics = {
  amplitude: 0,
  stability: 0,
  noiseLevel: 0,
  fingerDetectionConfidence: 0,
  overallQuality: 0,
};

/**
 * Checks if the signal is too weak, indicating possible finger removal
 * Now incorporates rhythmic pattern detection for more accurate finger detection
 * Improved with higher thresholds to reduce false positives
 */
export function checkWeakSignal(
  value: number,
  consecutiveWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number,
    maxWeakSignalCount: number
  }
): {
  isWeakSignal: boolean,
  updatedWeakSignalsCount: number
} {
  // Track signal history
  const now = Date.now();
  
  // Check for large time gaps which indicate processing interruption (finger removed)
  if (lastProcessTime > 0) {
    const timeDiff = now - lastProcessTime;
    if (timeDiff > MAX_ALLOWED_GAP_MS) {
      console.log(`Signal quality: Large processing gap detected (${timeDiff}ms) - resetting detection`);
      signalHistory = [];
      patternDetectionCount = 0;
      fingDetectionConfirmed = false;
      consecutiveStableFrames = 0;
      perfusionIndexHistory = [];
      stabilityScore = 0;
    }
  }
  lastProcessTime = now;
  
  signalHistory.push({ time: now, value });
  
  // Keep only recent signals (last 6 seconds)
  signalHistory = signalHistory.filter(point => now - point.time < 6000);
  
  // Calculate signal statistics for physiological validation
  if (signalHistory.length > 10) {
    const values = signalHistory.slice(-10).map(p => p.value);
    signalMean = values.reduce((sum, val) => sum + val, 0) / values.length;
    signalVariance = values.reduce((sum, val) => sum + Math.pow(val - signalMean, 2), 0) / values.length;
    
    // Calculate perfusion index
    if (values.length > 5) {
      const latestPerfusionIndex = calculatePerfusionIndex(values);
      perfusionIndexHistory.push(latestPerfusionIndex);
      
      // Keep reasonable history size
      if (perfusionIndexHistory.length > 20) {
        perfusionIndexHistory.shift();
      }
      
      // Update quality metrics
      const recentSignalQuality = evaluateSignalQuality(values);
      
      qualityMetrics = {
        amplitude: Math.max(...values) - Math.min(...values),
        stability: stabilityScore,
        noiseLevel: noiseLevel,
        fingerDetectionConfidence: fingDetectionConfirmed ? 0.9 : patternDetectionCount / 10,
        overallQuality: recentSignalQuality / 100 // Convert to 0-1 scale
      };
    }
    
    // Check if variance is within physiological range
    const isPhysiological = signalVariance > 0.01 && signalVariance < 0.5;
    
    if (isPhysiological) {
      consecutiveStableFrames++;
      stabilityScore = Math.min(1.0, consecutiveStableFrames / (REQUIRED_STABLE_FRAMES * 1.5));
    } else {
      consecutiveStableFrames = 0;
      stabilityScore = Math.max(0, stabilityScore - 0.1);
      
      // If we had confirmed detection but signal is no longer physiological, reset
      if (fingDetectionConfirmed) {
        console.log("Non-physiological signal detected - resetting finger detection", { variance: signalVariance });
        fingDetectionConfirmed = false;
        patternDetectionCount = 0;
      }
    }
  }
  
  // Check for rhythmic patterns only if we have enough stable frames
  // This prevents false detections from random noise
  if (consecutiveStableFrames >= REQUIRED_STABLE_FRAMES && !fingDetectionConfirmed) {
    const patternResult = isFingerDetectedByPattern(signalHistory, patternDetectionCount);
    patternDetectionCount = patternResult.patternCount;
    
    // Only confirm finger if we have consistently detected patterns
    if (patternResult.isFingerDetected) {
      fingDetectionConfirmed = true;
      console.log("Finger detected by rhythmic pattern after physiological validation!", {
        time: new Date(now).toISOString(),
        variance: signalVariance,
        stableFrames: consecutiveStableFrames,
        perfusionIndex: perfusionIndexHistory.length > 0 ? 
          perfusionIndexHistory[perfusionIndexHistory.length - 1] : 0
      });
      
      return {
        isWeakSignal: false,
        updatedWeakSignalsCount: 0
      };
    }
  }
  
  // Check average perfusion index for more robust detection
  const avgPerfusionIndex = perfusionIndexHistory.length > 0 ? 
    perfusionIndexHistory.reduce((sum, val) => sum + val, 0) / perfusionIndexHistory.length : 0;
  
  // Strong perfusion index = finger definitely present
  if (avgPerfusionIndex > MIN_VALID_PERFUSION_INDEX && consecutiveStableFrames >= REQUIRED_STABLE_FRAMES/2) {
    if (!fingDetectionConfirmed) {
      console.log("Finger detected by strong perfusion index!", {
        perfusionIndex: avgPerfusionIndex,
        threshold: MIN_VALID_PERFUSION_INDEX
      });
      fingDetectionConfirmed = true;
    }
    return {
      isWeakSignal: false,
      updatedWeakSignalsCount: 0
    };
  }
  
  // Use higher thresholds if not specified
  const finalConfig = {
    lowSignalThreshold: config.lowSignalThreshold || 0.30, // Increased from 0.25
    maxWeakSignalCount: config.maxWeakSignalCount || 6    // Increased from 5
  };
  
  // If finger detection was previously confirmed but we have many consecutive weak signals,
  // we should reset the finger detection status
  if (fingDetectionConfirmed && consecutiveWeakSignalsCount > finalConfig.maxWeakSignalCount * 2) {
    fingDetectionConfirmed = false;
    patternDetectionCount = 0;
    consecutiveStableFrames = 0;
    console.log("Finger detection lost due to consecutive weak signals:", consecutiveWeakSignalsCount);
  }
  
  const result = checkSignalQuality(value, consecutiveWeakSignalsCount, finalConfig);
  
  // If finger is confirmed but signal is weak, give benefit of doubt for longer
  if (fingDetectionConfirmed && result.isWeakSignal) {
    // Higher tolerance for confirmed finger detection
    return {
      isWeakSignal: result.updatedWeakSignalsCount >= finalConfig.maxWeakSignalCount * 1.8, // Increased multiplier
      updatedWeakSignalsCount: result.updatedWeakSignalsCount
    };
  }
  
  return result;
}

/**
 * Reset signal quality detection state
 * Also resets finger pattern detection
 */
export function resetSignalQualityState() {
  signalHistory = [];
  patternDetectionCount = 0;
  fingDetectionConfirmed = false;
  signalMean = 0;
  signalVariance = 0;
  consecutiveStableFrames = 0;
  lastProcessTime = 0;
  perfusionIndexHistory = [];
  stabilityScore = 0;
  noiseLevel = 0;
  qualityMetrics = {
    amplitude: 0,
    stability: 0,
    noiseLevel: 0,
    fingerDetectionConfidence: 0,
    overallQuality: 0,
  };
  console.log("Signal quality state reset, including pattern detection");
  
  return {
    consecutiveWeakSignals: 0
  };
}

/**
 * Check if finger is detected based on rhythmic patterns
 */
export function isFingerDetected(): boolean {
  return fingDetectionConfirmed || (patternDetectionCount >= 3 && consecutiveStableFrames >= REQUIRED_STABLE_FRAMES);
}

/**
 * Get current signal quality metrics
 */
export function getSignalQualityMetrics(): {
  amplitude: number,
  stability: number,
  noiseLevel: number,
  fingerDetectionConfidence: number,
  overallQuality: number
} {
  return { ...qualityMetrics };
}

/**
 * Determines if a measurement should be processed based on signal strength
 * Uses rhythmic pattern detection alongside amplitude thresholds
 * Uses higher threshold to prevent false positives
 */
export function shouldProcessMeasurement(value: number): boolean {
  // If finger detection is confirmed by pattern, allow processing even if signal is slightly weak
  if (fingDetectionConfirmed && consecutiveStableFrames >= REQUIRED_STABLE_FRAMES) {
    return Math.abs(value) >= 0.18; // Lower threshold for confirmed finger
  }
  
  // Higher threshold to avoid processing weak signals (likely noise)
  return Math.abs(value) >= 0.30; // Increased from 0.25
}

/**
 * Creates default signal processing result when signal is too weak
 * Keeps compatibility with existing code
 */
export function createWeakSignalResult(arrhythmiaCounter: number = 0): any {
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount: arrhythmiaCounter || 0,
    rrData: {
      intervals: [],
      lastPeakTime: null
    }
  };
}
