
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para detección de dedos
 * Ajusta umbrales basados en condiciones ambientales y calidad de señal
 */

import { 
  AdaptiveCalibrationParams, 
  DetectionSource,
  DiagnosticEventType,
  EnvironmentalState 
} from './finger-detection-types';
import { reportDiagnosticEvent } from './finger-diagnostics';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Parámetros iniciales de calibración
const initialCalibrationParams: AdaptiveCalibrationParams = {
  baseThreshold: 0.25,
  noiseMultiplier: 1.2,
  lightingCompensation: 0.9,
  motionCompensation: 1.1,
  adaptationRate: 0.05,
  stabilityFactor: 0.8,
  amplitudeThreshold: 0.15,
  environmentQualityFactor: 1.0,
  environmentalState: {
    noise: 0,
    lighting: 50,
    motion: 0,
    brightness: 100,
    deviceInfo: {
      type: 'unknown',
      resolution: 'unknown',
      fps: 30,
      capabilities: [],
      quality: 100
    }
  }
};

// Estado actual de calibración
let currentCalibrationParams: AdaptiveCalibrationParams = { ...initialCalibrationParams };

// Historia de calidades recientes para estabilidad
const signalQualityHistory: number[] = [];
const MAX_QUALITY_HISTORY = 30;

/**
 * Actualiza el estado ambiental para ajustar calibración
 */
export function updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
  const prevState = { ...currentCalibrationParams.environmentalState };
  
  // Actualizar solo los valores proporcionados
  currentCalibrationParams.environmentalState = {
    ...currentCalibrationParams.environmentalState,
    ...newState
  };
  
  // Recalcular factor de calidad ambiental
  recalculateEnvironmentQualityFactor();
  
  // Registrar cambio significativo
  if (
    Math.abs((prevState.noise || 0) - (currentCalibrationParams.environmentalState.noise || 0)) > 5 ||
    Math.abs((prevState.lighting || 0) - (currentCalibrationParams.environmentalState.lighting || 0)) > 10 ||
    Math.abs((prevState.motion || 0) - (currentCalibrationParams.environmentalState.motion || 0)) > 5
  ) {
    logError(
      `Actualización ambiental: Ruido=${currentCalibrationParams.environmentalState.noise}, ` +
      `Iluminación=${currentCalibrationParams.environmentalState.lighting}, ` +
      `Movimiento=${currentCalibrationParams.environmentalState.motion}`,
      ErrorLevel.INFO,
      "AdaptiveCalibration"
    );
    
    reportDiagnosticEvent(
      DiagnosticEventType.CALIBRATION_CHANGED,
      DetectionSource.COMBINED,
      `Calibración adaptada a cambio ambiental`,
      1.0,
      { 
        prevState, 
        newState: currentCalibrationParams.environmentalState
      }
    );
  }
}

/**
 * Recalcula el factor de calidad ambiental
 */
function recalculateEnvironmentQualityFactor(): void {
  const env = currentCalibrationParams.environmentalState;
  let factor = 1.0;
  
  // Ajuste por ruido (si existe)
  if (typeof env.noise === 'number') {
    // Más ruido = menor calidad
    const noisePenalty = (env.noise / 100) * 0.3;
    factor -= noisePenalty;
  }
  
  // Ajuste por iluminación (si existe)
  if (typeof env.lighting === 'number') {
    // Iluminación óptima alrededor de 60-70
    const optimalLighting = 65;
    const lightingDiff = Math.abs(env.lighting - optimalLighting) / 100;
    const lightingPenalty = lightingDiff * 0.2;
    factor -= lightingPenalty;
  }
  
  // Ajuste por movimiento (si existe)
  if (typeof env.motion === 'number') {
    // Más movimiento = menor calidad
    const motionPenalty = (env.motion / 100) * 0.4;
    factor -= motionPenalty;
  }
  
  // Ajuste por brillo (si existe)
  if (typeof env.brightness === 'number') {
    // Brillo muy bajo o muy alto = menor calidad
    const optimalBrightness = 120;
    const brightnessDiff = Math.abs(env.brightness - optimalBrightness) / 200;
    const brightnessPenalty = brightnessDiff * 0.2;
    factor -= brightnessPenalty;
  }
  
  // Asegurar que el factor esté entre 0.5 y 1.2
  factor = Math.min(1.2, Math.max(0.5, factor));
  
  // Actualizar factor de calidad ambiental
  currentCalibrationParams.environmentQualityFactor = factor;
  
  // Actualizar umbral de amplitud basado en factor de calidad
  currentCalibrationParams.amplitudeThreshold = 
    initialCalibrationParams.amplitudeThreshold * (1 / factor);
}

/**
 * Obtiene el estado ambiental actual
 */
export function getEnvironmentalState(): EnvironmentalState {
  return { ...currentCalibrationParams.environmentalState };
}

/**
 * Obtiene los parámetros de calibración actuales
 */
export function getCalibrationParameters(): AdaptiveCalibrationParams {
  return { ...currentCalibrationParams };
}

/**
 * Adapta los umbrales de detección basado en la calidad de señal
 */
export function adaptDetectionThresholds(
  signalQuality: number,
  brightness?: number
): void {
  // Actualizar historial de calidad
  signalQualityHistory.push(signalQuality);
  if (signalQualityHistory.length > MAX_QUALITY_HISTORY) {
    signalQualityHistory.shift();
  }
  
  // Si se proporciona brillo, actualizar estado ambiental
  if (typeof brightness === 'number') {
    updateEnvironmentalState({ brightness });
  }
  
  // Calcular calidad media para estabilidad
  const avgQuality = signalQualityHistory.reduce((sum, q) => sum + q, 0) / 
                    Math.max(1, signalQualityHistory.length);
  
  // Adaptar umbral de amplitud basado en calidad
  const qualityFactor = Math.max(0.6, Math.min(1.5, 100 / Math.max(1, avgQuality)));
  const adaptedThreshold = initialCalibrationParams.baseThreshold * qualityFactor * 
                          currentCalibrationParams.environmentQualityFactor;
  
  // Aplicar adaptación gradual
  const oldThreshold = currentCalibrationParams.amplitudeThreshold;
  const newThreshold = (oldThreshold * (1 - currentCalibrationParams.adaptationRate)) + 
                       (adaptedThreshold * currentCalibrationParams.adaptationRate);
  
  // Actualizar umbral de amplitud
  currentCalibrationParams.amplitudeThreshold = newThreshold;
  
  // Registrar cambios significativos
  if (Math.abs(oldThreshold - newThreshold) > 0.05) {
    logError(
      `Umbral adaptado: ${oldThreshold.toFixed(3)} → ${newThreshold.toFixed(3)} ` +
      `(Q=${signalQuality.toFixed(0)}, Fact=${qualityFactor.toFixed(2)})`,
      ErrorLevel.INFO,
      "AdaptiveCalibration"
    );
    
    reportDiagnosticEvent(
      DiagnosticEventType.CALIBRATION_CHANGED,
      DetectionSource.COMBINED,
      `Calibración adaptada a calidad ${signalQuality.toFixed(0)}`,
      1.0,
      { 
        oldThreshold, 
        newThreshold,
        signalQuality,
        qualityFactor,
        environmentQualityFactor: currentCalibrationParams.environmentQualityFactor
      }
    );
  }
}

/**
 * Calcula un umbral adaptativo para la señal
 */
export function calculateAdaptiveThreshold(baseValue: number): number {
  return baseValue * currentCalibrationParams.environmentQualityFactor;
}

/**
 * Reinicia la calibración a valores por defecto
 */
export function resetCalibration(): void {
  currentCalibrationParams = { ...initialCalibrationParams };
  signalQualityHistory.length = 0;
  
  logError(
    "Calibración adaptativa reseteada a valores por defecto",
    ErrorLevel.INFO,
    "AdaptiveCalibration"
  );
  
  reportDiagnosticEvent(
    DiagnosticEventType.CALIBRATION_CHANGED,
    DetectionSource.COMBINED,
    "Calibración reseteada a valores por defecto",
    1.0,
    { resetParams: { ...currentCalibrationParams } }
  );
}

// Exportar objeto para compatibilidad
export const adaptiveCalibration = {
  updateEnvironmentalState,
  getEnvironmentalState,
  getCalibrationParameters,
  resetCalibration,
  calculateAdaptiveThreshold,
  adaptDetectionThresholds
};
