
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Peak detection utilities
 */

// Data structure for peak detection
interface PeakDetectionData {
  recentValues: number[];
  lastPeakIndex: number;
  lastPeakTime: number | null;
  threshold: number;
  minTimeBetweenPeaks: number;
}

// Store for diagnostics data
const diagnosticsData: Array<{
  timestamp: number;
  processTime: number;
  peakDetected: boolean;
  processingPriority: 'high' | 'medium' | 'low';
  signalQuality?: number;
}> = [];

/**
 * Handle peak detection logic
 */
export function handlePeakDetection(
  value: number,
  time: number,
  recentValues: number[],
  lastPeakTime: number | null = null,
  threshold: number = 0.05,
  minTimeBetweenPeaks: number = 300
): {
  isPeak: boolean;
  peakTime: number | null;
  peakValue: number | null;
  confidence: number;
} {
  const startTime = performance.now();
  
  // Need at least 3 values for peak detection
  if (recentValues.length < 3) {
    return {
      isPeak: false,
      peakTime: null,
      peakValue: null,
      confidence: 0
    };
  }
  
  // Get the last three values
  const n = recentValues.length;
  const a = recentValues[n - 3];
  const b = recentValues[n - 2];
  const c = recentValues[n - 1];
  
  // Simple peak detection algorithm
  const isPeak = b > a && b > c && b > threshold;

  // Check minimum time between peaks
  let validPeak = isPeak;
  if (isPeak && lastPeakTime !== null) {
    validPeak = (time - lastPeakTime) > minTimeBetweenPeaks;
  }
  
  // Calculate confidence based on peak height
  const peakHeight = validPeak ? b - Math.max(a, c) : 0;
  const confidence = validPeak ? Math.min(1, peakHeight / 0.2) : 0;

  // Calculate processing time for diagnostics
  const processTime = performance.now() - startTime;
  
  // Determine processing priority based on signal quality
  const signalQuality = Math.min(1, Math.abs(value) * 10);
  let processingPriority: 'high' | 'medium' | 'low';
  
  if (signalQuality > 0.7) {
    processingPriority = 'high';
  } else if (signalQuality > 0.4) {
    processingPriority = 'medium';
  } else {
    processingPriority = 'low';
  }
  
  // Store diagnostics data
  diagnosticsData.push({
    timestamp: time,
    processTime,
    peakDetected: validPeak,
    processingPriority,
    signalQuality
  });
  
  // Limit diagnostics data array size
  if (diagnosticsData.length > 100) {
    diagnosticsData.shift();
  }
  
  return {
    isPeak: validPeak,
    peakTime: validPeak ? time : null,
    peakValue: validPeak ? b : null,
    confidence
  };
}

/**
 * Find peaks in a signal array
 */
export function findPeaks(values: number[], threshold: number = 0.05): number[] {
  const peaks: number[] = [];
  
  // Need at least 3 values
  if (values.length < 3) {
    return peaks;
  }
  
  // Scan through all values except first and last
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];
    
    // Simple peak detection
    if (curr > prev && curr > next && curr > threshold) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Get stored diagnostics data
 */
export function getDiagnosticsData(): typeof diagnosticsData {
  return [...diagnosticsData];
}

/**
 * Clear diagnostics data
 */
export function clearDiagnosticsData(): void {
  diagnosticsData.length = 0;
}

