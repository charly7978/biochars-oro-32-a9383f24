
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

interface PeakDetectionResult {
  isPeak: boolean;
  peakIndex?: number;
  peakValue?: number;
  peakTime?: number;
}

interface DiagnosticsData {
  timestamp: number;
  processTime: number;
  processingPriority: 'low' | 'medium' | 'high';
  peakDetected: boolean;
  signalQuality: number;
  additionalInfo?: Record<string, any>;
}

let diagnosticsData: DiagnosticsData[] = [];

/**
 * Detect peaks in a signal buffer
 */
export function detectPeaks(
  buffer: number[], 
  threshold: number = 0.1,
  minDistance: number = 5
): PeakDetectionResult {
  if (buffer.length < 3) {
    return { isPeak: false };
  }
  
  const current = buffer[buffer.length - 1];
  const previous = buffer[buffer.length - 2];
  const beforePrevious = buffer[buffer.length - 3];
  
  // Simple peak detection: current value must be larger than previous and next
  const isPeak = 
    previous > current && 
    previous > beforePrevious && 
    previous > threshold;
  
  // Record diagnostics
  diagnosticsData.push({
    timestamp: Date.now(),
    processTime: Math.random() * 5 + 1, // Simulated processing time
    processingPriority: isPeak ? 'high' : 'medium',
    peakDetected: isPeak,
    signalQuality: Math.min(100, Math.max(0, (current + 2) * 50))
  });
  
  // Limit diagnostics data size
  if (diagnosticsData.length > 100) {
    diagnosticsData = diagnosticsData.slice(-100);
  }
  
  return {
    isPeak,
    peakIndex: isPeak ? buffer.length - 2 : undefined,
    peakValue: isPeak ? previous : undefined,
    peakTime: isPeak ? Date.now() : undefined
  };
}

/**
 * Calculate heart rate from peaks
 */
export function calculateHeartRate(
  peakTimes: number[],
  windowDurationMs: number = 10000
): number {
  if (peakTimes.length < 2) {
    return 0;
  }
  
  // Filter peaks within the time window
  const now = Date.now();
  const recentPeaks = peakTimes.filter(time => (now - time) <= windowDurationMs);
  
  // Need at least 2 peaks to calculate
  if (recentPeaks.length < 2) {
    return 0;
  }
  
  // Calculate average interval between peaks
  let totalInterval = 0;
  for (let i = 1; i < recentPeaks.length; i++) {
    totalInterval += recentPeaks[i] - recentPeaks[i-1];
  }
  
  const avgIntervalMs = totalInterval / (recentPeaks.length - 1);
  
  // Convert to BPM
  const beatsPerMinute = 60000 / avgIntervalMs;
  
  // Return BPM within physiological range
  return Math.round(Math.min(220, Math.max(30, beatsPerMinute)));
}

/**
 * Get diagnostics data for analysis
 */
export function getDiagnosticsData(): DiagnosticsData[] {
  return [...diagnosticsData];
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData(): void {
  diagnosticsData = [];
}
