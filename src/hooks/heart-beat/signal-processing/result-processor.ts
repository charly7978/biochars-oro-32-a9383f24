
/**
 * Functions for processing signal results
 */
import React from 'react';

/**
 * Process signal results with low confidence
 */
export function processLowConfidenceResult(
  result: any, 
  currentBPM: number,
  arrhythmiaCounter: number = 0
): any {
  // If confidence is very low, don't update values
  if (result.confidence < 0.25) {
    return {
      bpm: currentBPM,
      confidence: result.confidence,
      isPeak: false,
      arrhythmiaCount: arrhythmiaCounter || 0,
      rrData: {
        intervals: [],
        lastPeakTime: null
      }
    };
  }
  
  return result;
}

/**
 * Updates the reference to last valid BPM when condition is met
 */
export function updateLastValidBpm(result: any, lastValidBpmRef: React.MutableRefObject<number>): void {
  if (result.bpm >= 40 && result.bpm <= 200) {
    lastValidBpmRef.current = result.bpm;
  }
}

/**
 * Handle peak detection
 * Compatible with both simplified and complete call signatures
 */
export function handlePeakDetection(
  result: any, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestBeepCallback: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  const now = Date.now();
  
  // Only process peaks with minimum confidence
  if (result.isPeak && result.confidence > 0.4) {
    lastPeakTimeRef.current = now;
    
    // If monitoring is active and confidence is high enough, trigger beep
    if ((!isMonitoringRef || isMonitoringRef.current) && result.confidence > 0.5) {
      requestBeepCallback(value || 1);  // Use provided value or default to 1
    }
  }
}

/**
 * Enhance diagnostic data with calculated statistics 
 * for improved visualization and analysis
 */
export function enhanceDiagnosticData(
  rrIntervals: number[],
  signalQuality: number,
  arrhythmiaCount: number
): {
  rrVariability: number;
  signalDiagnostic: string;
  rhythmStatus: string;
  rhythmQuality: number;
  timeInterval: number;
} {
  // Calculate variability if we have enough intervals
  let rrVariability = 0;
  let timeInterval = 0;
  
  if (rrIntervals.length >= 3) {
    const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const variations = rrIntervals.map(rr => Math.abs(rr - avgRR) / avgRR);
    rrVariability = variations.reduce((a, b) => a + b, 0) / variations.length;
    timeInterval = avgRR;
  }
  
  // Determine signal diagnostic status
  let signalDiagnostic = "Señal insuficiente";
  if (signalQuality > 80) {
    signalDiagnostic = "Señal óptima";
  } else if (signalQuality > 60) {
    signalDiagnostic = "Señal buena";
  } else if (signalQuality > 40) {
    signalDiagnostic = "Señal aceptable";
  } else if (signalQuality > 20) {
    signalDiagnostic = "Señal débil";
  }
  
  // Determine rhythm quality and status
  let rhythmStatus = "Ritmo normal";
  let rhythmQuality = 100;
  
  if (arrhythmiaCount > 0) {
    rhythmStatus = `Arritmia${arrhythmiaCount > 1 ? 's' : ''} detectada${arrhythmiaCount > 1 ? 's' : ''}`;
    rhythmQuality = 100 - (arrhythmiaCount * 10);
    
    if (rrVariability > 0.2) {
      rhythmStatus = "Alta variabilidad RR";
    }
  } else if (rrIntervals.length > 3) {
    if (rrVariability > 0.15) {
      rhythmStatus = "Variabilidad elevada";
      rhythmQuality = 85;
    } else if (rrVariability < 0.05) {
      rhythmStatus = "Variabilidad muy baja";
      rhythmQuality = 90;
    }
  }
  
  return {
    rrVariability,
    signalDiagnostic,
    rhythmStatus,
    rhythmQuality,
    timeInterval
  };
}

