/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Functions for checking signal quality and weak signals
 * Improved to reduce false positives and add rhythmic pattern detection
 * Enhanced with unified finger detector integration
 */
import {
  updateDetectionSource,
  checkSignalStrength,
  analyzeSignalForRhythmicPattern,
  isFingerDetected as unifiedIsFingerDetected
} from '@/modules/signal-processing';

// Signal history for pattern detection
let signalHistory: Array<{time: number, value: number}> = [];
let fingDetectionConfirmed = false;

// Track signal statistics to detect non-physiological patterns
let signalMean = 0;
let signalVariance = 0;
let consecutiveStableFrames = 0;
const REQUIRED_STABLE_FRAMES = 12; // Reducido de 15 para detección más rápida

// Track time-based consistency
let lastProcessTime = 0;
const MAX_ALLOWED_GAP_MS = 150; // Maximum time gap allowed between processing

/**
 * Checks if the signal is too weak, indicating possible finger removal
 * Now incorporates rhythmic pattern detection for more accurate finger detection
 * Improved with higher thresholds to reduce false positives
 * Integrated with unified finger detector for coordinated decisions
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
      fingDetectionConfirmed = false;
      consecutiveStableFrames = 0;
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
    
    // Check if variance is within physiological range
    const isPhysiological = signalVariance > 0.01 && signalVariance < 0.5;
    
    if (isPhysiological) {
      consecutiveStableFrames++;
    } else {
      consecutiveStableFrames = 0;
      
      // If we had confirmed detection but signal is no longer physiological, reset
      if (fingDetectionConfirmed) {
        console.log("Non-physiological signal detected - resetting finger detection", { variance: signalVariance });
        fingDetectionConfirmed = false;
      }
    }
  }
  
  // Check for rhythmic patterns only if we have enough stable frames
  // This prevents false detections from random noise
  if (consecutiveStableFrames >= REQUIRED_STABLE_FRAMES && !fingDetectionConfirmed) {
    // Utilizar detector de patrones rítmicos del sistema unificado
    fingDetectionConfirmed = analyzeSignalForRhythmicPattern(value, 0.6);
    
    if (fingDetectionConfirmed) {
      console.log("Finger detected by rhythmic pattern after physiological validation!", {
        time: new Date(now).toISOString(),
        variance: signalVariance,
        stableFrames: consecutiveStableFrames
      });
      
      return {
        isWeakSignal: false,
        updatedWeakSignalsCount: 0
      };
    }
  }
  
  // Usar sistema unificado para verificar debilidad de señal
  const result = checkSignalStrength(value, {
    lowSignalThreshold: config.lowSignalThreshold, 
    maxWeakSignalCount: config.maxWeakSignalCount
  });
  
  // If finger is confirmed but signal is weak, give benefit of doubt for longer
  if (fingDetectionConfirmed && result.isWeakSignal) {
    // Higher tolerance for confirmed finger detection
    return {
      isWeakSignal: result.updatedWeakSignalsCount >= config.maxWeakSignalCount * 1.8, // Increased multiplier
      updatedWeakSignalsCount: result.updatedWeakSignalsCount
    };
  }
  
  return {
    isWeakSignal: result.isWeakSignal,
    updatedWeakSignalsCount: result.updatedWeakSignalsCount
  };
}

/**
 * Reset signal quality detection state
 * Also resets finger pattern detection
 * Now also updates unified detector
 */
export function resetSignalQualityState() {
  signalHistory = [];
  fingDetectionConfirmed = false;
  signalMean = 0;
  signalVariance = 0;
  consecutiveStableFrames = 0;
  lastProcessTime = 0;
  console.log("Signal quality state reset, including pattern detection");
  
  // Actualizar detector unificado
  updateDetectionSource(
    'signal-quality-state',
    false,
    0.9 // Alta confianza en el reset
  );
  
  return {
    consecutiveWeakSignals: 0
  };
}

/**
 * Check if finger is detected based on rhythmic patterns
 * Now integrated with unified finger detector
 */
export function isFingerDetected(): boolean {
  // Adjust detection to be more sensitive
  const localDetection = fingDetectionConfirmed || 
                        (consecutiveStableFrames >= REQUIRED_STABLE_FRAMES);
  
  // Actualizar detector unificado con nuestro estado
  updateDetectionSource(
    'signal-quality-state',
    localDetection,
    localDetection ? 0.8 : 0.5
  );
  
  // Retornar decisión unificada para consistencia global
  return unifiedIsFingerDetected();
}

/**
 * Determines if a measurement should be processed based on signal strength
 * Uses rhythmic pattern detection alongside amplitude thresholds
 * Uses higher threshold to prevent false positives
 * Integrated with unified finger detector
 */
export function shouldProcessMeasurement(value: number): boolean {
  // Si la detección está confirmada, permitir procesamiento con umbral reducido
  if (unifiedIsFingerDetected() && consecutiveStableFrames >= REQUIRED_STABLE_FRAMES) {
    return Math.abs(value) >= 0.15; // Reducido de 0.18 para mayor sensibilidad
  }
  
  // Higher threshold to avoid processing weak signals (likely noise)
  return Math.abs(value) >= 0.25; // Reducido de 0.30 para mayor sensibilidad
}

/**
 * Creates default signal processing result when signal is too weak
 * Keeps compatibility with existing code
 */
export function createWeakSignalResult(arrhythmiaCounter: number = 0): any {
  // Actualizar detector con señal débil
  updateDetectionSource(
    'weak-signal-result',
    false,
    0.9 // Alta confianza en que no hay dedo
  );
  
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
