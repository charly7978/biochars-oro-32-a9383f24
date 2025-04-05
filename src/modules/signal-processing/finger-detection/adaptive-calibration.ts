
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para detección de dedos
 */

import { logError, ErrorLevel } from '@/utils/debugUtils';
import {
  AdaptiveCalibrationParams,
  EnvironmentalState,
  DiagnosticEventType
} from './finger-detection-types';
import { reportDiagnosticEvent } from './finger-diagnostics';

/**
 * Clase para gestionar calibración adaptativa
 */
class AdaptiveCalibration {
  private params: AdaptiveCalibrationParams = {
    baseThreshold: 0.5,
    noiseMultiplier: 1.0,
    lightingCompensation: 1.0,
    motionCompensation: 1.0,
    adaptationRate: 0.1,
    stabilityFactor: 1.0,
    sensitivityLevel: 0.5,
    environmentQualityFactor: 0.8,
    amplitudeThreshold: 20,
    falsePositiveReduction: 1.2,
    falseNegativeReduction: 0.8,
    rhythmDetectionThreshold: 0.6,
    environmentalState: {
      noise: 0,
      lighting: 50,
      motion: 0,
      brightness: 128,
      movement: 0,
      signalToNoiseRatio: 0.8,
      device: {
        type: "unknown",
        camera: {
          quality: 1.0,
          frameRate: 30
        }
      },
      lastUpdate: Date.now()
    }
  };
  
  // Historial para adaptación gradual
  private historyValues: Record<string, number[]> = {};
  private readonly HISTORY_SIZE = 30;
  
  /**
   * Constructor con inicialización
   */
  constructor() {
    logError(
      "AdaptiveCalibration: Sistema de calibración adaptativa inicializado",
      ErrorLevel.INFO,
      "Calibration"
    );
    
    // Inicializar historiales para cada parámetro relevante
    Object.keys(this.params).forEach(key => {
      if (typeof this.params[key] === 'number') {
        this.historyValues[key] = Array(this.HISTORY_SIZE).fill(this.params[key] as number);
      }
    });
    
    // Reportar inicialización
    reportDiagnosticEvent(
      DiagnosticEventType.CALIBRATION_UPDATE, 
      'adaptive-calibration',
      false, 
      1.0, 
      { action: 'init', params: { ...this.params } }
    );
  }
  
  /**
   * Obtiene los parámetros actuales de calibración
   */
  public getParameters(): AdaptiveCalibrationParams {
    return { ...this.params };
  }
  
  /**
   * Actualiza manualmente un parámetro específico
   */
  public updateParameter(key: string, value: number): void {
    if (key in this.params && typeof this.params[key] === 'number') {
      this.params[key] = value;
      
      // Actualizar historial
      if (this.historyValues[key]) {
        this.historyValues[key].push(value);
        if (this.historyValues[key].length > this.HISTORY_SIZE) {
          this.historyValues[key].shift();
        }
      }
      
      reportDiagnosticEvent(
        DiagnosticEventType.CALIBRATION_UPDATE,
        'adaptive-calibration',
        false,
        1.0,
        { 
          action: 'manual-update', 
          parameter: key, 
          value: value 
        }
      );
      
      logError(
        `AdaptiveCalibration: Parámetro ${key} actualizado a ${value}`,
        ErrorLevel.INFO,
        "Calibration"
      );
    }
  }
  
  /**
   * Actualiza el estado ambiental para calibración adaptativa
   */
  public updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
    if (!this.params.environmentalState) {
      this.params.environmentalState = {
        noise: 0,
        lighting: 50,
        motion: 0,
        lastUpdate: Date.now()
      };
    }
    
    // Actualizar solo los campos proporcionados
    const oldState = { ...this.params.environmentalState };
    this.params.environmentalState = {
      ...this.params.environmentalState,
      ...newState,
      lastUpdate: Date.now()
    };
    
    // Aplicar ajustes de calibración basados en el nuevo estado ambiental
    this.adaptToChaningingEnvironment(oldState, this.params.environmentalState);
    
    // Registrar cambio significativo
    const isSignificantChange = this.isEnvironmentChangedSignificantly(oldState, this.params.environmentalState);
    if (isSignificantChange) {
      reportDiagnosticEvent(
        DiagnosticEventType.ENVIRONMENTAL_CHANGE,
        'adaptive-calibration',
        false,
        1.0,
        { 
          action: 'environment-update', 
          oldState: oldState,
          newState: this.params.environmentalState
        }
      );
    }
  }
  
  /**
   * Detecta si ha habido un cambio significativo en el entorno
   */
  private isEnvironmentChangedSignificantly(oldState: EnvironmentalState, newState: EnvironmentalState): boolean {
    const thresholds = {
      noise: 5,
      lighting: 10,
      motion: 5,
      brightness: 20,
      signalToNoiseRatio: 0.1
    };
    
    if (
      Math.abs((oldState.noise || 0) - (newState.noise || 0)) > thresholds.noise ||
      Math.abs((oldState.lighting || 0) - (newState.lighting || 0)) > thresholds.lighting ||
      Math.abs((oldState.motion || 0) - (newState.motion || 0)) > thresholds.motion ||
      Math.abs((oldState.brightness || 0) - (newState.brightness || 0)) > thresholds.brightness ||
      Math.abs((oldState.signalToNoiseRatio || 0) - (newState.signalToNoiseRatio || 0)) > thresholds.signalToNoiseRatio
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Adapta los parámetros al cambio ambiental
   */
  private adaptToChaningingEnvironment(oldState: EnvironmentalState, newState: EnvironmentalState): void {
    // Factores de ajuste
    const noiseFactor = 0.005;
    const lightingFactor = 0.002;
    const motionFactor = 0.01;
    const brightnessFactor = 0.001;
    const snrFactor = 0.5;
    
    // Ajustar multiplicador de ruido
    if (newState.noise !== undefined) {
      const noiseDiff = (newState.noise - (oldState.noise || 0)) * noiseFactor;
      this.updateParameterWithSmoothing('noiseMultiplier', this.params.noiseMultiplier + noiseDiff);
    }
    
    // Ajustar compensación de iluminación
    if (newState.lighting !== undefined || newState.brightness !== undefined) {
      const lightingDiff = ((newState.lighting || 0) - (oldState.lighting || 0)) * lightingFactor;
      const brightnessDiff = ((newState.brightness || 0) - (oldState.brightness || 0)) * brightnessFactor;
      this.updateParameterWithSmoothing('lightingCompensation', 
        this.params.lightingCompensation + lightingDiff + brightnessDiff);
    }
    
    // Ajustar compensación de movimiento
    if (newState.motion !== undefined) {
      const motionDiff = ((newState.motion || 0) - (oldState.motion || 0)) * motionFactor;
      this.updateParameterWithSmoothing('motionCompensation', 
        this.params.motionCompensation + motionDiff);
    }
    
    // Ajustar factor de calidad ambiental basado en SNR
    if (newState.signalToNoiseRatio !== undefined) {
      const snrDiff = ((newState.signalToNoiseRatio || 0) - (oldState.signalToNoiseRatio || 0)) * snrFactor;
      this.updateParameterWithSmoothing('environmentQualityFactor', 
        (this.params.environmentQualityFactor || 0.8) + snrDiff);
    }
    
    // Actualizar umbrales de detección en base a factores ambientales
    this.recalculateDetectionThresholds();
  }
  
  /**
   * Actualiza un parámetro con suavizado
   */
  private updateParameterWithSmoothing(key: string, newValue: number): void {
    // Aplicar límites según parámetro
    newValue = this.applyParameterLimits(key, newValue);
    
    // Agregar valor a historial
    if (!this.historyValues[key]) {
      this.historyValues[key] = Array(this.HISTORY_SIZE).fill(newValue);
    } else {
      this.historyValues[key].push(newValue);
      if (this.historyValues[key].length > this.HISTORY_SIZE) {
        this.historyValues[key].shift();
      }
    }
    
    // Calcular promedio ponderado (dando más peso a valores recientes)
    let weighted = 0;
    let weights = 0;
    const history = this.historyValues[key];
    
    for (let i = 0; i < history.length; i++) {
      const weight = 1 + (i / history.length);  // Peso creciente para valores recientes
      weighted += history[i] * weight;
      weights += weight;
    }
    
    const smoothedValue = weighted / weights;
    
    // Actualizar con valor suavizado
    this.params[key] = smoothedValue;
  }
  
  /**
   * Aplica límites a un parámetro según su tipo
   */
  private applyParameterLimits(key: string, value: number): number {
    const limits: Record<string, [number, number]> = {
      baseThreshold: [0.1, 0.9],
      noiseMultiplier: [0.5, 2.0],
      lightingCompensation: [0.5, 2.0],
      motionCompensation: [0.5, 2.0],
      adaptationRate: [0.01, 0.5],
      stabilityFactor: [0.5, 2.0],
      sensitivityLevel: [0.1, 0.9],
      environmentQualityFactor: [0.3, 1.0],
      amplitudeThreshold: [5, 50],
      falsePositiveReduction: [0.5, 2.0],
      falseNegativeReduction: [0.5, 2.0],
      rhythmDetectionThreshold: [0.3, 0.9]
    };
    
    if (limits[key]) {
      const [min, max] = limits[key];
      return Math.max(min, Math.min(max, value));
    }
    
    return value;
  }
  
  /**
   * Recalcula umbrales de detección basados en factores ambientales
   */
  private recalculateDetectionThresholds(): void {
    const env = this.params.environmentalState;
    if (!env) return;
    
    // Ajustar umbral de amplitud
    const noiseImpact = ((env.noise || 0) / 100) * this.params.noiseMultiplier;
    const lightingImpact = (Math.abs(50 - (env.lighting || 50)) / 50) * this.params.lightingCompensation;
    const motionImpact = ((env.motion || 0) / 100) * this.params.motionCompensation;
    
    // Umbral base ajustado por factores ambientales
    const adjustedBaseThreshold = 
      this.params.baseThreshold * (1 + noiseImpact + lightingImpact + motionImpact);
    
    // Umbral de amplitud (señal bruta)
    const amplitudeThreshold = 
      (this.params.amplitudeThreshold || 20) * (1 + 0.5 * (noiseImpact + motionImpact));
    
    // Ajustar umbral de ritmo (más sensible a movimiento)
    const rhythmThreshold = 
      (this.params.rhythmDetectionThreshold || 0.6) * (1 + 0.7 * motionImpact + 0.3 * noiseImpact);
    
    // Actualizar parámetros con valores suavizados
    this.updateParameterWithSmoothing('baseThreshold', adjustedBaseThreshold);
    this.updateParameterWithSmoothing('amplitudeThreshold', amplitudeThreshold);
    this.updateParameterWithSmoothing('rhythmDetectionThreshold', rhythmThreshold);
  }
  
  /**
   * Ajusta sensibilidad general del sistema
   */
  public adjustSensitivity(level: number): void {
    // Normalizar a rango 0-1
    level = Math.max(0, Math.min(1, level));
    
    this.params.sensitivityLevel = level;
    
    // Ajustar parámetros según nivel de sensibilidad
    // Menos sensible = Mayor umbral = Menos detecciones
    const baselineMultiplier = level < 0.5 
      ? 1 + (0.5 - level) * 0.6  // Valores por encima de 1 (menos sensible)
      : 1 - (level - 0.5) * 0.4; // Valores por debajo de 1 (más sensible)
    
    // Ajustar reducción de falsos positivos/negativos
    if (level < 0.5) {
      // Menos sensible: reducir falsos positivos
      this.updateParameterWithSmoothing('falsePositiveReduction', 1.0 + (0.5 - level));
      this.updateParameterWithSmoothing('falseNegativeReduction', 1.0);
    } else {
      // Más sensible: reducir falsos negativos
      this.updateParameterWithSmoothing('falsePositiveReduction', 1.0);
      this.updateParameterWithSmoothing('falseNegativeReduction', 1.0 - (level - 0.5) * 0.6);
    }
    
    // Aplicar multiplicador a umbrales
    this.updateParameterWithSmoothing('baseThreshold', 
      this.params.baseThreshold * baselineMultiplier);
    
    this.updateParameterWithSmoothing('amplitudeThreshold', 
      (this.params.amplitudeThreshold || 20) * baselineMultiplier);
    
    this.updateParameterWithSmoothing('rhythmDetectionThreshold', 
      (this.params.rhythmDetectionThreshold || 0.6) * baselineMultiplier);
    
    // Reportar ajuste
    reportDiagnosticEvent(
      DiagnosticEventType.THRESHOLD_ADAPTATION,
      'adaptive-calibration',
      false,
      1.0,
      { 
        action: 'sensitivity-adjustment', 
        level: level,
        baselineMultiplier 
      }
    );
    
    logError(
      `AdaptiveCalibration: Sensibilidad ajustada a ${level.toFixed(2)}, multiplicador ${baselineMultiplier.toFixed(2)}`,
      ErrorLevel.INFO,
      "Calibration"
    );
  }
  
  /**
   * Reinicia la calibración a valores por defecto
   */
  public reset(): void {
    this.params = {
      baseThreshold: 0.5,
      noiseMultiplier: 1.0,
      lightingCompensation: 1.0,
      motionCompensation: 1.0,
      adaptationRate: 0.1,
      stabilityFactor: 1.0,
      sensitivityLevel: 0.5,
      environmentQualityFactor: 0.8,
      amplitudeThreshold: 20,
      falsePositiveReduction: 1.2,
      falseNegativeReduction: 0.8,
      rhythmDetectionThreshold: 0.6,
      environmentalState: {
        noise: 0,
        lighting: 50,
        motion: 0,
        brightness: 128,
        movement: 0,
        signalToNoiseRatio: 0.8,
        device: {
          type: "unknown",
          model: "unknown",
          camera: {
            quality: 1.0,
            frameRate: 30
          }
        },
        lastUpdate: Date.now()
      }
    };
    
    // Reiniciar historiales
    Object.keys(this.params).forEach(key => {
      if (typeof this.params[key] === 'number') {
        this.historyValues[key] = Array(this.HISTORY_SIZE).fill(this.params[key] as number);
      }
    });
    
    reportDiagnosticEvent(
      DiagnosticEventType.CALIBRATION_UPDATE,
      'adaptive-calibration',
      false,
      1.0,
      { action: 'reset' }
    );
    
    logError(
      "AdaptiveCalibration: Sistema de calibración reiniciado a valores por defecto",
      ErrorLevel.INFO,
      "Calibration"
    );
  }
}

// Singleton
export const adaptiveCalibration = new AdaptiveCalibration();

// Funciones de utilidad
export const getCalibrationParameters = adaptiveCalibration.getParameters.bind(adaptiveCalibration);
export const updateEnvironmentalState = adaptiveCalibration.updateEnvironmentalState.bind(adaptiveCalibration);
export const adjustSensitivity = adaptiveCalibration.adjustSensitivity.bind(adaptiveCalibration);
export const resetCalibration = adaptiveCalibration.reset.bind(adaptiveCalibration);
