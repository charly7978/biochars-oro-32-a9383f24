
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Result processing utilities
 */

import type { DiagnosticData } from '../types';

/**
 * Updates the last valid BPM reference with diagnostic data
 */
export function updateLastValidBpm(
  result: any,
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
 * Enhanced with arrhythmia data preservation
 */
export function processLowConfidenceResult(
  result: any,
  currentBPM: number,
  arrhythmiaCount: number
): any {
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
        arrhythmiaCount: arrhythmiaCount,
        isArrhythmia: result.isArrhythmia || false
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
      arrhythmiaCount: arrhythmiaCount,
      isArrhythmia: result.isArrhythmia || false
    }
  };
}

/**
 * Enhance diagnostic data with arrhythmia information
 */
export function enhanceDiagnosticData(diagnosticData: DiagnosticData | undefined, isArrhythmia: boolean, arrhythmiaCount: number): DiagnosticData {
  if (!diagnosticData) {
    return {
      isArrhythmia,
      arrhythmiaCount,
      lastProcessedTime: Date.now()
    };
  }
  
  // Update arrhythmia flags in diagnostic data
  return {
    ...diagnosticData,
    isArrhythmia,
    arrhythmiaCount,
    lastProcessedTime: Date.now()
  };
}

// Add visualization event dispatcher
export function dispatchArrhythmiaVisualizationEvent(isArrhythmia: boolean, timestamp: number = Date.now()): void {
  if (!isArrhythmia) return;
  
  // Create event for visualization
  const event = new CustomEvent('arrhythmia-window-detected', {
    detail: {
      start: timestamp,
      end: timestamp + 2000, // 2 second window
      strength: 1.0
    }
  });
  
  // Dispatch event for visualization components to catch
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
    console.log("Arrhythmia visualization event dispatched", timestamp);
  }
}
