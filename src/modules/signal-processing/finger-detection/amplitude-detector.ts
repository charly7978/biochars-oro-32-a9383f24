
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector de dedos basado en amplitud de señal
 * 
 * IMPORTANTE: Este módulo detecta la presencia de dedos basado en la amplitud
 * y calidad de la señal PPG. Se integra con el detector unificado.
 */

import { reportDiagnosticEvent } from './finger-diagnostics';
import { getCalibrationParameters } from './adaptive-calibration';
import { updateDetectionSource } from './unified-finger-detector';
import { DiagnosticEventType } from './finger-detection-types';

// Contador de señales débiles consecutivas
let consecutiveWeakSignalsCount = 0;
let lastSignalQuality = 0;
let fingerDetectionConfirmed = false;

/**
 * Comprueba si la señal es demasiado débil, indicando posible ausencia de dedo
 */
export function checkSignalStrength(
  value: number,
  config?: {
    lowSignalThreshold?: number,
    maxWeakSignalCount?: number
  }
): {
  isWeakSignal: boolean,
  updatedWeakSignalsCount: number,
  quality: number
} {
  // Obtener calibración actual
  const calibrationParams = getCalibrationParameters();
  
  // Usar umbrales adaptivos (o valores por defecto si no se proporcionan)
  const finalConfig = {
    lowSignalThreshold: config?.lowSignalThreshold || calibrationParams.amplitudeThreshold,
    maxWeakSignalCount: config?.maxWeakSignalCount || 5
  };
  
  // Verificar si la señal es débil
  const isCurrentSignalWeak = Math.abs(value) < finalConfig.lowSignalThreshold;
  
  // Actualizar contador de señales débiles
  if (isCurrentSignalWeak) {
    consecutiveWeakSignalsCount++;
  } else {
    // Reducir el contador más gradualmente para evitar oscilaciones
    consecutiveWeakSignalsCount = Math.max(0, consecutiveWeakSignalsCount - 1);
  }
  
  // Determinar si la señal es demasiado débil
  const isWeakSignal = consecutiveWeakSignalsCount >= finalConfig.maxWeakSignalCount;
  
  // Calcular calidad de señal basada en amplitud
  const signalQuality = calculateSignalQuality(value, isWeakSignal);
  lastSignalQuality = signalQuality;
  
  // Si la señal es débil pero habíamos confirmado detección, ser más tolerante
  if (fingerDetectionConfirmed && isWeakSignal) {
    // Actualizar estado de detección en detector unificado con confianza reducida
    updateDetectionSource(
      'signal-quality-amplitude',
      consecutiveWeakSignalsCount < finalConfig.maxWeakSignalCount * 1.5,
      Math.max(0.1, 0.6 - (consecutiveWeakSignalsCount / (finalConfig.maxWeakSignalCount * 2)))
    );
    
    // Registrar evento si perdemos totalmente la detección
    if (consecutiveWeakSignalsCount >= finalConfig.maxWeakSignalCount * 1.5) {
      fingerDetectionConfirmed = false;
      
      reportDiagnosticEvent(
        DiagnosticEventType.FINGER_LOST,
        'signal-quality-amplitude',
        false,
        0.8,
        {
          weakSignalsCount: consecutiveWeakSignalsCount,
          threshold: finalConfig.maxWeakSignalCount,
          value: Math.abs(value),
          amplitudeThreshold: finalConfig.lowSignalThreshold
        }
      );
    }
    
    return {
      isWeakSignal: consecutiveWeakSignalsCount >= finalConfig.maxWeakSignalCount * 1.5,
      updatedWeakSignalsCount: consecutiveWeakSignalsCount,
      quality: signalQuality
    };
  }
  
  // Si la señal es fuerte consistentemente, confirmar detección
  if (!isWeakSignal && !fingerDetectionConfirmed && consecutiveWeakSignalsCount === 0) {
    fingerDetectionConfirmed = true;
    
    reportDiagnosticEvent(
      DiagnosticEventType.FINGER_DETECTED,
      'signal-quality-amplitude',
      true,
      0.7,
      {
        value: Math.abs(value),
        amplitudeThreshold: finalConfig.lowSignalThreshold,
        quality: signalQuality
      }
    );
  }
  
  // Actualizar estado de detección en detector unificado
  updateDetectionSource(
    'signal-quality-amplitude',
    !isWeakSignal,
    isWeakSignal ? 0.3 : 0.7
  );
  
  return {
    isWeakSignal,
    updatedWeakSignalsCount: consecutiveWeakSignalsCount,
    quality: signalQuality
  };
}

/**
 * Calcula la calidad de la señal basada en amplitud y otras métricas
 */
function calculateSignalQuality(value: number, isWeak: boolean): number {
  // Obtener calibración actual
  const calibrationParams = getCalibrationParameters();
  
  // Si la señal es débil, calidad baja
  if (isWeak) {
    return Math.max(10, Math.min(40, Math.abs(value) * 200));
  }
  
  // Calidad basada en amplitud de señal
  const baseQuality = Math.min(100, Math.max(30, Math.abs(value) * 300));
  
  // Ajustar calidad según factores ambientales
  return baseQuality * (calibrationParams.environmentQualityFactor || 1.0);
}

/**
 * Determina si se debe procesar una medición basado en fuerza de señal
 */
export function shouldProcessMeasurement(value: number): boolean {
  // Obtener calibración actual
  const calibrationParams = getCalibrationParameters();
  
  // Si la detección está confirmada, ser más permisivo
  if (fingerDetectionConfirmed) {
    return Math.abs(value) >= (calibrationParams.amplitudeThreshold || 0.25) * 0.8;
  }
  
  // Umbral más alto para evitar procesar ruido
  return Math.abs(value) >= (calibrationParams.amplitudeThreshold || 0.25) * 1.2;
}

/**
 * Reinicia el estado de detección basada en amplitud
 */
export function resetAmplitudeDetector(): void {
  consecutiveWeakSignalsCount = 0;
  lastSignalQuality = 0;
  fingerDetectionConfirmed = false;
  
  // Actualizar detector unificado
  updateDetectionSource('signal-quality-amplitude', false, 0);
  
  // Reportar evento
  reportDiagnosticEvent(
    DiagnosticEventType.DETECTOR_RESET,
    'signal-quality-amplitude',
    false,
    1.0,
    { source: 'amplitude-detector-reset' }
  );
}

/**
 * Obtiene la última calidad de señal calculada
 */
export function getLastSignalQuality(): number {
  return lastSignalQuality;
}

/**
 * Verifica si hay un dedo detectado por amplitud
 */
export function isFingerDetectedByAmplitude(): boolean {
  return fingerDetectionConfirmed;
}
