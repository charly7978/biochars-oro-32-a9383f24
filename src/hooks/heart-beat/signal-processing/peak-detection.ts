
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Peak detection functionality for heart signal processing
 */

import type { DiagnosticData } from '../types';

// Global diagnostics storage for visualization and tracking
let diagnosticsData: DiagnosticData = {
  signalStrength: 0,
  signalQuality: 'moderate',
  isFingerDetected: false,
  isArrhythmia: false,
  arrhythmiaCount: 0,
  lastProcessedTime: 0,
  rhythmAnalysis: {
    regularity: 0,
    variability: 0
  }
};

/**
 * Handle peak detection with arrhythmia visualization
 */
export function handlePeakDetection(
  result: any,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  const now = Date.now();
  
  if (result.isPeak) {
    // Update peak time
    lastPeakTimeRef.current = now;
    
    // Check if arrhythmia was detected
    if (result.isArrhythmia) {
      // Dispatch custom event for arrhythmia visualization
      const event = new CustomEvent('arrhythmia-window-detected', {
        detail: {
          start: now,
          end: now + 2000, // 2 second window
          strength: result.confidence || 0.5
        }
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
      }
      
      // Update diagnostics
      diagnosticsData.isArrhythmia = true;
      diagnosticsData.arrhythmiaCount = (diagnosticsData.arrhythmiaCount || 0) + 1;
    }
    
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
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
      }
      
      // Also use direct callback with arrhythmia information
      if (result.isArrhythmia) {
        // For arrhythmic beats, pass negative value to differentiate sound
        requestImmediateBeep(value * -1);
      } else {
        requestImmediateBeep(value);
      }
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
 * Detect arrhythmia in the signal
 */
export function detectArrhythmia(intervals: number[]): boolean {
  if (!intervals || intervals.length < 5) return false;
  
  // Get last intervals for analysis
  const recentIntervals = intervals.slice(-5);
  
  // Calculate average and variability
  const avgInterval = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
  const variability = recentIntervals.map(interval => Math.abs((interval - avgInterval) / avgInterval)).reduce((max, val) => Math.max(max, val), 0);
  
  // Detect significant variability as arrhythmia
  const isArrhythmia = variability > 0.2; // 20% variation threshold
  
  if (isArrhythmia) {
    // Update diagnostics
    diagnosticsData.rhythmAnalysis = {
      regularity: 1 - variability,
      variability: variability
    };
    diagnosticsData.isArrhythmia = true;
    
    // Dispatch arrhythmia visualization event
    const event = new CustomEvent('arrhythmia-window-detected', {
      detail: {
        start: Date.now(),
        end: Date.now() + 2000, // 2 second window
        strength: variability
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }
  
  return isArrhythmia;
}

/**
 * Calculate risk level for arrhythmia
 */
export function calculateArrhythmiaRisk(intervals: number[]): number {
  if (!intervals || intervals.length < 3) return 0;
  
  // Get recent intervals
  const recentIntervals = intervals.slice(-8);
  
  // Calculate variance
  const avgInterval = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
  const variance = recentIntervals.map(i => Math.pow(i - avgInterval, 2)).reduce((sum, val) => sum + val, 0) / recentIntervals.length;
  
  // Normalize risk score between 0-1
  const riskScore = Math.min(1, Math.sqrt(variance) / 200);
  
  // Update diagnostics
  diagnosticsData.rhythmAnalysis = {
    regularity: 1 - riskScore,
    variability: riskScore
  };
  
  return riskScore;
}

/**
 * Get textual status message for arrhythmia state
 */
export function getArrhythmiaStatusMessage(isArrhythmia: boolean, count: number): string {
  return isArrhythmia 
    ? `ARRHYTHMIA DETECTED|${count}`
    : `NORMAL RHYTHM|${count}`;
}

/**
 * Get diagnostics data for analytics and visualization
 */
export function getDiagnosticsData(): DiagnosticData {
  diagnosticsData.lastProcessedTime = Date.now();
  return { ...diagnosticsData };
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData(): void {
  diagnosticsData = {
    signalStrength: 0,
    signalQuality: 'moderate',
    isFingerDetected: false,
    isArrhythmia: false,
    arrhythmiaCount: 0,
    lastProcessedTime: Date.now(),
    rhythmAnalysis: {
      regularity: 0,
      variability: 0
    }
  };
}
