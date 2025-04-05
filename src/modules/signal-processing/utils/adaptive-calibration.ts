
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para detección de dedos
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { 
  type EnvironmentalState,
  type AdaptiveCalibrationParams
} from '../finger-detection/finger-detection-types';
import { reportDiagnosticEvent, DiagnosticEventType } from '../finger-detection/finger-diagnostics';

// Interfaz extendida con propiedades adicionales del sistema de calibración
interface CalibrationState extends EnvironmentalState {
  lightLevel: number;
  motionLevel: number;
  lastUpdateTime: number;
  calibrationVersion: number;
  adaptiveSensitivity: number;
  hasCalibrated: boolean;
}

// Implementación del sistema de calibración adaptativa
class AdaptiveCalibration {
  private state: CalibrationState = {
    noise: 0,
    lighting: 0,
    motion: 0,
    device: {
      camera: {
        quality: 0,
        frameRate: 0
      }
    },
    lightLevel: 0.5, // Default middle value
    motionLevel: 0.5, // Default middle value
    lastUpdateTime: Date.now(),
    calibrationVersion: 1,
    adaptiveSensitivity: 1.0,
    hasCalibrated: false
  };

  // Parámetros de calibración
  private params: AdaptiveCalibrationParams = {
    baseThreshold: 0.15,
    noiseMultiplier: 1.2,
    lightingCompensation: 1.0,
    motionCompensation: 1.0,
    adaptationRate: 0.05,
    stabilityFactor: 0.8
  };

  // Límites de los parámetros
  private readonly paramLimits = {
    baseThreshold: { min: 0.05, max: 0.4 },
    noiseMultiplier: { min: 0.8, max: 2.0 },
    lightingCompensation: { min: 0.6, max: 1.5 },
    motionCompensation: { min: 0.6, max: 1.5 },
    adaptationRate: { min: 0.01, max: 0.2 },
    stabilityFactor: { min: 0.5, max: 0.95 }
  };

  // Historial de calibraciones
  private calibrationHistory: Array<{
    timestamp: number;
    environmental: EnvironmentalState;
    params: AdaptiveCalibrationParams;
  }> = [];

  /**
   * Inicializa el sistema de calibración
   */
  constructor() {
    this.resetCalibration();
  }

  /**
   * Actualiza el estado ambiental para recalibración
   */
  public updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
    // Actualizar valores básicos del estado ambiental
    if (newState.noise !== undefined) {
      this.state.noise = newState.noise;
    }
    
    if (newState.lighting !== undefined) {
      this.state.lighting = newState.lighting;
      
      // Derivar nivel de luz de 0-1 a partir de lighting
      this.state.lightLevel = Math.min(1, Math.max(0, newState.lighting / 100));
    }
    
    if (newState.motion !== undefined) {
      this.state.motion = newState.motion;
      
      // Derivar nivel de movimiento de 0-1 a partir de motion
      this.state.motionLevel = Math.min(1, Math.max(0, newState.motion / 100));
    }
    
    if (newState.device?.camera) {
      this.state.device.camera = {
        ...this.state.device.camera,
        ...newState.device.camera
      };
    }
    
    // Registrar actualización
    this.state.lastUpdateTime = Date.now();
    
    // Adaptar parámetros según los nuevos valores ambientales
    this.adaptParameters();
    
    // Registrar evento diagnóstico
    reportDiagnosticEvent({
      type: DiagnosticEventType.ENVIRONMENT_CHANGE,
      message: `Environment updated: noise=${this.state.noise}, lighting=${this.state.lighting}, motion=${this.state.motion}`,
      data: { state: { ...this.state } }
    });
    
    // Registrar en el historial de calibraciones cada 5 segundos para no sobrecargarlo
    const lastCalibration = this.calibrationHistory[this.calibrationHistory.length - 1];
    if (!lastCalibration || Date.now() - lastCalibration.timestamp > 5000) {
      this.calibrationHistory.push({
        timestamp: Date.now(),
        environmental: { ...this.state },
        params: { ...this.params }
      });
      
      // Limitar tamaño del historial
      if (this.calibrationHistory.length > 20) {
        this.calibrationHistory.shift();
      }
    }
  }

  /**
   * Adapta los parámetros según el estado ambiental actual
   */
  private adaptParameters(): void {
    const { noise, lighting, motion } = this.state;
    
    // Calcular ajustes de parámetros
    const noiseAdjustment = this.calculateNoiseAdjustment(noise);
    const lightingAdjustment = this.calculateLightingAdjustment(lighting);
    const motionAdjustment = this.calculateMotionAdjustment(motion);
    
    // Actualizar parámetros con los ajustes calculados
    this.params.baseThreshold = this.clampParameter(
      'baseThreshold',
      0.15 + (noiseAdjustment * 0.1)
    );
    
    this.params.noiseMultiplier = this.clampParameter(
      'noiseMultiplier',
      1.2 + (noiseAdjustment * 0.2)
    );
    
    this.params.lightingCompensation = this.clampParameter(
      'lightingCompensation',
      1.0 + (lightingAdjustment * 0.2)
    );
    
    this.params.motionCompensation = this.clampParameter(
      'motionCompensation',
      1.0 + (motionAdjustment * 0.2)
    );
    
    // Ajustar tasa de adaptación según estabilidad
    const stabilityMetric = this.calculateStabilityMetric();
    this.params.adaptationRate = this.clampParameter(
      'adaptationRate',
      0.05 * (1 + (1 - stabilityMetric) * 0.5)
    );
    
    // Ajustar factor de estabilidad
    this.params.stabilityFactor = this.clampParameter(
      'stabilityFactor',
      0.8 * (1 + stabilityMetric * 0.2)
    );
    
    // Marcar como calibrado
    if (!this.state.hasCalibrated) {
      this.state.hasCalibrated = true;
      
      // Registrar evento diagnóstico
      reportDiagnosticEvent({
        type: DiagnosticEventType.CALIBRATION_COMPLETE,
        message: 'Initial calibration complete',
        data: { params: { ...this.params } }
      });
    }
    
    // Log para depuración
    logError(
      `Adaptive calibration parameters updated: baseThreshold=${this.params.baseThreshold.toFixed(3)}, noiseMultiplier=${this.params.noiseMultiplier.toFixed(3)}`,
      ErrorLevel.DEBUG,
      'AdaptiveCalibration'
    );
  }

  /**
   * Calcula ajuste basado en el nivel de ruido
   */
  private calculateNoiseAdjustment(noise: number): number {
    // Normalizar ruido a un rango de 0-1
    const normalizedNoise = Math.min(1, Math.max(0, noise / 100));
    
    // Calcular ajuste no lineal
    return Math.pow(normalizedNoise, 1.5);
  }

  /**
   * Calcula ajuste basado en la iluminación
   */
  private calculateLightingAdjustment(lighting: number): number {
    // Normalizar iluminación a un rango de 0-1
    const normalizedLighting = Math.min(1, Math.max(0, lighting / 100));
    
    // Calcular distancia desde el punto óptimo (0.5)
    const distanceFromOptimal = Math.abs(normalizedLighting - 0.5) * 2;
    
    // Ajuste cuadrático
    return Math.pow(distanceFromOptimal, 2);
  }

  /**
   * Calcula ajuste basado en el movimiento
   */
  private calculateMotionAdjustment(motion: number): number {
    // Normalizar movimiento a un rango de 0-1
    const normalizedMotion = Math.min(1, Math.max(0, motion / 100));
    
    // Aplicar función exponencial para enfatizar movimientos altos
    return Math.pow(normalizedMotion, 2);
  }

  /**
   * Calcula métrica de estabilidad basada en cambios recientes
   */
  private calculateStabilityMetric(): number {
    if (this.calibrationHistory.length < 2) {
      return 1.0; // Asumir estabilidad máxima si no hay suficiente historial
    }
    
    // Obtener las últimas calibraciones
    const recent = this.calibrationHistory.slice(-5);
    
    // Calcular varianza en parámetros clave
    let totalVariance = 0;
    
    // Varianza en ruido
    const noiseValues = recent.map(c => c.environmental.noise);
    totalVariance += this.calculateVariance(noiseValues);
    
    // Varianza en iluminación
    const lightingValues = recent.map(c => c.environmental.lighting);
    totalVariance += this.calculateVariance(lightingValues);
    
    // Varianza en movimiento
    const motionValues = recent.map(c => c.environmental.motion);
    totalVariance += this.calculateVariance(motionValues);
    
    // Normalizar y convertir a estabilidad (1 - varianza normalizada)
    const normalizedVariance = Math.min(1, totalVariance / 5000);
    return 1 - normalizedVariance;
  }

  /**
   * Calcula varianza de un conjunto de valores
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    // Calcular media
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calcular suma de cuadrados de diferencias
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    
    // Calcular varianza
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Limita un parámetro a sus valores mínimo y máximo definidos
   */
  private clampParameter(name: keyof AdaptiveCalibrationParams, value: number): number {
    const limits = this.paramLimits[name];
    return Math.min(limits.max, Math.max(limits.min, value));
  }

  /**
   * Obtiene los parámetros de calibración actuales
   */
  public getCalibrationParameters(): AdaptiveCalibrationParams {
    return { ...this.params };
  }

  /**
   * Restaura la calibración a sus valores iniciales
   */
  public resetCalibration(): void {
    // Restaurar estado a valores predeterminados
    this.state = {
      noise: 0,
      lighting: 50, // Valor medio como predeterminado
      motion: 0,
      device: {
        camera: {
          quality: 0,
          frameRate: 0
        }
      },
      lightLevel: 0.5,
      motionLevel: 0,
      lastUpdateTime: Date.now(),
      calibrationVersion: this.state ? this.state.calibrationVersion + 1 : 1,
      adaptiveSensitivity: 1.0,
      hasCalibrated: false
    };
    
    // Restaurar parámetros a valores predeterminados
    this.params = {
      baseThreshold: 0.15,
      noiseMultiplier: 1.2,
      lightingCompensation: 1.0,
      motionCompensation: 1.0,
      adaptationRate: 0.05,
      stabilityFactor: 0.8
    };
    
    // Limpiar historial
    this.calibrationHistory = [];
    
    // Registrar evento diagnóstico
    reportDiagnosticEvent({
      type: DiagnosticEventType.CALIBRATION_RESET,
      message: 'Calibration reset to default values',
      data: { state: { ...this.state }, params: { ...this.params } }
    });
    
    logError(
      'Adaptive calibration reset to default values',
      ErrorLevel.INFO,
      'AdaptiveCalibration'
    );
  }

  /**
   * Obtiene estado ambiental actual
   */
  public getEnvironmentalState(): EnvironmentalState {
    return {
      noise: this.state.noise,
      lighting: this.state.lighting,
      motion: this.state.motion,
      device: { ...this.state.device }
    };
  }
}

// Instancia singleton
const adaptiveCalibration = new AdaptiveCalibration();

// Exportar funcionalidades
export { adaptiveCalibration };
export { getCalibrationParameters, updateEnvironmentalState, resetCalibration };

/**
 * Obtiene los parámetros de calibración actuales
 */
function getCalibrationParameters(): AdaptiveCalibrationParams {
  return adaptiveCalibration.getCalibrationParameters();
}

/**
 * Actualiza el estado ambiental para recalibración
 */
function updateEnvironmentalState(newState: Partial<EnvironmentalState>): void {
  adaptiveCalibration.updateEnvironmentalState(newState);
}

/**
 * Restaura la calibración a sus valores iniciales
 */
function resetCalibration(): void {
  adaptiveCalibration.resetCalibration();
}
