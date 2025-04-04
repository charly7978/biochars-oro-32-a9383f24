/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Functions for peak detection logic, working with real data only
 */

// Diagnostics channel integration
export interface DiagnosticsData {
  timestamp: number;
  processTime: number;
  signalStrength: number;
  processorLoad: number;
  dataPointsProcessed: number;
  peakDetectionConfidence: number;
  processingPriority: 'high' | 'medium' | 'low';
  rhythmPattern?: {
    regularity: number;
    intervalConsistency: number;
    anomalyScore: number;
  };
  qualityScore?: number;
}

// Global diagnostics collector
let diagnosticsBuffer: DiagnosticsData[] = [];
const MAX_DIAGNOSTICS_BUFFER = 100;

/**
 * Determines if a measurement should be processed based on signal strength
 * Only processes real measurements
 * Now with improved prioritization based on signal strength
 */
export function shouldProcessMeasurement(value: number): boolean {
  // Añadir diagnóstico sobre decisión de procesamiento
  const signalStrength = Math.abs(value);
  const processingDecision = signalStrength >= 0.008;
  
  // Determinar prioridad basada en la fuerza de la señal
  let priority: 'high' | 'medium' | 'low' = 'low';
  if (signalStrength >= 0.05) {
    priority = 'high';
  } else if (signalStrength >= 0.02) {
    priority = 'medium';
  }
  
  // Calculate quality score based on signal attributes
  const qualityScore = signalStrength * 20;
  
  // Registrar diagnóstico
  addDiagnosticsData({
    timestamp: Date.now(),
    processTime: 0,
    signalStrength,
    processorLoad: 0,
    dataPointsProcessed: 1,
    peakDetectionConfidence: processingDecision ? signalStrength * 10 : 0,
    processingPriority: priority,
    qualityScore
  });
  
  // Umbral más sensible para capturar señales reales mientras filtra ruido
  return processingDecision; // Reducido aún más para mayor sensibilidad
}

/**
 * Creates default signal processing result when signal is too weak
 * Contains only real data structure with zero values
 * Now includes diagnostics and priority information
 */
export function createWeakSignalResult(arrhythmiaCounter: number = 0): any {
  // Registrar evento de señal débil en diagnósticos
  addDiagnosticsData({
    timestamp: Date.now(),
    processTime: 0,
    signalStrength: 0.005, // Valor bajo característico
    processorLoad: 0,
    dataPointsProcessed: 1,
    peakDetectionConfidence: 0,
    processingPriority: 'low',
    rhythmPattern: {
      regularity: 0,
      intervalConsistency: 0,
      anomalyScore: 0
    }
  });
  
  return {
    bpm: 0,
    confidence: 0,
    isPeak: false,
    arrhythmiaCount: arrhythmiaCounter || 0,
    rrData: {
      intervals: [],
      lastPeakTime: null
    },
    isArrhythmia: false,
    // Adding transition state to ensure continuous color rendering
    transition: {
      active: false,
      progress: 0,
      direction: 'none'
    },
    // Add priority information for downstream processing
    priority: 'low',
    // Add enhanced diagnostics
    diagnostics: {
      signalQuality: 'weak',
      detectionStatus: 'insufficient_signal',
      lastProcessedTime: Date.now()
    }
  };
}

/**
 * Handle peak detection with improved natural synchronization
 * Esta función se ha modificado para NO activar el beep - centralizado en PPGSignalMeter
 * No simulation is used - direct measurement only
 * Now with priority-based processing and diagnostics
 */
export function handlePeakDetection(
  result: any, 
  lastPeakTimeRef: React.MutableRefObject<number | null>,
  requestBeepCallback: (value: number) => boolean
): void {
  const startTime = performance.now();
  const now = Date.now();
  
  // Determinar prioridad basada en la confianza del resultado
  let priority: 'high' | 'medium' | 'low' = 'low';
  if (result.confidence > 0.5) {
    priority = 'high';
  } else if (result.confidence > 0.2) {
    priority = 'medium';
  }
  
  // Solo actualizar tiempo del pico para cálculos de tiempo
  if (result.isPeak && result.confidence > 0.05) {
    // Actualizar tiempo del pico para cálculos de tempo solamente
    lastPeakTimeRef.current = now;
    
    // Elevar la prioridad si se detecta un pico
    priority = 'high';
    
    // Enhanced diagnostics for peak detection
    if (result.diagnostics) {
      result.diagnostics.lastPeakDetected = now;
      result.diagnostics.peakStrength = result.confidence;
      result.diagnostics.detectionStatus = 'peak_detected';
      result.diagnostics.rhythmQuality = result.confidence > 0.7 ? 'excellent' : 
                                         result.confidence > 0.5 ? 'good' : 
                                         result.confidence > 0.3 ? 'moderate' : 'weak';
    }
    
    // EL BEEP SOLO SE MANEJA EN PPGSignalMeter CUANDO SE DIBUJA UN CÍRCULO
    console.log("Peak-detection: Pico detectado SIN solicitar beep - control exclusivo por PPGSignalMeter", {
      confianza: result.confidence,
      valor: 0, // No incluimos el valor por seguridad
      tiempo: new Date(now).toISOString(),
      // Log transition state if present
      transicion: result.transition ? {
        activa: result.transition.active,
        progreso: result.transition.progress,
        direccion: result.transition.direction
      } : 'no hay transición',
      isArrhythmia: result.isArrhythmia || false,
      prioridad: priority
    });
  }
  
  // Registrar diagnóstico con tiempo de procesamiento real
  const endTime = performance.now();
  addDiagnosticsData({
    timestamp: now,
    processTime: endTime - startTime,
    signalStrength: result.confidence || 0,
    processorLoad: 1,
    dataPointsProcessed: 1,
    peakDetectionConfidence: result.confidence || 0,
    processingPriority: priority,
    rhythmPattern: {
      regularity: calculateRegularity(lastPeakTimeRef.current, now),
      intervalConsistency: result.confidence || 0,
      anomalyScore: result.isArrhythmia ? 0.8 : 0.1
    }
  });
  
  // Añadir información de prioridad al resultado
  result.priority = priority;
}

/**
 * Calculate rhythm regularity based on peak intervals
 */
function calculateRegularity(lastPeakTime: number | null, currentTime: number): number {
  if (!lastPeakTime) return 0;
  
  const interval = currentTime - lastPeakTime;
  // Regular heart rhythm typically between 600-1000ms (60-100 BPM)
  if (interval >= 600 && interval <= 1000) {
    return 0.9; // High regularity
  } else if (interval >= 500 && interval <= 1200) {
    return 0.7; // Moderate regularity
  } else if (interval >= 400 && interval <= 1500) {
    return 0.4; // Low regularity
  }
  return 0.1; // Irregular
}

/**
 * Add diagnostics data to the buffer
 * Implements circular buffer to prevent memory leaks
 */
export function addDiagnosticsData(data: DiagnosticsData): void {
  diagnosticsBuffer.push(data);
  if (diagnosticsBuffer.length > MAX_DIAGNOSTICS_BUFFER) {
    diagnosticsBuffer.shift();
  }
}

/**
 * Get all diagnostics data
 * Allows external systems to access diagnostics without affecting main processing
 */
export function getDiagnosticsData(): DiagnosticsData[] {
  return [...diagnosticsBuffer];
}

/**
 * Clear diagnostics buffer
 */
export function clearDiagnosticsData(): void {
  diagnosticsBuffer = [];
}

/**
 * Get average processing time from diagnostics
 * Useful for performance monitoring
 * Enhanced with more detailed metrics
 */
export function getAverageDiagnostics(): {
  avgProcessTime: number;
  avgSignalStrength: number;
  highPriorityPercentage: number;
  peakRegularity: number;
  anomalyPercentage: number;
} {
  if (diagnosticsBuffer.length === 0) {
    return {
      avgProcessTime: 0,
      avgSignalStrength: 0,
      highPriorityPercentage: 0,
      peakRegularity: 0,
      anomalyPercentage: 0
    };
  }
  
  const totalTime = diagnosticsBuffer.reduce((sum, data) => sum + data.processTime, 0);
  const totalStrength = diagnosticsBuffer.reduce((sum, data) => sum + data.signalStrength, 0);
  const highPriorityCount = diagnosticsBuffer.filter(data => data.processingPriority === 'high').length;
  
  // Calculate regularity metrics
  const regularityValues = diagnosticsBuffer
    .filter(data => data.rhythmPattern?.regularity !== undefined)
    .map(data => data.rhythmPattern?.regularity || 0);
  
  const avgRegularity = regularityValues.length > 0 ? 
    regularityValues.reduce((sum, val) => sum + val, 0) / regularityValues.length : 0;
  
  // Calculate anomaly percentage
  const anomalyScores = diagnosticsBuffer
    .filter(data => data.rhythmPattern?.anomalyScore !== undefined)
    .map(data => data.rhythmPattern?.anomalyScore || 0);
  
  const avgAnomalyScore = anomalyScores.length > 0 ?
    anomalyScores.reduce((sum, val) => sum + val, 0) / anomalyScores.length : 0;
  
  return {
    avgProcessTime: totalTime / diagnosticsBuffer.length,
    avgSignalStrength: totalStrength / diagnosticsBuffer.length,
    highPriorityPercentage: (highPriorityCount / diagnosticsBuffer.length) * 100,
    peakRegularity: avgRegularity,
    anomalyPercentage: avgAnomalyScore * 100
  };
}

/**
 * Get detailed statistics about signal quality
 * New function for enhanced diagnostics
 */
export function getDetailedQualityStats(): {
  qualityDistribution: {
    excellent: number;
    good: number;
    moderate: number;
    weak: number;
  };
  lastQualityScore: number;
  qualityTrend: 'improving' | 'stable' | 'degrading';
} {
  // Default return for empty buffer
  if (diagnosticsBuffer.length < 5) {
    return {
      qualityDistribution: {
        excellent: 0,
        good: 0,
        moderate: 0,
        weak: 100
      },
      lastQualityScore: 0,
      qualityTrend: 'stable'
    };
  }
  
  // Get quality scores
  const qualityScores = diagnosticsBuffer
    .filter(data => data.qualityScore !== undefined)
    .map(data => data.qualityScore || 0);
  
  // Calculate distribution
  const excellent = qualityScores.filter(score => score >= 80).length;
  const good = qualityScores.filter(score => score >= 60 && score < 80).length;
  const moderate = qualityScores.filter(score => score >= 40 && score < 60).length;
  const weak = qualityScores.filter(score => score < 40).length;
  const total = qualityScores.length || 1;
  
  // Calculate trend
  const recentScores = qualityScores.slice(-10);
  const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
  const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
  
  const firstHalfAvg = firstHalf.length > 0 ? 
    firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length : 0;
  const secondHalfAvg = secondHalf.length > 0 ? 
    secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length : 0;
  
  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.1) {
    trend = 'improving';
  } else if (secondHalfAvg < firstHalfAvg * 0.9) {
    trend = 'degrading';
  }
  
  return {
    qualityDistribution: {
      excellent: (excellent / total) * 100,
      good: (good / total) * 100,
      moderate: (moderate / total) * 100,
      weak: (weak / total) * 100
    },
    lastQualityScore: qualityScores.length > 0 ? qualityScores[qualityScores.length - 1] : 0,
    qualityTrend: trend
  };
}
