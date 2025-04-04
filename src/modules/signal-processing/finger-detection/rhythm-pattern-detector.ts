
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector de presencia de dedos basado en patrones rítmicos
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { DiagnosticEventType } from './finger-detection-types';
import { reportDiagnosticEvent, reportFingerDetection } from './finger-diagnostics';
import { getCalibrationParameters } from './adaptive-calibration';
import { updateDetectionSource } from './unified-finger-detector';

// Estado del detector de ritmo
interface RhythmDetectorState {
  isPatternDetected: boolean;
  lastPatternTime: number;
  patternConfidence: number;
  valueBuffer: number[];
  lastCrossingPoints: number[];
  crossingIntervals: number[];
  consistentPatterns: number;
  maxConsistentPatterns: number;
  threshold: number;
}

// Estado global
const state: RhythmDetectorState = {
  isPatternDetected: false,
  lastPatternTime: 0,
  patternConfidence: 0,
  valueBuffer: [],
  lastCrossingPoints: [],
  crossingIntervals: [],
  consistentPatterns: 0,
  maxConsistentPatterns: 0,
  threshold: 0.6
};

// Configuración
const CONFIG = {
  BUFFER_SIZE: 100,
  MIN_CONSISTENT_PATTERNS: 2,
  MAX_PATTERN_AGE_MS: 3000,
  ZERO_CROSSING_FILTER: 0.5
};

/**
 * Analiza la señal para detectar patrones rítmicos
 * Esta implementación busca patrones consistentes en los cruces por cero
 */
export function analyzeSignalForRhythmicPattern(value: number, timestamp?: number): boolean {
  const now = timestamp || Date.now();
  
  // Actualizar buffer de valores
  state.valueBuffer.push(value);
  if (state.valueBuffer.length > CONFIG.BUFFER_SIZE) {
    state.valueBuffer.shift();
  }
  
  // No podemos detectar patrones con pocos datos
  if (state.valueBuffer.length < 30) {
    return false;
  }
  
  // Detectar cruces por cero (con filtro para evitar ruido)
  detectCrossings();
  
  // Analizar intervalos entre cruces
  const hasConsistentPattern = analyzePatternConsistency();
  
  // Obtener umbral de los parámetros de calibración
  const calibParams = getCalibrationParameters();
  const patternThreshold = calibParams.rhythmDetectionThreshold || 0.6;
  state.threshold = patternThreshold;
  
  // Determinar si hay detección de dedo por patrón
  let newPatternState = state.isPatternDetected;
  
  // Verificar si el patrón es consistente y si no ha expirado
  const patternAge = now - state.lastPatternTime;
  const isPatternExpired = patternAge > CONFIG.MAX_PATTERN_AGE_MS;
  
  if (hasConsistentPattern && state.patternConfidence >= patternThreshold) {
    // Patrón detectado
    if (!state.isPatternDetected) {
      newPatternState = true;
      state.lastPatternTime = now;
      
      reportDiagnosticEvent(
        DiagnosticEventType.PATTERN_DETECTED,
        'rhythm-pattern',
        true,
        state.patternConfidence,
        {
          consistentPatterns: state.consistentPatterns,
          intervals: state.crossingIntervals.slice(-5)
        }
      );
    }
  } else if (isPatternExpired) {
    // Patrón perdido por expiración
    if (state.isPatternDetected) {
      newPatternState = false;
      
      reportDiagnosticEvent(
        DiagnosticEventType.PATTERN_TIMEOUT,
        'rhythm-pattern',
        false,
        0,
        {
          patternAge,
          timeout: CONFIG.MAX_PATTERN_AGE_MS
        }
      );
    }
  }
  
  // Si cambió el estado, actualizar
  if (newPatternState !== state.isPatternDetected) {
    state.isPatternDetected = newPatternState;
    
    // Reportar al detector unificado
    updateDetectionSource('rhythm', state.isPatternDetected, state.patternConfidence);
    
    // Reportar la detección
    reportFingerDetection(
      state.isPatternDetected,
      state.patternConfidence,
      'rhythm',
      {
        consistentPatterns: state.consistentPatterns,
        threshold: patternThreshold
      }
    );
  }
  
  return state.isPatternDetected;
}

/**
 * Detecta cruces por cero en la señal
 */
function detectCrossings(): void {
  const buffer = state.valueBuffer;
  const threshold = CONFIG.ZERO_CROSSING_FILTER;
  
  // Buscar cruces por cero en el búfer, ignorando cruces menores que el filtro
  for (let i = 1; i < buffer.length; i++) {
    const prev = buffer[i - 1];
    const curr = buffer[i];
    
    // Detectar cruce positivo
    if (prev <= 0 && curr > 0 && Math.abs(curr) > threshold) {
      // Registrar tiempo en índice dentro del buffer (más simple)
      state.lastCrossingPoints.push(i);
      
      // Si tenemos suficientes cruces, calcular intervalo
      if (state.lastCrossingPoints.length >= 2) {
        const prevCross = state.lastCrossingPoints[state.lastCrossingPoints.length - 2];
        const currCross = state.lastCrossingPoints[state.lastCrossingPoints.length - 1];
        const interval = currCross - prevCross;
        
        if (interval > 0) {
          state.crossingIntervals.push(interval);
        }
      }
      
      // Limitar tamaño
      if (state.lastCrossingPoints.length > 10) {
        state.lastCrossingPoints.shift();
      }
      if (state.crossingIntervals.length > 15) {
        state.crossingIntervals.shift();
      }
    }
  }
}

/**
 * Analiza la consistencia de los patrones de intervalo
 */
function analyzePatternConsistency(): boolean {
  const intervals = state.crossingIntervals;
  
  // No podemos analizar con menos de 3 intervalos
  if (intervals.length < 3) {
    state.consistentPatterns = 0;
    state.patternConfidence = 0;
    return false;
  }
  
  // Calcular desviación estándar de intervalos
  const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  // Calcular coeficiente de variación (menor = más consistente)
  const cv = stdDev / avg;
  
  // Un CV bajo indica consistencia rítmica (característica de PPG)
  const isConsistent = cv < 0.3; // 30% de variación como máximo
  
  // Actualizar contadores de consistencia
  if (isConsistent) {
    state.consistentPatterns = Math.min(10, state.consistentPatterns + 1);
    state.lastPatternTime = Date.now();
  } else {
    state.consistentPatterns = Math.max(0, state.consistentPatterns - 1);
  }
  
  // Actualizar máximo para estadísticas
  if (state.consistentPatterns > state.maxConsistentPatterns) {
    state.maxConsistentPatterns = state.consistentPatterns;
  }
  
  // Calcular confianza en función de la consistencia y baja variación
  state.patternConfidence = Math.min(1, 
    (state.consistentPatterns / CONFIG.MIN_CONSISTENT_PATTERNS) * 
    (1 - Math.min(1, cv))
  );
  
  return state.consistentPatterns >= CONFIG.MIN_CONSISTENT_PATTERNS;
}

/**
 * Reinicia el detector de patrones rítmicos
 */
export function resetRhythmDetector(): void {
  // Reiniciar estado
  state.isPatternDetected = false;
  state.lastPatternTime = 0;
  state.patternConfidence = 0;
  state.valueBuffer = [];
  state.lastCrossingPoints = [];
  state.crossingIntervals = [];
  state.consistentPatterns = 0;
  state.maxConsistentPatterns = 0;
  
  // Actualizar detector unificado
  updateDetectionSource('rhythm', false, 0);
  
  logError(
    "RhythmDetector: Detector de ritmo reiniciado",
    ErrorLevel.INFO,
    "RhythmDetector"
  );
}

/**
 * Comprueba si un dedo está actualmente detectado por su patrón rítmico
 */
export function isFingerDetectedByRhythm(): boolean {
  return state.isPatternDetected;
}

/**
 * Obtiene el conteo de patrones consistentes
 */
export function getConsistentPatternsCount(): number {
  return state.consistentPatterns;
}
