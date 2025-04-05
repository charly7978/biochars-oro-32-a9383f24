
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Módulo para calibración adaptativa del detector de dedos
 * 
 * IMPORTANTE: Este sistema ajusta automáticamente umbrales de detección
 * basándose en las condiciones ambientales y el dispositivo utilizado.
 */

import { reportDiagnosticEvent } from './finger-diagnostics';
import { 
  EnvironmentalState, 
  AdaptiveCalibrationParams,
  DiagnosticEventType,
  DetectionSource
} from './finger-detection-types';

// Estado actual del entorno
let environmentalState: EnvironmentalState = {
  noise: 0.05,
  lighting: 0.5,
  motion: 0.1,
  device: {
    type: 'unknown',
    model: 'generic',
    capabilities: ['camera']
  },
  lastUpdate: Date.now()
};

// Parámetros de calibración
let calibrationParams: AdaptiveCalibrationParams = {
  baseThreshold: 0.08,  // Umbral base de detección - ajustado para mayor precisión
  noiseMultiplier: 1.5, // Factor de ajuste por ruido
  lightingCompensation: 0.8, // Factor de ajuste por iluminación
  motionCompensation: 1.2, // Factor de ajuste por movimiento
  adaptationRate: 0.05,  // Tasa de adaptación de parámetros
  stabilityFactor: 0.7   // Factor de estabilidad para evitar cambios bruscos
};

// Factor de calidad ambiental - afecta umbral final
let environmentQualityFactor = 1.0;

/**
 * Actualiza el estado ambiental
 */
export function updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
  // Actualizar solo los campos proporcionados
  if (newState.noise !== undefined) environmentalState.noise = newState.noise;
  if (newState.lighting !== undefined) environmentalState.lighting = newState.lighting;
  if (newState.motion !== undefined) environmentalState.motion = newState.motion;
  if (newState.brightness !== undefined) environmentalState.brightness = newState.brightness;
  if (newState.movement !== undefined) environmentalState.movement = newState.movement;
  
  // Actualizar información del dispositivo si se proporciona
  if (newState.device) {
    environmentalState.device = {
      ...environmentalState.device,
      ...newState.device
    };
  }
  
  // Registrar timestamp de actualización
  environmentalState.lastUpdate = Date.now();
  
  // Recalcular factor de calidad
  calculateEnvironmentQualityFactor();
  
  // Registrar evento de diagnóstico importante
  reportDiagnosticEvent(
    DiagnosticEventType.ENVIRONMENTAL_CHANGE,
    DetectionSource.COMBINED,
    true,
    0.9,
    { newState, qualityFactor: environmentQualityFactor }
  );
}

/**
 * Obtiene el estado ambiental actual
 */
export function getEnvironmentalState(): EnvironmentalState {
  return { ...environmentalState };
}

/**
 * Calcula el factor de calidad ambiental
 * que afecta los umbrales de detección
 */
function calculateEnvironmentQualityFactor(): void {
  // Partir de un valor base de calidad
  let qualityFactor = 1.0;
  
  // Ajustar por ruido ambiental (menos ruido = mejor calidad)
  qualityFactor *= (1 - environmentalState.noise * 0.5);
  
  // Ajustar por iluminación (valor óptimo alrededor de 0.5)
  const lightingDiff = Math.abs(environmentalState.lighting - 0.5);
  qualityFactor *= (1 - lightingDiff * 0.4);
  
  // Ajustar por movimiento (menos movimiento = mejor calidad)
  qualityFactor *= (1 - environmentalState.motion * 0.6);
  
  // Limitar valores para evitar extremos
  qualityFactor = Math.max(0.5, Math.min(1.2, qualityFactor));
  
  // Actualizar factor global
  environmentQualityFactor = qualityFactor;
  
  // Informar el cambio significativo
  if (Math.abs(environmentQualityFactor - qualityFactor) > 0.2) {
    reportDiagnosticEvent(
      DiagnosticEventType.THRESHOLD_ADAPTATION,
      DetectionSource.COMBINED,
      true,
      0.8,
      { 
        newQualityFactor: qualityFactor, 
        previousQualityFactor: environmentQualityFactor 
      }
    );
  }
}

/**
 * Calcula umbral adaptativo para detección de dedos
 * basado en condiciones ambientales actuales
 */
export function calculateAdaptiveThreshold(): number {
  // Umbral base
  let threshold = calibrationParams.baseThreshold;
  
  // Ajustar por ruido
  threshold += environmentalState.noise * calibrationParams.noiseMultiplier;
  
  // Ajustar por iluminación (más luz requiere umbral más alto)
  const lightingFactor = Math.abs(environmentalState.lighting - 0.5) + 0.5;
  threshold *= lightingFactor * calibrationParams.lightingCompensation;
  
  // Ajustar por movimiento (más movimiento requiere umbral más alto)
  if (environmentalState.motion > 0.3) {
    threshold *= (1 + (environmentalState.motion * calibrationParams.motionCompensation));
  }
  
  // Ajustar por tipo de dispositivo si es conocido
  if (environmentalState.device) {
    // Factor de dispositivo basado en sus capacidades
    if (environmentalState.device.type === 'mobile') {
      threshold *= 1.2; // Móviles suelen tener más ruido
    } else if (environmentalState.device.type === 'tablet') {
      threshold *= 1.1; // Tablets tienen nivel intermedio
    } else if (environmentalState.device.type === 'desktop') {
      threshold *= 0.9; // Desktops suelen tener mejor calidad
    }
  }
  
  // Limitar rango de umbral para evitar extremos
  threshold = Math.max(0.05, Math.min(0.25, threshold));
  
  return threshold;
}

/**
 * Obtiene los parámetros actuales de calibración
 * con valores derivados adicionales
 */
export function getCalibrationParameters(): AdaptiveCalibrationParams & { 
  amplitudeThreshold: number;
  environmentQualityFactor: number; 
} {
  return {
    ...calibrationParams,
    environmentalState: environmentalState,
    amplitudeThreshold: calculateAdaptiveThreshold(),
    environmentQualityFactor: environmentQualityFactor
  } as AdaptiveCalibrationParams & { 
    amplitudeThreshold: number;
    environmentQualityFactor: number; 
  };
}

/**
 * Adapta los umbrales de detección basados en la calidad de señal
 */
export function adaptDetectionThresholds(
  quality: number, 
  brightness?: number
): void {
  // Actualizar información ambiental
  if (brightness !== undefined) {
    updateEnvironmentalState({
      lighting: brightness / 255 // Normalizar a [0,1]
    });
  }
  
  // La calidad se usa como indicador inverso de ruido
  const noiseEstimate = Math.max(0, 1 - (quality / 100));
  updateEnvironmentalState({ noise: noiseEstimate });
  
  // Registrar evento de diagnóstico
  reportDiagnosticEvent(
    DiagnosticEventType.THRESHOLD_ADAPTATION,
    DetectionSource.COMBINED,
    true,
    0.7,
    { quality, brightness, noiseEstimate }
  );
}

/**
 * Reinicia la calibración a valores por defecto
 */
export function resetCalibration(): void {
  environmentalState = {
    noise: 0.05,
    lighting: 0.5,
    motion: 0.1,
    device: {
      type: 'unknown',
      model: 'generic',
      capabilities: ['camera']
    },
    lastUpdate: Date.now()
  };
  
  calibrationParams = {
    baseThreshold: 0.08,
    noiseMultiplier: 1.5,
    lightingCompensation: 0.8,
    motionCompensation: 1.2,
    adaptationRate: 0.05,
    stabilityFactor: 0.7
  };
  
  environmentQualityFactor = 1.0;
  
  // Registrar evento de diagnóstico
  reportDiagnosticEvent(
    DiagnosticEventType.CALIBRATION_UPDATE,
    DetectionSource.COMBINED,
    true,
    1.0,
    { action: "reset-calibration" }
  );
}
