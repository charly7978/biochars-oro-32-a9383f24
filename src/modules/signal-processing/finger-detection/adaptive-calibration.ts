
/**
 * Módulo de calibración adaptativa para el detector de dedos
 * Ajusta los umbrales de detección según las condiciones ambientales
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import { reportDiagnosticEvent } from './finger-diagnostics';
import { DiagnosticEventType } from './finger-detection-types';
import type { AdaptiveCalibrationParams, EnvironmentalState } from './finger-detection-types';

/**
 * Estado interno de calibración
 */
interface CalibrationState {
  noise: number;
  lighting: number;
  motion: number;
  device?: {
    type: string;
    model?: string;
    capabilities?: string[];
  };
  lastUpdate: number;
}

// Estado inicial de calibración
const initialCalibrationState: CalibrationState = {
  noise: 0.05,
  lighting: 50,
  motion: 0.02,
  lastUpdate: Date.now()
};

// Parámetros iniciales
const initialParams: AdaptiveCalibrationParams = {
  baseThreshold: 0.32,
  noiseMultiplier: 1.5,
  lightingCompensation: 0.4,
  motionCompensation: 2.0,
  adaptationRate: 0.15,
  stabilityFactor: 0.75,
  [key: string]: number;
};

// Estado actual de calibración
let currentState: CalibrationState = { ...initialCalibrationState };

// Parámetros actuales
let currentParams: AdaptiveCalibrationParams = { ...initialParams };

// Historial de actualizaciones para análisis de tendencias
let updateHistory: Array<{
  timestamp: number;
  state: Partial<CalibrationState>;
  params: Partial<AdaptiveCalibrationParams>;
}> = [];

/**
 * Actualiza el estado ambiental
 */
export function updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
  const timestamp = Date.now();
  
  // Actualizar cada propiedad si está presente
  if (newState.noise !== undefined) {
    const oldNoise = currentState.noise;
    currentState.noise = newState.noise;
    
    // Adaptar umbral según cambio de ruido
    adaptToNoiseChange(oldNoise, newState.noise);
  }
  
  if (newState.lighting !== undefined) {
    const oldLighting = currentState.lighting;
    currentState.lighting = newState.lighting;
    
    // Adaptar umbral según cambio de iluminación
    adaptToLightingChange(oldLighting, newState.lighting);
  }
  
  if (newState.motion !== undefined) {
    const oldMotion = currentState.motion;
    currentState.motion = newState.motion;
    
    // Adaptar umbral según cambio de movimiento
    adaptToMotionChange(oldMotion, newState.motion);
  }
  
  if (newState.device) {
    currentState.device = { ...currentState.device, ...newState.device };
    
    // Adaptar según dispositivo
    if (currentState.device.type !== currentState.device.type) {
      adaptToDeviceChange();
    }
  }
  
  currentState.lastUpdate = timestamp;
  
  // Registrar para diagnóstico
  reportDiagnosticEvent({
    type: DiagnosticEventType.ENVIRONMENTAL_CHANGE,
    message: `Environmental state updated: noise=${currentState.noise}, lighting=${currentState.lighting}, motion=${currentState.motion}`,
  });
  
  // Guardar en historial
  updateHistory.push({
    timestamp,
    state: { ...newState },
    params: { ...currentParams }
  });
  
  // Limitar tamaño del historial
  if (updateHistory.length > 100) {
    updateHistory.shift();
  }
}

/**
 * Adapta umbrales según cambio de ruido
 */
function adaptToNoiseChange(oldNoise: number, newNoise: number): void {
  // Aumentar umbral si aumenta el ruido
  if (newNoise > oldNoise) {
    const increase = (newNoise - oldNoise) * currentParams.noiseMultiplier;
    updateParameter('baseThreshold', currentParams.baseThreshold + increase);
  } 
  // Reducir umbral si disminuye el ruido
  else if (newNoise < oldNoise) {
    const decrease = (oldNoise - newNoise) * currentParams.noiseMultiplier * 0.7;
    updateParameter('baseThreshold', Math.max(
      initialParams.baseThreshold * 0.5,
      currentParams.baseThreshold - decrease
    ));
  }
}

/**
 * Adapta umbrales según cambio de iluminación
 */
function adaptToLightingChange(oldLighting: number, newLighting: number): void {
  // Solo si el cambio es significativo
  if (Math.abs(newLighting - oldLighting) < 5) return;
  
  const lightingFactor = newLighting / 100; // Normalizar a 0-1
  
  // La iluminación óptima es de aproximadamente 50%
  const optimalLighting = 0.5;
  const lightingDeviation = Math.abs(lightingFactor - optimalLighting);
  
  // Umbral más alto para iluminaciones extremas
  const compensation = lightingDeviation * currentParams.lightingCompensation;
  updateParameter('lightingCompensation', compensation);
}

/**
 * Adapta umbrales según cambio de movimiento
 */
function adaptToMotionChange(oldMotion: number, newMotion: number): void {
  // Solo adaptar si hay un cambio significativo
  if (Math.abs(newMotion - oldMotion) < 0.01) return;
  
  // Aumentar umbral para movimiento alto
  const motionCompensation = newMotion * currentParams.motionCompensation;
  updateParameter('motionCompensation', motionCompensation);
  
  // Ajustar factor de estabilidad a la inversa del movimiento
  // Mayor movimiento = menor factor de estabilidad
  const stabilityFactor = Math.max(
    0.2,
    Math.min(0.9, 1 - (newMotion * 2))
  );
  updateParameter('stabilityFactor', stabilityFactor);
}

/**
 * Adapta según cambio de dispositivo
 */
function adaptToDeviceChange(): void {
  // Resetear a valores predeterminados y dejar que se adapte
  currentParams = { ...initialParams };
  
  reportDiagnosticEvent({
    type: DiagnosticEventType.CALIBRATION_UPDATE,
    message: `Calibration reset due to device change: ${JSON.stringify(currentState.device)}`,
  });
}

/**
 * Actualiza un parámetro con suavizado
 */
function updateParameter(paramName: keyof AdaptiveCalibrationParams, newValue: number): void {
  if (currentParams[paramName] === undefined) {
    logError(
      `Parameter ${paramName} does not exist in calibration parameters`,
      ErrorLevel.WARNING,
      "AdaptiveCalibration"
    );
    return;
  }
  
  const oldValue = currentParams[paramName];
  
  // Usar tasa de adaptación para suavizar cambios
  currentParams[paramName] = (1 - currentParams.adaptationRate) * oldValue + 
                            currentParams.adaptationRate * newValue;
  
  reportDiagnosticEvent({
    type: DiagnosticEventType.CALIBRATION_UPDATE,
    message: `Parameter ${paramName} updated: ${oldValue.toFixed(4)} -> ${currentParams[paramName].toFixed(4)}`
  });
}

/**
 * Obtiene los parámetros de calibración actuales
 */
export function getCalibrationParameters(): AdaptiveCalibrationParams & { environmentalState: EnvironmentalState } {
  return {
    ...currentParams,
    environmentalState: {
      noise: currentState.noise,
      lighting: currentState.lighting,
      motion: currentState.motion,
      device: currentState.device,
      lastUpdate: currentState.lastUpdate
    }
  };
}

/**
 * Reinicia la calibración
 */
export function resetCalibration(): void {
  currentState = { ...initialCalibrationState };
  currentParams = { ...initialParams };
  updateHistory = [];
  
  reportDiagnosticEvent({
    type: DiagnosticEventType.CALIBRATION_UPDATE,
    message: "Calibration parameters reset to default values"
  });
}

/**
 * Calcula umbral adaptativo basado en estado actual
 */
export function calculateAdaptiveThreshold(): number {
  return currentParams.baseThreshold * (1 + 
    (currentState.noise * currentParams.noiseMultiplier) + 
    (Math.abs(currentState.lighting - 50) / 50 * currentParams.lightingCompensation) +
    (currentState.motion * currentParams.motionCompensation)
  );
}

/**
 * Exportación del módulo
 */
export const adaptiveCalibration = {
  updateEnvironmentalState,
  getCalibrationParameters,
  resetCalibration,
  calculateAdaptiveThreshold
};
