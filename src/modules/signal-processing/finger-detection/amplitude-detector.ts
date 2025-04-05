
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector de presencia de dedos basado en amplitud de señal
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { DiagnosticEventType } from './finger-detection-types';
import { reportDiagnosticEvent, reportFingerDetection } from './finger-diagnostics';
import { getCalibrationParameters } from './adaptive-calibration';
import { updateDetectionSource } from './unified-finger-detector';

// Estado del detector de amplitud
interface AmplitudeDetectorState {
  isFingerDetected: boolean;
  lastDetectionTime: number;
  lastConfidence: number;
  signalQuality: number;
  signalStrength: number;
  consecutiveStrong: number;
  consecutiveWeak: number;
  threshold: number;
  calibrationProgress: number;
}

// Estado global
let state: AmplitudeDetectorState = {
  isFingerDetected: false,
  lastDetectionTime: 0,
  lastConfidence: 0,
  signalQuality: 0,
  signalStrength: 0,
  consecutiveStrong: 0,
  consecutiveWeak: 0,
  threshold: 20,
  calibrationProgress: 0
};

/**
 * Verifica si la fuerza de señal indica presencia de un dedo
 */
export function checkSignalStrength(value: number, rawValue?: number): boolean {
  const now = Date.now();
  const calibrationParams = getCalibrationParameters();
  
  // Obtener umbral dinámico de los parámetros de calibración
  const dynamicThreshold = calibrationParams.amplitudeThreshold || 20;
  state.threshold = dynamicThreshold;
  
  // Implementar histéresis con contadores
  const REQUIRED_STRONG = 3;  // Frames consecutivos fuertes para detección
  const REQUIRED_WEAK = 5;    // Frames consecutivos débiles para pérdida
  
  // Actualizar fuerza de señal
  state.signalStrength = Math.abs(value);
  
  const isStrongSignal = state.signalStrength >= dynamicThreshold;
  
  if (isStrongSignal) {
    state.consecutiveStrong++;
    state.consecutiveWeak = 0;
  } else {
    state.consecutiveWeak++;
    state.consecutiveStrong = 0;
  }
  
  // Determinar estado de detección con histéresis
  let newDetectionState = state.isFingerDetected;
  
  if (!state.isFingerDetected && state.consecutiveStrong >= REQUIRED_STRONG) {
    // Transición a detectado
    newDetectionState = true;
    
    reportFingerDetection(
      true, 
      state.signalStrength / (dynamicThreshold * 2),
      'amplitude',
      {
        threshold: dynamicThreshold,
        signalStrength: state.signalStrength,
        consecutiveStrong: state.consecutiveStrong
      }
    );
  } else if (state.isFingerDetected && state.consecutiveWeak >= REQUIRED_WEAK) {
    // Transición a no detectado
    newDetectionState = false;
    
    reportFingerDetection(
      false,
      1 - (state.signalStrength / dynamicThreshold),
      'amplitude',
      {
        threshold: dynamicThreshold,
        signalStrength: state.signalStrength,
        consecutiveWeak: state.consecutiveWeak
      }
    );
  }
  
  // Si cambió el estado, actualizar
  if (newDetectionState !== state.isFingerDetected) {
    state.isFingerDetected = newDetectionState;
    state.lastDetectionTime = now;
    
    // Calcular confianza basada en la distancia al umbral
    let confidence = 0;
    if (state.isFingerDetected) {
      confidence = Math.min(1, state.signalStrength / (dynamicThreshold * 2));
    } else {
      confidence = Math.max(0, 1 - (state.signalStrength / dynamicThreshold));
    }
    
    // Limitar confianza a rango válido
    confidence = Math.max(0, Math.min(1, confidence));
    state.lastConfidence = confidence;
    
    // Reportar al detector unificado
    updateDetectionSource('amplitude', state.isFingerDetected, confidence);
  }
  
  return state.isFingerDetected;
}

/**
 * Decide si la señal es de calidad suficiente para procesamiento
 */
export function shouldProcessMeasurement(
  value: number, 
  quality: number,
  threshold?: number
): boolean {
  // Actualizar calidad de señal
  state.signalQuality = quality;
  
  // Usar umbral adaptativo o por defecto
  const actualThreshold = threshold || getCalibrationParameters()?.amplitudeThreshold || 20;
  
  // Verificar amplitud contra umbral
  const isValueAboveThreshold = Math.abs(value) >= actualThreshold;
  
  // Decisión basada en amplitud y calidad (calidad mínima 20%)
  const shouldProcess = isValueAboveThreshold && quality >= 20;
  
  // Reportar si la calidad es muy baja
  if (quality < 20 && state.isFingerDetected) {
    reportDiagnosticEvent(
      DiagnosticEventType.SIGNAL_QUALITY,
      'signal-quality-amplitude',
      state.isFingerDetected,
      quality / 100,
      {
        quality,
        message: "Calidad de señal demasiado baja para procesamiento",
        value
      }
    );
    
    // Actualizar fuente de calidad
    updateDetectionSource('signal-quality-amplitude', false, quality / 100);
  } else if (quality >= 20 && state.isFingerDetected) {
    // Actualizar fuente de calidad
    updateDetectionSource('signal-quality-amplitude', true, quality / 100);
  }
  
  return shouldProcess;
}

/**
 * Reinicia el detector de amplitud
 */
export function resetAmplitudeDetector(): void {
  state = {
    isFingerDetected: false,
    lastDetectionTime: 0,
    lastConfidence: 0,
    signalQuality: 0,
    signalStrength: 0,
    consecutiveStrong: 0,
    consecutiveWeak: 0,
    threshold: 20,
    calibrationProgress: 0
  };
  
  // Actualizar detector unificado
  updateDetectionSource('amplitude', false, 0);
  
  logError(
    "AmplitudeDetector: Detector por amplitud reiniciado",
    ErrorLevel.INFO,
    "AmplitudeDetector"
  );
}

/**
 * Obtiene la última calidad de señal registrada
 */
export function getLastSignalQuality(): number {
  return state.signalQuality;
}

/**
 * Detecta un dedo con señal débil
 */
export function getWeakSignalResult(value: number): { detected: boolean, confidence: number } {
  // Usar umbral mucho más bajo para señales débiles
  const weakThreshold = state.threshold * 0.3;
  
  const isDetected = Math.abs(value) >= weakThreshold;
  
  // Calcular confianza limitada
  const confidence = isDetected 
    ? Math.min(0.5, Math.abs(value) / state.threshold)
    : 0;
  
  // Reportar al detector unificado si ha cambiado
  if (isDetected !== state.isFingerDetected) {
    updateDetectionSource('weak-signal-result', isDetected, confidence);
    
    reportDiagnosticEvent(
      isDetected ? DiagnosticEventType.FINGER_DETECTED : DiagnosticEventType.FINGER_LOST,
      'weak-signal-result',
      isDetected,
      confidence,
      {
        threshold: weakThreshold,
        value: Math.abs(value)
      }
    );
  }
  
  return { detected: isDetected, confidence };
}

/**
 * Comprueba si un dedo está actualmente detectado por amplitud
 */
export function isFingerDetectedByAmplitude(): boolean {
  return state.isFingerDetected;
}
