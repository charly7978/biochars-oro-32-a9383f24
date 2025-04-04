/**
 * Functions for processing signal results
 * Enhanced with improved blood pressure estimation
 */
import React from 'react';

// Collection of diagnostic data for analysis
let diagnosticDataHistory: any[] = [];

/**
 * Process signal results with low confidence
 * Enhanced with improved fallback handling
 */
export function processLowConfidenceResult(
  result: any, 
  currentBPM: number,
  arrhythmiaCounter: number = 0
): any {
  // Store diagnostic data for analysis
  if (result?.diagnosticData) {
    diagnosticDataHistory.push({
      timestamp: Date.now(),
      bpm: result.bpm,
      confidence: result.confidence,
      diagnosticData: { ...result.diagnosticData }
    });
    
    // Keep history bounded
    if (diagnosticDataHistory.length > 50) {
      diagnosticDataHistory.shift();
    }
  }

  // If confidence is very low, don't update values but maintain arrhythmia count
  if (result.confidence < 0.25) {
    return {
      bpm: currentBPM,
      confidence: result.confidence,
      isPeak: false,
      arrhythmiaCount: arrhythmiaCounter || 0,
      isArrhythmia: false,
      rrData: {
        intervals: [],
        lastPeakTime: null
      },
      diagnosticData: {
        ...(result.diagnosticData || {}),
        confidenceStatus: 'very_low',
        usingHistoricalBPM: currentBPM > 0,
        historyBPM: currentBPM
      }
    };
  }
  
  // For slightly better confidence, use the result but maintain the arrhythmia count
  return {
    ...result,
    arrhythmiaCount: arrhythmiaCounter,
    diagnosticData: {
      ...(result.diagnosticData || {}),
      arrhythmiaTracking: true,
      arrhythmiaCount: arrhythmiaCounter
    }
  };
}

/**
 * Updates the reference to last valid BPM when condition is met
 * Enhanced with additional validation
 */
export function updateLastValidBpm(result: any, lastValidBpmRef: React.MutableRefObject<number>): void {
  // Only update if result has reasonable confidence and BPM is physiologically plausible
  if (result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.4) {
    lastValidBpmRef.current = result.bpm;
    
    // Add timestamp to diagnostic data
    if (result.diagnosticData) {
      result.diagnosticData.lastValidBpmTime = Date.now();
      result.diagnosticData.bpmReliability = result.confidence;
    }
  }
}

/**
 * Enhance diagnostic data with calculated statistics 
 * for improved visualization and analysis
 * Improved blood pressure estimation based on hemodynamic patterns
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
  estimatedBloodPressure: string;
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
  
  // Improved blood pressure estimation
  // Based on heart rate, RR variability and quality metrics
  // This provides a more physiologically sound estimate
  let estimatedSystolic = 120;
  let estimatedDiastolic = 80;
  
  // Get average heart rate from RR intervals
  let heartRate = 60;
  if (rrIntervals.length >= 3) {
    const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    heartRate = Math.round(60000 / avgRR);
  }
  
  // Base adjustments on heart rate
  // Physiologically, higher heart rates tend to correlate with higher systolic
  // and slightly higher diastolic pressure
  if (heartRate > 90) {
    estimatedSystolic += (heartRate - 90) * 0.5;
    estimatedDiastolic += (heartRate - 90) * 0.3;
  } else if (heartRate < 70) {
    estimatedSystolic -= (70 - heartRate) * 0.5;
    estimatedDiastolic -= (70 - heartRate) * 0.2;
  }
  
  // Adjust for variability - higher variability often correlates with autonomic factors
  // that can influence blood pressure
  if (rrVariability > 0.15) {
    estimatedSystolic += 5;
    estimatedDiastolic -= 2;
  } else if (rrVariability < 0.05) {
    estimatedSystolic += 3;
    estimatedDiastolic += 3;
  }
  
  // Adjust for arrhythmias - certain arrhythmias can affect cardiac output
  if (arrhythmiaCount > 0) {
    estimatedSystolic += arrhythmiaCount * 3;
    estimatedDiastolic += arrhythmiaCount * 2;
  }
  
  // Ensure values stay in reasonable ranges
  estimatedSystolic = Math.max(90, Math.min(180, Math.round(estimatedSystolic)));
  estimatedDiastolic = Math.max(60, Math.min(110, Math.round(estimatedDiastolic)));
  
  // Make sure systolic is always at least 20 higher than diastolic
  if (estimatedSystolic - estimatedDiastolic < 20) {
    estimatedDiastolic = estimatedSystolic - 20;
  }
  
  // Format as string
  const estimatedBloodPressure = `${estimatedSystolic}/${estimatedDiastolic}`;
  
  return {
    rrVariability,
    signalDiagnostic,
    rhythmStatus,
    rhythmQuality,
    timeInterval,
    estimatedBloodPressure
  };
}

/**
 * Get diagnostic data history for external analysis
 */
export function getDiagnosticDataHistory(): any[] {
  return [...diagnosticDataHistory];
}

/**
 * Reset diagnostic data history
 */
export function resetDiagnosticDataHistory(): void {
  diagnosticDataHistory = [];
}
