/**
 * Peak detection and arrhythmia analysis module
 * Contains enhanced algorithms for cardiac signal analysis
 */
import React from 'react';

// Diagnostic tracking
interface DiagnosticEntry {
  timestamp: number;
  processTime: number;
  signalStrength: number;
  qualityScore: number;
  isPeak: boolean;
  rrInterval: number | null;
  processingPriority?: 'high' | 'medium' | 'low';
}

const diagnosticHistory: DiagnosticEntry[] = [];
const qualityDistribution = { high: 0, medium: 0, low: 0 };
let lastQualityTrend: number[] = [];

/**
 * Handle peak detection with enhanced arrhythmia awareness
 */
export function handlePeakDetection(
  result: any, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestBeepCallback: (value: number) => boolean,
  isMonitoringRef?: React.MutableRefObject<boolean>,
  value?: number
): void {
  const now = Date.now();
  const startTime = performance.now();
  
  // Only process peaks with minimum confidence
  if (result.isPeak && result.confidence > 0.4) {
    lastPeakTimeRef.current = now;
    
    // Detect potential arrhythmia on this beat
    const isArrhythmia = result.isArrhythmia || false;
    
    // If monitoring is active and confidence is high enough, trigger beep
    if ((!isMonitoringRef || isMonitoringRef.current) && result.confidence > 0.5) {
      // Pass arrhythmia information to the beep callback
      // This allows AudioManager to choose appropriate sound/vibration
      const event = new CustomEvent('cardiac-peak-detected', {
        detail: {
          heartRate: result.bpm || 0,
          source: 'signal-processor',
          isArrhythmia: isArrhythmia,
          signalStrength: value || 1,
          confidence: result.confidence
        }
      });
      window.dispatchEvent(event);
      
      // Also call direct callback if provided
      requestBeepCallback(value || 1);
      
      // Dispatch arrhythmia visualization event if arrhythmia detected
      if (isArrhythmia) {
        dispatchArrhythmiaVisualEvent(result.bpm || 0, now);
      }
    }
    
    // Track diagnostics
    const processingTime = performance.now() - startTime;
    diagnosticHistory.push({
      timestamp: now,
      processTime: processingTime,
      signalStrength: Math.abs(value || 0),
      qualityScore: result.confidence,
      isPeak: true,
      rrInterval: result.rrData?.intervals?.length > 0 ? 
        result.rrData.intervals[result.rrData.intervals.length - 1] : null
    });
    
    // Keep diagnostic history bounded
    if (diagnosticHistory.length > 100) {
      diagnosticHistory.shift();
    }
    
    // Update quality distribution
    if (result.confidence > 0.7) qualityDistribution.high++;
    else if (result.confidence > 0.4) qualityDistribution.medium++;
    else qualityDistribution.low++;
    
    // Update quality trend
    lastQualityTrend.push(result.confidence * 100);
    if (lastQualityTrend.length > 10) lastQualityTrend.shift();
  }
}

/**
 * Dispatch an event specifically for arrhythmia visualization
 */
function dispatchArrhythmiaVisualEvent(bpm: number, timestamp: number): void {
  // Create a dedicated event for visual representation of arrhythmias
  const arrhythmiaEvent = new CustomEvent('arrhythmia-visual', {
    detail: {
      timestamp,
      bpm,
      duration: 3000, // 3-second visual indicator
      severity: bpm > 100 ? 'high' : 'medium'
    }
  });
  
  window.dispatchEvent(arrhythmiaEvent);
  console.log('Arrhythmia visualization event dispatched', { timestamp, bpm });
}

/**
 * Detect arrhythmia based on RR intervals
 * Enhanced algorithm with improved false positive reduction
 */
export function detectArrhythmia(rrIntervals: number[]): boolean {
  if (rrIntervals.length < 3) return false;
  
  // Get recent intervals for analysis
  const recentIntervals = rrIntervals.slice(-5);
  
  // Calculate mean RR interval
  const meanRR = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length;
  
  // Calculate variation of each interval from mean
  const variations = recentIntervals.map(rr => Math.abs(rr - meanRR) / meanRR);
  
  // Check the most recent interval for significant variation
  const latestVariation = variations[variations.length - 1];
  
  // Dynamic threshold - more conservative to reduce false positives
  // Threshold adapts based on signal quality and history
  const baseThreshold = 0.20; // Increased from typical 0.15
  
  // Calculate historical variation for context
  const historicalVariation = variations.slice(0, -1).reduce((sum, val) => sum + val, 0) / 
                            Math.max(1, variations.length - 1);
  
  // Adjust threshold based on history
  const adjustedThreshold = baseThreshold + Math.min(0.1, historicalVariation * 0.5);
  
  // Require significant deviation from mean
  if (latestVariation > adjustedThreshold) {
    // Confirm with secondary check
    // Check if this is an isolated anomaly (more likely true arrhythmia)
    // rather than gradual drift (more likely noise)
    const secondLastVariation = variations.length > 1 ? variations[variations.length - 2] : 0;
    
    // True arrhythmia likely shows as isolated spike
    const isIsolatedAnomaly = secondLastVariation < adjustedThreshold * 0.7;
    
    return isIsolatedAnomaly;
  }
  
  return false;
}

/**
 * Calculate arrhythmia risk score based on RR interval pattern
 * Returns a score from 0-100
 */
export function calculateArrhythmiaRisk(rrIntervals: number[]): number {
  if (rrIntervals.length < 5) return 0;
  
  // Calculate time-domain HRV metrics
  
  // RMSSD (Root Mean Square of Successive Differences)
  let sumSquaredDiffs = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSquaredDiffs += diff * diff;
  }
  const rmssd = Math.sqrt(sumSquaredDiffs / (rrIntervals.length - 1));
  
  // SDNN (Standard Deviation of NN Intervals)
  const mean = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
  const sumSquaredDeviations = rrIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const sdnn = Math.sqrt(sumSquaredDeviations / rrIntervals.length);
  
  // Calculate pNN50 (percentage of successive RR intervals that differ by more than 50ms)
  let nn50Count = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    if (Math.abs(rrIntervals[i] - rrIntervals[i - 1]) > 50) {
      nn50Count++;
    }
  }
  const pnn50 = (nn50Count / (rrIntervals.length - 1)) * 100;
  
  // Base risk on physiological ranges - typical values:
  // RMSSD: 15-40ms normal, >100ms potential issue
  // SDNN: 40-80ms normal, <20ms or >100ms potential issue
  // pNN50: 3-15% normal, >40% unusual variability
  
  let risk = 0;
  
  // RMSSD contribution
  if (rmssd < 10 || rmssd > 150) {
    risk += 35;
  } else if (rmssd < 15 || rmssd > 100) {
    risk += 25;
  } else if (rmssd < 20 || rmssd > 80) {
    risk += 15;
  } else if (rmssd < 30 || rmssd > 60) {
    risk += 5;
  }
  
  // SDNN contribution
  if (sdnn < 20 || sdnn > 150) {
    risk += 30;
  } else if (sdnn < 30 || sdnn > 120) {
    risk += 20;
  } else if (sdnn < 40 || sdnn > 100) {
    risk += 10;
  }
  
  // pNN50 contribution
  if (pnn50 > 40) {
    risk += 35;
  } else if (pnn50 > 30) {
    risk += 25;
  } else if (pnn50 > 20) {
    risk += 15;
  } else if (pnn50 < 1) { // Very low variability can also indicate issues
    risk += 20;
  }
  
  // Cap the risk score at 100
  return Math.min(100, risk);
}

/**
 * Get user-friendly arrhythmia status message
 */
export function getArrhythmiaStatusMessage(arrhythmiaCount: number, riskScore: number): string {
  if (arrhythmiaCount === 0) {
    if (riskScore < 20) {
      return "Ritmo normal";
    } else if (riskScore < 40) {
      return "Ligera variabilidad";
    } else {
      return "Variabilidad elevada";
    }
  } else if (arrhythmiaCount === 1) {
    return "1 Arritmia detectada";
  } else {
    return `${arrhythmiaCount} Arritmias detectadas`;
  }
}

/**
 * Get aggregated diagnostics data
 */
export function getAverageDiagnostics(): {
  avgProcessTime: number;
  avgSignalStrength: number;
} {
  if (diagnosticHistory.length === 0) {
    return {
      avgProcessTime: 0,
      avgSignalStrength: 0
    };
  }
  
  const avgProcessTime = diagnosticHistory.reduce((sum, entry) => sum + entry.processTime, 0) / 
                        diagnosticHistory.length;
                        
  const avgSignalStrength = diagnosticHistory.reduce((sum, entry) => sum + entry.signalStrength, 0) / 
                           diagnosticHistory.length;
  
  return {
    avgProcessTime,
    avgSignalStrength
  };
}

/**
 * Get detailed quality statistics
 */
export function getDetailedQualityStats(): {
  qualityDistribution: typeof qualityDistribution;
  qualityTrend: number[];
} {
  return {
    qualityDistribution,
    qualityTrend: [...lastQualityTrend]
  };
}

/**
 * Get diagnostic data for detailed analysis
 */
export function getDiagnosticsData(): DiagnosticEntry[] {
  return [...diagnosticHistory];
}

/**
 * Clear diagnostic data history
 */
export function clearDiagnosticsData(): void {
  diagnosticHistory.length = 0;
  qualityDistribution.high = 0;
  qualityDistribution.medium = 0;
  qualityDistribution.low = 0;
  lastQualityTrend = [];
}

// Export the remaining functions and type definitions
export { getArrhythmiaStatusMessage, detectArrhythmia, calculateArrhythmiaRisk };
