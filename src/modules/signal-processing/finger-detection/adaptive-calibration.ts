
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para detección de dedos
 * 
 * IMPORTANTE: Este sistema ajusta automáticamente los parámetros de detección
 * basado en condiciones ambientales y de calidad de señal.
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { AdaptiveCalibrationParams, EnvironmentalState } from './finger-detection-types';

// Parámetros por defecto de calibración
const DEFAULT_CALIBRATION: AdaptiveCalibrationParams = {
  sensitivityLevel: 0.6,             // Nivel medio de sensibilidad
  rhythmDetectionThreshold: 0.2,     // Umbral para detección de ritmos
  amplitudeThreshold: 0.05,          // Umbral de amplitud mínima
  falsePositiveReduction: 0.3,       // Factor reducción falsos positivos
  falseNegativeReduction: 0.7,       // Factor reducción falsos negativos
  environmentQualityFactor: 1.0      // Factor de calidad ambiental
};

/**
 * Clase para calibración adaptativa
 */
class AdaptiveCalibration {
  private calibrationParams: AdaptiveCalibrationParams;
  private environmentalState: EnvironmentalState;
  private lastUpdateTime: number;
  private adaptationRate: number;
  
  constructor() {
    this.calibrationParams = { ...DEFAULT_CALIBRATION };
    this.environmentalState = {};
    this.lastUpdateTime = Date.now();
    this.adaptationRate = 0.1; // Tasa de adaptación por defecto
  }
  
  /**
   * Obtiene los parámetros actuales de calibración
   */
  public getCalibrationParameters(): AdaptiveCalibrationParams {
    return { ...this.calibrationParams };
  }
  
  /**
   * Actualiza el estado ambiental para la calibración
   */
  public updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
    this.environmentalState = {
      ...this.environmentalState,
      ...newState
    };
    
    // Ajustar parámetros basados en el nuevo estado ambiental
    this.adaptParameters();
  }
  
  /**
   * Actualiza manualmente un parámetro específico
   */
  public setParameter(param: keyof AdaptiveCalibrationParams, value: number): void {
    if (param in this.calibrationParams) {
      // Validar rango (todos los parámetros deben estar entre 0 y 1)
      const validValue = Math.max(0, Math.min(1, value));
      
      // Actualizar parámetro
      this.calibrationParams[param] = validValue;
      
      logError(
        `AdaptiveCalibration: Parámetro ${param} actualizado manualmente a ${validValue}`,
        ErrorLevel.INFO,
        "FingerDetection"
      );
    }
  }
  
  /**
   * Adapta los parámetros basados en el estado ambiental
   */
  private adaptParameters(): void {
    const now = Date.now();
    
    // Limitar frecuencia de adaptación (máx. cada 2 segundos)
    if (now - this.lastUpdateTime < 2000) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    // Ajustar sensibilidad basado en SNR si está disponible
    if (this.environmentalState.signalToNoiseRatio !== undefined) {
      const snr = this.environmentalState.signalToNoiseRatio;
      
      // Ajustar sensibilidad inversamente proporcional al SNR
      // (señal más limpia = menor sensibilidad para evitar falsos positivos)
      this.calibrationParams.sensitivityLevel = this.applyAdaptiveChange(
        this.calibrationParams.sensitivityLevel,
        snr > 0.7 ? 0.5 : snr > 0.4 ? 0.6 : 0.7,
        this.adaptationRate
      );
      
      // Ajustar umbral de detección de ritmo
      this.calibrationParams.rhythmDetectionThreshold = this.applyAdaptiveChange(
        this.calibrationParams.rhythmDetectionThreshold,
        snr > 0.7 ? 0.15 : snr > 0.4 ? 0.2 : 0.25,
        this.adaptationRate
      );
    }
    
    // Ajustar basado en brillo si está disponible
    if (this.environmentalState.brightness !== undefined) {
      const normalizedBrightness = Math.min(1, this.environmentalState.brightness / 255);
      
      // Ajustar factor de calidad ambiental
      this.calibrationParams.environmentQualityFactor = this.applyAdaptiveChange(
        this.calibrationParams.environmentQualityFactor,
        normalizedBrightness > 0.4 ? 1.0 : normalizedBrightness > 0.2 ? 0.8 : 0.6,
        this.adaptationRate
      );
      
      // Brillo muy bajo -> aumentar umbral de amplitud para evitar falsos positivos
      if (normalizedBrightness < 0.2) {
        this.calibrationParams.amplitudeThreshold = this.applyAdaptiveChange(
          this.calibrationParams.amplitudeThreshold,
          0.08, // Umbral más alto
          this.adaptationRate
        );
      }
    }
    
    // Ajustar basado en movimiento si está disponible
    if (this.environmentalState.movement !== undefined) {
      const movement = this.environmentalState.movement;
      
      // Mayor movimiento -> más reducción de falsos positivos
      this.calibrationParams.falsePositiveReduction = this.applyAdaptiveChange(
        this.calibrationParams.falsePositiveReduction,
        movement > 0.7 ? 0.5 : movement > 0.3 ? 0.3 : 0.2,
        this.adaptationRate
      );
    }
    
    // Loggear cambios en depuración
    logError(
      `AdaptiveCalibration: Parámetros adaptados - Sensibilidad: ${this.calibrationParams.sensitivityLevel.toFixed(2)}, ` +
      `Umbral Ritmo: ${this.calibrationParams.rhythmDetectionThreshold.toFixed(2)}, ` +
      `Factor Ambiente: ${this.calibrationParams.environmentQualityFactor.toFixed(2)}`,
      ErrorLevel.DEBUG,
      "FingerDetection"
    );
  }
  
  /**
   * Aplica un cambio adaptativo con suavizado
   */
  private applyAdaptiveChange(currentValue: number, targetValue: number, rate: number): number {
    return currentValue * (1 - rate) + targetValue * rate;
  }
  
  /**
   * Establece la tasa de adaptación
   */
  public setAdaptationRate(rate: number): void {
    this.adaptationRate = Math.max(0.01, Math.min(0.5, rate));
  }
  
  /**
   * Reinicia la calibración a valores por defecto
   */
  public reset(): void {
    this.calibrationParams = { ...DEFAULT_CALIBRATION };
    this.environmentalState = {};
    this.lastUpdateTime = Date.now();
    this.adaptationRate = 0.1;
    
    logError(
      "AdaptiveCalibration: Sistema de calibración reiniciado a valores por defecto",
      ErrorLevel.INFO,
      "FingerDetection"
    );
  }
}

// Instancia singleton para el sistema de calibración
export const adaptiveCalibration = new AdaptiveCalibration();

/**
 * Obtiene los parámetros actuales de calibración
 */
export function getCalibrationParameters(): AdaptiveCalibrationParams {
  return adaptiveCalibration.getCalibrationParameters();
}

/**
 * Actualiza el estado ambiental
 */
export function updateEnvironmentalState(state: Partial<EnvironmentalState>): void {
  adaptiveCalibration.updateEnvironmentalState(state);
}

/**
 * Reinicia el sistema de calibración
 */
export function resetCalibration(): void {
  adaptiveCalibration.reset();
}
