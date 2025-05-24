/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { HeartBeatResult } from '../types';

// Global diagnostics storage
let diagnosticsData: Array<{
  timestamp: number;
  processTime: number;
  signalStrength: number;
  quality: number;
}> = [];

/**
 * Handle peak detection with immediate beep
 */
export function handlePeakDetection(
  result: HeartBeatResult,
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestImmediateBeep: (value: number) => boolean,
  isMonitoringRef: React.MutableRefObject<boolean>,
  signalValue: number
): void {
  if (result.isPeak && isMonitoringRef.current) {
    const now = Date.now();
    
    // Store diagnostics
    diagnosticsData.push({
      timestamp: now,
      processTime: 1,
      signalStrength: Math.abs(signalValue),
      quality: result.confidence * 100
    });
    
    // Keep only last 100 entries
    if (diagnosticsData.length > 100) {
      diagnosticsData.shift();
    }
    
    lastPeakTimeRef.current = now;
    requestImmediateBeep(signalValue);
  }
}

/**
 * Find peaks in signal buffer
 */
export function findPeaks(buffer: number[], threshold: number = 0.1): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < buffer.length - 1; i++) {
    if (buffer[i] > buffer[i - 1] && 
        buffer[i] > buffer[i + 1] && 
        buffer[i] > threshold) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Get average diagnostics
 */
export function getAverageDiagnostics() {
  if (diagnosticsData.length === 0) {
    return {
      avgProcessTime: 0,
      avgSignalStrength: 0,
      avgQuality: 0
    };
  }
  
  const totals = diagnosticsData.reduce((acc, item) => ({
    processTime: acc.processTime + item.processTime,
    signalStrength: acc.signalStrength + item.signalStrength,
    quality: acc.quality + item.quality
  }), { processTime: 0, signalStrength: 0, quality: 0 });
  
  return {
    avgProcessTime: totals.processTime / diagnosticsData.length,
    avgSignalStrength: totals.signalStrength / diagnosticsData.length,
    avgQuality: totals.quality / diagnosticsData.length
  };
}

/**
 * Get detailed quality stats
 */
export function getDetailedQualityStats() {
  if (diagnosticsData.length === 0) {
    return {
      qualityDistribution: { excellent: 0, good: 0, poor: 0 },
      qualityTrend: 'stable'
    };
  }
  
  const distribution = diagnosticsData.reduce((acc, item) => {
    if (item.quality > 80) acc.excellent++;
    else if (item.quality > 50) acc.good++;
    else acc.poor++;
    return acc;
  }, { excellent: 0, good: 0, poor: 0 });
  
  return {
    qualityDistribution: distribution,
    qualityTrend: 'stable'
  };
}

/**
 * Get diagnostics data
 */
export function getDiagnosticsData() {
  return [...diagnosticsData];
}
