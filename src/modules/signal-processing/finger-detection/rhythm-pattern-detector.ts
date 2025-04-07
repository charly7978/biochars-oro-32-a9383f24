
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector de patrones rítmicos
 * 
 * IMPORTANTE: Este módulo analiza patrones rítmicos (como los latidos cardíacos)
 * para determinar si hay un dedo presente. Se integra con el detector unificado.
 */

import { reportDiagnosticEvent } from './finger-diagnostics';
import { getCalibrationParameters } from './adaptive-calibration';
import { updateDetectionSource } from './unified-finger-detector';

// Historial para detección de patrones
let rhythmDetectionHistory: Array<{time: number, value: number}> = [];
let lastPeakTimes: number[] = [];
let consistentPatternsCount: number = 0;
let confirmedFingerPresence: boolean = false;

// Constantes para detección de patrones
const PATTERN_WINDOW_MS = 3000; // Ventana de 3 segundos
const MIN_PEAKS_FOR_PATTERN = 3; // Mínimo 3 picos para confirmar patrón
const MAX_CONSISTENT_PATTERNS = 10; // Máximo para evitar overflow

/**
 * Analiza el buffer de señal para detectar patrones rítmicos
 */
export function analyzeSignalForRhythmicPattern(
  signalValue: number,
  sensitivity: number = 0.6
): boolean {
  const now = Date.now();
  
  // Obtener parámetros adaptativos
  const calibrationParams = getCalibrationParameters();
  const thresholdValue = calibrationParams.rhythmDetectionThreshold;
  const requiredPatterns = Math.round(3 + (1 - calibrationParams.sensitivityLevel) * 2);
  
  // Ajustar sensibilidad
  const adjustedSensitivity = (sensitivity + calibrationParams.sensitivityLevel) / 2;
  
  // Si ya confirmamos presencia, verificar si sigue siendo válida
  if (confirmedFingerPresence) {
    const stillValid = validateOngoingPattern();
    
    if (!stillValid) {
      // Reducir contador de consistencia
      consistentPatternsCount = Math.max(0, consistentPatternsCount - 1);
      
      // Si perdimos demasiados patrones, quitar la confirmación
      if (consistentPatternsCount < 1) {
        confirmedFingerPresence = false;
        
        // Reportar evento
        reportDiagnosticEvent(
          'PATTERN_LOST',
          'rhythm-pattern',
          false,
          0.3,
          { consistentPatternsCount }
        );
        
        // Actualizar detector unificado
        updateDetectionSource('rhythm-pattern', false, 0.3);
      }
    }
  }
  
  // Agregar nuevo valor al historial
  rhythmDetectionHistory.push({
    time: now,
    value: signalValue
  });
  
  // Mantener solo valores recientes
  rhythmDetectionHistory = rhythmDetectionHistory
    .filter(point => now - point.time < PATTERN_WINDOW_MS * 2);
  
  // Detectar patrones rítmicos
  const { hasPattern, confidence } = detectRhythmicPattern(adjustedSensitivity, thresholdValue);
  
  // Si detectamos patrón, incrementar contador
  if (hasPattern) {
    consistentPatternsCount = Math.min(
      MAX_CONSISTENT_PATTERNS, 
      consistentPatternsCount + 1
    );
    
    // Reportar evento cada 2 detecciones
    if (consistentPatternsCount % 2 === 0) {
      reportDiagnosticEvent(
        'PATTERN_DETECTED',
        'rhythm-pattern',
        true,
        confidence,
        { patternCount: consistentPatternsCount }
      );
    }
    
    // Si tenemos suficientes patrones consecutivos, confirmar presencia
    if (!confirmedFingerPresence && consistentPatternsCount >= requiredPatterns) {
      confirmedFingerPresence = true;
      
      // Reportar transición
      reportDiagnosticEvent(
        'FINGER_DETECTED',
        'rhythm-pattern',
        true,
        0.8,
        { 
          consistentPatterns: consistentPatternsCount,
          requiredPatterns
        }
      );
    }
  } else {
    // Reducir contador si no hay patrón
    consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.5);
  }
  
  // Actualizar detector unificado
  const finalConfidence = Math.min(1.0, consistentPatternsCount / requiredPatterns);
  updateDetectionSource('rhythm-pattern', confirmedFingerPresence, finalConfidence);
  
  return confirmedFingerPresence;
}

/**
 * Detecta patrones rítmicos en la señal
 */
function detectRhythmicPattern(
  sensitivity: number,
  thresholdValue: number
): { hasPattern: boolean; confidence: number; peakCount?: number } {
  const now = Date.now();
  
  if (rhythmDetectionHistory.length < 15) {
    return { hasPattern: false, confidence: 0 };
  }
  
  // Ajustar umbral según sensibilidad
  const adjustedThreshold = thresholdValue * (1.2 - sensitivity);
  
  // Buscar picos en la señal reciente
  const recentSignals = rhythmDetectionHistory
    .filter(point => now - point.time < PATTERN_WINDOW_MS);
  
  if (recentSignals.length < 10) {
    return { hasPattern: false, confidence: 0 };
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
      confidence: peaks.length > 0 ? 0.1 * peaks.length : 0,
      peakCount: peaks.length
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
      confidence: 0.2,
      peakCount: peaks.length
    };
  }
  
  // Verificar consistencia en intervalos
  let consistentIntervals = 0;
  const maxDeviation = 200; // ms
  
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
  
  // Calcular confianza basada en consistencia
  const confidence = hasPattern ? 
    Math.min(0.9, 0.5 + (consistentIntervals / validIntervals.length) * 0.4) : 
    0.3;
  
  return {
    hasPattern,
    confidence,
    peakCount: peaks.length
  };
}

/**
 * Valida si el patrón rítmico continúa presente
 */
function validateOngoingPattern(): boolean {
  const now = Date.now();
  
  // Verificar que hayamos detectado picos recientemente
  if (lastPeakTimes.length === 0) {
    return false;
  }
  
  // Obtener calibración actual
  const calibrationParams = getCalibrationParameters();
  
  // Verificar tiempo desde último pico detectado
  const lastPatternTime = lastPeakTimes[lastPeakTimes.length - 1];
  const patternTimeoutMs = 5000 + calibrationParams.falseNegativeReduction * 2000;
  
  // Si ha pasado mucho tiempo desde el último patrón detectado
  if (now - lastPatternTime > patternTimeoutMs) {
    reportDiagnosticEvent(
      'PATTERN_TIMEOUT',
      'rhythm-pattern',
      false,
      0.7,
      {
        timeSinceLastPattern: now - lastPatternTime,
        timeoutThreshold: patternTimeoutMs
      }
    );
    
    return false;
  }
  
  return true;
}

/**
 * Reinicia el detector de patrones rítmicos
 */
export function resetRhythmDetector(): void {
  rhythmDetectionHistory = [];
  lastPeakTimes = [];
  consistentPatternsCount = 0;
  confirmedFingerPresence = false;
  
  // Actualizar detector unificado
  updateDetectionSource('rhythm-pattern', false, 0);
  
  // Reportar evento
  reportDiagnosticEvent(
    'DETECTOR_RESET',
    'rhythm-pattern',
    false,
    1.0,
    { source: 'rhythm-pattern-reset' }
  );
}

/**
 * Verifica si hay un dedo detectado por patrones rítmicos
 */
export function isFingerDetectedByRhythm(): boolean {
  return confirmedFingerPresence;
}

/**
 * Obtiene el contador de patrones consistentes
 */
export function getConsistentPatternsCount(): number {
  return consistentPatternsCount;
}
