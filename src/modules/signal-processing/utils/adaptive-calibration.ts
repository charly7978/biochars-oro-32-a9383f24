
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para la detección de dedos
 * Ajusta parámetros basados en condiciones ambientales y calidad de la señal
 */

// Parámetros de calibración
export interface CalibrationParameters {
  // Nivel general de sensibilidad (0-1)
  sensitivityLevel: number;
  
  // Umbral para detección de patrones rítmicos
  rhythmDetectionThreshold: number;
  
  // Factor de reducción de falsos negativos (0-1)
  falseNegativeReduction: number;
  
  // Factor de reducción de falsos positivos (0-1)
  falsePositiveReduction: number;
  
  // Tiempo mínimo para confirmar detección (ms)
  minDetectionConfirmationTime: number;
  
  // Peso relativo de cada fuente de detección
  sourceWeights: Record<string, number>;
}

// Estado ambiental para adaptación
export interface EnvironmentalState {
  // Nivel de iluminación ambiental (0-1)
  ambientLight?: number;
  
  // Estabilidad del dispositivo (0-1, 0=inestable, 1=estable)
  deviceStability?: number;
  
  // Relación señal/ruido (0-1)
  signalToNoiseRatio?: number;
  
  // Tipo de piel o transparencia (0-1)
  skinTransparency?: number;
}

// Valores por defecto
const DEFAULT_CALIBRATION: CalibrationParameters = {
  sensitivityLevel: 0.7,
  rhythmDetectionThreshold: 0.2,
  falseNegativeReduction: 0.5,
  falsePositiveReduction: 0.7,
  minDetectionConfirmationTime: 3000,
  sourceWeights: {
    'rhythm-pattern': 1.0,
    'signal-quality-pattern': 0.8,
    'signal-quality-amplitude': 0.6,
    'signal-quality-state': 0.7,
    'ppg-extractor': 0.9,
    'camera-analysis': 0.6,
    'weak-signal-result': 0.5,
    'extraction': 0.85,
    'signalProcessor': 0.9,
    'manual-override': 1.0
  }
};

// Estado actual
let currentCalibration: CalibrationParameters = {...DEFAULT_CALIBRATION};
let currentEnvironment: EnvironmentalState = {};
let isActive: boolean = false;
let adaptInterval: number | null = null;

// Historial para adaptación
let calibrationHistory: Array<{
  timestamp: number;
  params: CalibrationParameters;
  environment: EnvironmentalState;
}> = [];

/**
 * Sistema de calibración adaptativa
 */
class AdaptiveCalibrationSystem {
  private debug: boolean = false;
  
  /**
   * Inicia el sistema de calibración adaptativa
   */
  public start(): void {
    if (isActive) return;
    
    isActive = true;
    console.log("AdaptiveCalibration: Sistema de calibración adaptativa iniciado");
    
    // Iniciar intervalo de adaptación
    adaptInterval = window.setInterval(() => {
      this.adaptToCurrentEnvironment();
    }, 5000); // Adaptar cada 5 segundos
  }
  
  /**
   * Detiene el sistema de calibración adaptativa
   */
  public stop(): void {
    if (!isActive) return;
    
    isActive = false;
    if (adaptInterval !== null) {
      clearInterval(adaptInterval);
      adaptInterval = null;
    }
    
    console.log("AdaptiveCalibration: Sistema de calibración adaptativa detenido");
  }
  
  /**
   * Reinicia el sistema de calibración adaptativa
   */
  public reset(): void {
    this.stop();
    currentCalibration = {...DEFAULT_CALIBRATION};
    currentEnvironment = {};
    calibrationHistory = [];
    
    console.log("AdaptiveCalibration: Sistema de calibración adaptativa reiniciado");
  }
  
  /**
   * Habilita o deshabilita logs de depuración
   */
  public setDebug(enable: boolean): void {
    this.debug = enable;
  }
  
  /**
   * Actualiza el estado ambiental actual
   */
  public updateEnvironmentalState(state: Partial<EnvironmentalState>): void {
    currentEnvironment = {
      ...currentEnvironment,
      ...state
    };
    
    if (this.debug) {
      console.log("AdaptiveCalibration: Estado ambiental actualizado", currentEnvironment);
    }
    
    // Aplicar adaptación inmediata si es activo
    if (isActive) {
      this.adaptToCurrentEnvironment();
    }
  }
  
  /**
   * Adapta los parámetros al entorno actual
   */
  private adaptToCurrentEnvironment(): void {
    if (!isActive) return;
    
    // Guardar configuración anterior para comparación
    const previousCalibration = {...currentCalibration};
    
    // 1. Adaptar sensibilidad general basada en SNR
    if (currentEnvironment.signalToNoiseRatio !== undefined) {
      const snr = currentEnvironment.signalToNoiseRatio;
      
      // Mayor SNR permite mayor sensibilidad
      if (snr > 0.8) {
        currentCalibration.sensitivityLevel = Math.min(0.9, currentCalibration.sensitivityLevel + 0.05);
      } else if (snr < 0.3) {
        currentCalibration.sensitivityLevel = Math.max(0.4, currentCalibration.sensitivityLevel - 0.05);
      }
    }
    
    // 2. Adaptar umbral de detección de ritmo basado en iluminación
    if (currentEnvironment.ambientLight !== undefined) {
      const light = currentEnvironment.ambientLight;
      
      // Ajustar umbral - luz alta requiere umbral más estricto
      if (light > 0.8) {
        currentCalibration.rhythmDetectionThreshold = Math.min(0.35, currentCalibration.rhythmDetectionThreshold + 0.02);
      } else if (light < 0.3) {
        currentCalibration.rhythmDetectionThreshold = Math.max(0.15, currentCalibration.rhythmDetectionThreshold - 0.02);
      }
    }
    
    // 3. Adaptar reducción de falsos negativos/positivos basado en estabilidad
    if (currentEnvironment.deviceStability !== undefined) {
      const stability = currentEnvironment.deviceStability;
      
      // Ajustar factores de reducción
      if (stability > 0.8) {
        // Dispositivo estable - podemos ser más estrictos
        currentCalibration.falsePositiveReduction = Math.min(0.9, currentCalibration.falsePositiveReduction + 0.05);
        currentCalibration.falseNegativeReduction = Math.min(0.8, currentCalibration.falseNegativeReduction + 0.05);
      } else if (stability < 0.3) {
        // Dispositivo inestable - ser más permisivos
        currentCalibration.falsePositiveReduction = Math.max(0.5, currentCalibration.falsePositiveReduction - 0.05);
        currentCalibration.falseNegativeReduction = Math.max(0.3, currentCalibration.falseNegativeReduction - 0.05);
      }
    }
    
    // 4. Adaptar tiempo de confirmación basado en tipo de piel
    if (currentEnvironment.skinTransparency !== undefined) {
      const transparency = currentEnvironment.skinTransparency;
      
      // Ajustar tiempo mínimo de confirmación
      if (transparency > 0.8) {
        // Piel transparente - confirmación rápida
        currentCalibration.minDetectionConfirmationTime = 2500;
      } else if (transparency < 0.3) {
        // Piel menos transparente - necesita más tiempo
        currentCalibration.minDetectionConfirmationTime = 4000;
      } else {
        // Valor intermedio
        currentCalibration.minDetectionConfirmationTime = 3000;
      }
    }
    
    // 5. Ajustar pesos de fuentes basados en ambiente general
    // Por simplicidad, usamos SNR como indicador general de calidad
    if (currentEnvironment.signalToNoiseRatio !== undefined) {
      const snr = currentEnvironment.signalToNoiseRatio;
      
      // Dar más peso a fuentes de calidad en SNR alto
      if (snr > 0.7) {
        currentCalibration.sourceWeights['signal-quality-pattern'] = 1.0;
        currentCalibration.sourceWeights['rhythm-pattern'] = 1.0;
      } else if (snr < 0.3) {
        // En SNR bajo, dar más peso a fuentes robustas
        currentCalibration.sourceWeights['signal-quality-pattern'] = 0.6;
        currentCalibration.sourceWeights['camera-analysis'] = 0.8;
      }
    }
    
    // 6. Guardar historial para análisis
    calibrationHistory.push({
      timestamp: Date.now(),
      params: {...currentCalibration},
      environment: {...currentEnvironment}
    });
    
    // Limitar historial
    if (calibrationHistory.length > 50) {
      calibrationHistory.shift();
    }
    
    // Logging de cambios significativos
    if (this.debug && this.hasSignificantChanges(previousCalibration, currentCalibration)) {
      console.log("AdaptiveCalibration: Parámetros adaptados al entorno actual", {
        environment: currentEnvironment,
        calibration: currentCalibration
      });
    }
  }
  
  /**
   * Verifica si hay cambios significativos entre calibraciones
   */
  private hasSignificantChanges(prev: CalibrationParameters, current: CalibrationParameters): boolean {
    return (
      Math.abs(prev.sensitivityLevel - current.sensitivityLevel) > 0.05 ||
      Math.abs(prev.rhythmDetectionThreshold - current.rhythmDetectionThreshold) > 0.05 ||
      Math.abs(prev.falseNegativeReduction - current.falseNegativeReduction) > 0.05 ||
      Math.abs(prev.falsePositiveReduction - current.falsePositiveReduction) > 0.05 ||
      Math.abs(prev.minDetectionConfirmationTime - current.minDetectionConfirmationTime) > 200
    );
  }
  
  /**
   * Obtiene el historial de calibración
   */
  public getCalibrationHistory(): typeof calibrationHistory {
    return [...calibrationHistory];
  }
}

// Instancia única
export const adaptiveCalibration = new AdaptiveCalibrationSystem();

/**
 * Obtiene los parámetros de calibración actuales
 */
export function getCalibrationParameters(): CalibrationParameters {
  return {...currentCalibration};
}

/**
 * Establece parámetros de calibración
 */
export function setCalibrationParameters(params: Partial<CalibrationParameters>): void {
  currentCalibration = {
    ...currentCalibration,
    ...params
  };
}

/**
 * Actualiza el estado ambiental
 */
export function updateEnvironmentalState(state: Partial<EnvironmentalState>): void {
  adaptiveCalibration.updateEnvironmentalState(state);
}
