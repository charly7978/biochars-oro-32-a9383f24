/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades para detección de presencia de dedo
 * Versión mejorada que se integra con el detector unificado
 */
import { unifiedFingerDetector } from './unified-finger-detector';
import { fingerDiagnostics, reportFingerDetection } from './finger-diagnostics';
import { adaptiveCalibration, getCalibrationParameters } from './adaptive-calibration';

// Almacenamiento para detección de patrones rítmicos
let rhythmDetectionHistory: Array<{time: number, value: number}> = [];
let confirmedFingerPresence: boolean = false;
let lastPeakTimes: number[] = [];
let consistentPatternsCount: number = 0;

// Constantes para detección de patrones - Ahora adaptativas
const PATTERN_WINDOW_MS = 3000; // Ventana de 3 segundos
const MIN_PEAKS_FOR_PATTERN = 3; // Mínimo 3 picos para confirmar patrón
let PEAK_DETECTION_THRESHOLD = 0.2; // Umbral para detección de picos - ahora adaptativo
let REQUIRED_CONSISTENT_PATTERNS = 3; // Patrones requeridos para confirmación - ahora adaptativo
const MAX_CONSISTENT_PATTERNS = 10; // Máximo contador de patrones para evitar overflow

/**
 * Detecta la presencia de un dedo basado en análisis de patrones de la señal PPG
 * Ahora integrado con el detector unificado y sistema de diagnóstico
 * Mejora adaptativa con umbral dinámico
 * @param signalBuffer Buffer de señal filtrada
 * @param sensitivity Factor de sensibilidad (0-1)
 * @returns true si se detecta presencia de dedo
 */
export function detectFingerPresence(
  signalBuffer: number[],
  sensitivity: number = 0.6
): boolean {
  // Obtener parámetros adaptativos de calibración
  const calibrationParams = getCalibrationParameters();
  PEAK_DETECTION_THRESHOLD = calibrationParams.rhythmDetectionThreshold;
  REQUIRED_CONSISTENT_PATTERNS = Math.round(3 + (1 - calibrationParams.sensitivityLevel) * 2);
  
  // Ajustar sensibilidad según calibración
  const adjustedSensitivity = (sensitivity + calibrationParams.sensitivityLevel) / 2;
  
  // Si ya confirmamos la presencia, mantenerla a menos que se pierda el patrón
  if (confirmedFingerPresence) {
    // Verificar si aún tenemos un patrón válido
    const stillValid = validateOngoingPattern(signalBuffer);
    
    if (!stillValid) {
      // Si se pierde el patrón, reducir contador de consistencia
      consistentPatternsCount = Math.max(0, consistentPatternsCount - 1);
      
      // Si perdimos demasiados patrones, quitar la confirmación
      if (consistentPatternsCount < 1) {
        confirmedFingerPresence = false;
        
        // Registrar evento de diagnóstico - pérdida de detección
        fingerDiagnostics.logEvent({
          eventType: 'PATTERN_LOST',
          source: 'rhythm-detector',
          isFingerDetected: false,
          confidence: 0.3,
          details: {
            consistentPatternsCount,
            bufferLength: signalBuffer.length
          }
        });
        
        // Registrar transición de detección
        reportFingerDetection(false, 0.3, 'rhythm-detector', {
          reason: 'pattern-lost',
          timestamp: Date.now()
        });
      }
    }
  }
  
  // Agregar nuevo valor al historial
  if (signalBuffer.length > 0) {
    const now = Date.now();
    rhythmDetectionHistory.push({
      time: now,
      value: signalBuffer[signalBuffer.length - 1]
    });
    
    // Mantener solo valores recientes
    rhythmDetectionHistory = rhythmDetectionHistory
      .filter(point => now - point.time < PATTERN_WINDOW_MS * 2);
  }
  
  // Detectar patrones rítmicos con umbrales adaptativos
  const rhythmResult = detectRhythmicPattern(adjustedSensitivity);
  const hasRhythmicPattern = rhythmResult.hasPattern;
  
  // Si detectamos patrón, incrementar contador
  if (hasRhythmicPattern) {
    consistentPatternsCount = Math.min(
      MAX_CONSISTENT_PATTERNS, 
      consistentPatternsCount + 1
    );
    
    // Registrar evento de diagnóstico - patrón detectado
    if (consistentPatternsCount % 2 === 0) { // Registrar cada 2 para no sobrecargar
      fingerDiagnostics.logEvent({
        eventType: 'PATTERN_DETECTED',
        source: 'rhythm-detector',
        isFingerDetected: true,
        confidence: Math.min(0.9, consistentPatternsCount / REQUIRED_CONSISTENT_PATTERNS),
        details: {
          peaks: rhythmResult.peakCount,
          intervals: rhythmResult.intervals,
          averageInterval: rhythmResult.averageInterval
        }
      });
    }
    
    // Si tenemos suficientes patrones consecutivos, confirmar presencia
    if (!confirmedFingerPresence && consistentPatternsCount >= REQUIRED_CONSISTENT_PATTERNS) {
      confirmedFingerPresence = true;
      
      // Registrar transición de detección
      reportFingerDetection(true, 0.8, 'rhythm-detector', {
        consistentPatterns: consistentPatternsCount,
        requiredPatterns: REQUIRED_CONSISTENT_PATTERNS,
        intervals: rhythmResult.intervals
      });
    }
  } else {
    // Reducir contador si no hay patrón
    consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.5);
  }
  
  // Actualizar detector unificado con resultado de este método
  const confidence = Math.min(1.0, consistentPatternsCount / REQUIRED_CONSISTENT_PATTERNS);
  unifiedFingerDetector.updateSource(
    'rhythm-pattern', 
    confirmedFingerPresence,
    confidence
  );
  
  // Actualizar estado ambiental para calibración
  if (signalBuffer.length > 10) {
    // Calcular medidas de calidad de la señal
    const recentValues = signalBuffer.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    const snr = calculateSignalToNoiseRatio(recentValues);
    
    // Actualizar estado ambiental
    adaptiveCalibration.updateEnvironmentalState({
      signalToNoiseRatio: snr,
      // Otros parámetros ambientales pueden actualizarse en otros lugares
    });
  }
  
  // Retornar estado basado en detector unificado para consistencia global
  return unifiedFingerDetector.getDetectionState().isFingerDetected;
}

/**
 * Detecta patrones rítmicos en la señal
 * Versión mejorada con parámetros adaptativos y diagnóstico
 */
function detectRhythmicPattern(sensitivity: number): {
  hasPattern: boolean;
  peakCount: number;
  intervals: number[];
  averageInterval: number;
} {
  const now = Date.now();
  
  if (rhythmDetectionHistory.length < 15) {
    return {
      hasPattern: false,
      peakCount: 0,
      intervals: [],
      averageInterval: 0
    };
  }
  
  // Ajustar umbral según sensibilidad y calibración
  const calibrationParams = getCalibrationParameters();
  const adjustedThreshold = PEAK_DETECTION_THRESHOLD * (1.2 - sensitivity) * 
                           (1 + (1 - calibrationParams.sensitivityLevel) * 0.5);
  
  // Buscar picos en la señal reciente
  const recentSignals = rhythmDetectionHistory
    .filter(point => now - point.time < PATTERN_WINDOW_MS);
  
  if (recentSignals.length < 10) {
    return {
      hasPattern: false,
      peakCount: 0,
      intervals: [],
      averageInterval: 0
    };
  }
  
  // Detectar picos
  const peaks: number[] = [];
  
  for (let i = 2; i < recentSignals.length - 2; i++) {
    const current = recentSignals[i];
    const prev1 = recentSignals[i - 1];
    const prev2 = recentSignals[i - 2];
    const next1 = recentSignals[i + 1];
    const next2 = recentSignals[i + 2];
    
    // Verificar si este punto es un pico
    if (current.value > prev1.value && 
        current.value > prev2.value &&
        current.value > next1.value && 
        current.value > next2.value &&
        current.value > adjustedThreshold) {
      peaks.push(current.time);
    }
  }
  
  // Verificar si tenemos suficientes picos
  if (peaks.length < MIN_PEAKS_FOR_PATTERN) {
    return {
      hasPattern: false,
      peakCount: peaks.length,
      intervals: [],
      averageInterval: 0
    };
  }
  
  // Calcular intervalos entre picos
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  // Filtrar intervalos fisiológicamente plausibles (40-180 BPM)
  const validIntervals = intervals.filter(interval => 
    interval >= 333 && interval <= 1500
  );
  
  if (validIntervals.length < Math.floor(intervals.length * 0.7)) {
    // Menos del 70% de intervalos son plausibles
    return {
      hasPattern: false,
      peakCount: peaks.length,
      intervals: validIntervals,
      averageInterval: validIntervals.length > 0 
        ? validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length 
        : 0
    };
  }
  
  // Verificar consistencia en intervalos
  let consistentIntervals = 0;
  let maxDeviation = 200; // ms - base
  
  // Ajustar maxDeviation según la calibración
  maxDeviation += (1 - calibrationParams.sensitivityLevel) * 100;
  
  for (let i = 1; i < validIntervals.length; i++) {
    if (Math.abs(validIntervals[i] - validIntervals[i - 1]) < maxDeviation) {
      consistentIntervals++;
    }
  }
  
  // Si tenemos intervalos consistentes, confirmar patrón
  const hasPattern = consistentIntervals >= MIN_PEAKS_FOR_PATTERN - 1;
  
  if (hasPattern) {
    lastPeakTimes = peaks;
  }
  
  const averageInterval = validIntervals.length > 0 
    ? validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length 
    : 0;
    
  return {
    hasPattern,
    peakCount: peaks.length,
    intervals: validIntervals,
    averageInterval
  };
}

/**
 * Calcula la relación señal/ruido para análisis de calidad
 */
function calculateSignalToNoiseRatio(values: number[]): number {
  if (values.length < 5) return 0.5; // Valor por defecto
  
  // Calcular media
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Calcular varianza (ruido)
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  
  // Calcular amplitud pico a pico (señal)
  const min = Math.min(...values);
  const max = Math.max(...values);
  const peakToPeak = max - min;
  
  // Calcular SNR
  const snr = peakToPeak > 0 ? peakToPeak / Math.sqrt(variance) : 0;
  
  // Normalizar a rango 0-1
  return Math.min(1, snr / 10);
}

/**
 * Valida si el patrón rítmico continúa presente
 * Versión mejorada con mejor validación fisiológica
 */
function validateOngoingPattern(signalBuffer: number[]): boolean {
  // Si el buffer es muy pequeño, no podemos validar
  if (signalBuffer.length < 10) {
    return true; // Asumir que sigue siendo válido por falta de datos
  }
  
  // Obtener calibración actual
  const calibrationParams = getCalibrationParameters();
  
  // Verificar que la señal sigue teniendo variaciones 
  // (evitar señales planas que podrían falsamente parecer estables)
  const min = Math.min(...signalBuffer);
  const max = Math.max(...signalBuffer);
  let amplitude = max - min;
  
  // Ajustar umbral de amplitud según calibración
  const amplitudeThreshold = 0.05 * (1 - calibrationParams.sensitivityLevel * 0.5);
  
  // Si la amplitud es muy baja, no hay dedo
  if (amplitude < amplitudeThreshold) {
    // Registrar evento diagnóstico - baja amplitud
    fingerDiagnostics.logEvent({
      eventType: 'LOW_AMPLITUDE',
      source: 'rhythm-detector-validation',
      isFingerDetected: false,
      confidence: 0.6,
      signalValue: amplitude,
      details: {
        threshold: amplitudeThreshold,
        min, max
      }
    });
    
    return false;
  }
  
  // Si hemos perdido los patrones rítmicos por completo
  const now = Date.now();
  const lastPatternTime = lastPeakTimes.length > 0 ? 
    lastPeakTimes[lastPeakTimes.length - 1] : 0;
  
  // Ajustar timeout según calibración
  const patternTimeoutMs = 5000 + calibrationParams.falseNegativeReduction * 2000;
  
  // Si ha pasado mucho tiempo desde el último patrón detectado
  if (now - lastPatternTime > patternTimeoutMs) {
    // Registrar evento diagnóstico - patrón expirado
    fingerDiagnostics.logEvent({
      eventType: 'PATTERN_TIMEOUT',
      source: 'rhythm-detector-validation',
      isFingerDetected: false,
      confidence: 0.7,
      details: {
        timeSinceLastPattern: now - lastPatternTime,
        timeoutThreshold: patternTimeoutMs
      }
    });
    
    return false;
  }
  
  return true;
}

/**
 * Reinicia el detector de dedo
 * Ahora también reinicia el detector unificado y los diagnósticos
 */
export function resetFingerDetector(): void {
  rhythmDetectionHistory = [];
  confirmedFingerPresence = false;
  lastPeakTimes = [];
  consistentPatternsCount = 0;
  
  // Reiniciar también el detector unificado
  unifiedFingerDetector.reset();
  
  // Registrar evento de diagnóstico
  fingerDiagnostics.logEvent({
    eventType: 'DETECTOR_RESET',
    source: 'rhythm-detector',
    isFingerDetected: false,
    confidence: 0.9
  });
  
  console.log("FingerDetector: Sistema de detección reiniciado completamente");
}
