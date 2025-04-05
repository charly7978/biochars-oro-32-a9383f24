
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema de calibración adaptativa para la detección de dedo
 * Ajusta los parámetros del detector según las condiciones ambientales y del usuario
 */

import { unifiedFingerDetector } from './unified-finger-detector';
import { fingerDiagnostics } from './finger-diagnostics';

// Interfaz para parámetros de calibración
export interface CalibrationParameters {
  sensitivityLevel: number;         // 0-1, sensibilidad general
  rhythmDetectionThreshold: number; // Umbral para detección por ritmo
  amplitudeThreshold: number;       // Umbral para detección por amplitud
  stabilityWindow: number;          // Ventana para análisis de estabilidad
  falsePositiveReduction: number;   // Factor de reducción de falsos positivos (0-1)
  falseNegativeReduction: number;   // Factor de reducción de falsos negativos (0-1)
  adaptationRate: number;           // Velocidad de adaptación (0-1)
}

// Estado ambiental para la calibración
export interface EnvironmentalState {
  lightLevel: number;            // 0-1, nivel de luz
  motionLevel: number;           // 0-1, nivel de movimiento
  signalToNoiseRatio: number;    // Relación señal/ruido estimada
  devicePerformance: number;     // 0-1, estimación de rendimiento del dispositivo
}

/**
 * Sistema de calibración adaptativa que ajusta parámetros
 * en tiempo real para mejorar la detección de dedo
 */
class AdaptiveCalibration {
  // Parámetros actuales
  private calibration: CalibrationParameters = {
    sensitivityLevel: 0.6,           // Valor predeterminado moderado
    rhythmDetectionThreshold: 0.2,   // Umbral para detección por ritmo
    amplitudeThreshold: 0.3,         // Umbral para detección por amplitud
    stabilityWindow: 5,              // Ventana para análisis de estabilidad
    falsePositiveReduction: 0.3,     // Moderado
    falseNegativeReduction: 0.3,     // Moderado
    adaptationRate: 0.1              // Adaptación gradual
  };
  
  // Estado ambiental
  private environment: EnvironmentalState = {
    lightLevel: 0.5,
    motionLevel: 0,
    signalToNoiseRatio: 0.5,
    devicePerformance: 0.5
  };
  
  // Historial de calibraciones para análisis
  private calibrationHistory: Array<{
    timestamp: number,
    params: CalibrationParameters,
    environment: EnvironmentalState,
    performance: {
      detectionRate: number,
      falsePositiveRate: number,
      falseNegativeRate: number
    }
  }> = [];
  
  // Perfil aprendido del usuario
  private userProfile: {
    averageAmplitude: number,
    rhythmPattern: number[],
    signalCharacteristics: {
      peak: number,
      valley: number,
      frequency: number
    }
  } = {
    averageAmplitude: 0,
    rhythmPattern: [],
    signalCharacteristics: {
      peak: 0,
      valley: 0,
      frequency: 0
    }
  };
  
  // Configuración
  private isAutoCalibrationEnabled: boolean = true;
  private maxCalibrationHistorySize: number = 10;
  private autoCalibrationInterval: number | null = null;
  private isPerformingCalibration: boolean = false;
  
  constructor() {
    console.log('AdaptiveCalibration: Sistema de calibración adaptativa inicializado');
  }
  
  /**
   * Inicia el sistema de calibración adaptativa
   */
  public start(): void {
    if (this.autoCalibrationInterval !== null) {
      this.stop();
    }
    
    // Crear intervalo para calibración automática
    if (this.isAutoCalibrationEnabled) {
      this.autoCalibrationInterval = window.setInterval(() => {
        this.performAutomaticCalibration();
      }, 10000); // Cada 10 segundos
      
      console.log('AdaptiveCalibration: Calibración automática iniciada');
    }
  }
  
  /**
   * Detiene el sistema de calibración
   */
  public stop(): void {
    if (this.autoCalibrationInterval !== null) {
      clearInterval(this.autoCalibrationInterval);
      this.autoCalibrationInterval = null;
      console.log('AdaptiveCalibration: Calibración automática detenida');
    }
  }
  
  /**
   * Realiza una calibración automática basada en condiciones actuales
   */
  private performAutomaticCalibration(): void {
    if (this.isPerformingCalibration) return;
    
    this.isPerformingCalibration = true;
    
    try {
      // Obtener estado del detector
      const detectorState = unifiedFingerDetector.getDetailedStats();
      
      // Obtener estado de diagnóstico actual
      const diagnosticsState = fingerDiagnostics.getDiagnosticsState();
      const diagnosticSession = fingerDiagnostics.getSession();
      
      // Si no hay suficientes datos, usar calibración por defecto
      if (!diagnosticSession || diagnosticSession.events.length < 10) {
        return;
      }
      
      // Analizar eventos recientes para ajustar parámetros
      const recentEvents = diagnosticSession.events.slice(-30);
      
      // Extraer métricas para calibración
      let detectedCount = 0;
      let totalEvents = recentEvents.length;
      let amplitudeSum = 0;
      let amplitudeCount = 0;
      
      recentEvents.forEach(event => {
        if (event.isFingerDetected) {
          detectedCount++;
        }
        
        if (event.signalValue !== undefined) {
          amplitudeSum += Math.abs(event.signalValue);
          amplitudeCount++;
        }
      });
      
      // Calcular métricas
      const detectionRate = totalEvents > 0 ? detectedCount / totalEvents : 0;
      const avgAmplitude = amplitudeCount > 0 ? amplitudeSum / amplitudeCount : 0;
      
      // Actualizar perfil de usuario
      this.updateUserProfile(recentEvents, avgAmplitude);
      
      // Ajustar parámetros según condiciones
      this.adjustCalibrationParameters(detectionRate, diagnosticSession.summary);
      
      // Registrar calibración en historial
      this.recordCalibration({
        detectionRate,
        falsePositiveRate: diagnosticSession.summary.falsePositives / Math.max(1, totalEvents),
        falseNegativeRate: diagnosticSession.summary.falseNegatives / Math.max(1, totalEvents)
      });
      
      console.log('AdaptiveCalibration: Calibración automática realizada', {
        detectionRate,
        falsePositiveRate: diagnosticSession.summary.falsePositives / Math.max(1, totalEvents),
        falseNegativeRate: diagnosticSession.summary.falseNegatives / Math.max(1, totalEvents),
        newParams: { ...this.calibration }
      });
      
    } catch (error) {
      console.error('AdaptiveCalibration: Error en calibración automática', error);
    } finally {
      this.isPerformingCalibration = false;
    }
  }
  
  /**
   * Actualiza el perfil de usuario basado en datos recientes
   */
  private updateUserProfile(
    events: Array<any>,
    avgAmplitude: number
  ): void {
    // Actualizar amplitud promedio con decaimiento exponencial
    this.userProfile.averageAmplitude = 
      this.userProfile.averageAmplitude === 0 
        ? avgAmplitude 
        : this.userProfile.averageAmplitude * 0.7 + avgAmplitude * 0.3;
    
    // Si algún evento contiene información de ritmo, actualizar patrón
    const rhythmEvents = events.filter(e => 
      e.details && e.details.intervals && e.details.intervals.length > 0
    );
    
    if (rhythmEvents.length > 0) {
      // Tomar el evento más reciente con datos de ritmo
      const lastRhythmEvent = rhythmEvents[rhythmEvents.length - 1];
      
      // Extraer intervalos
      const intervals = lastRhythmEvent.details.intervals;
      
      // Si hay suficientes intervalos, actualizar patrón de ritmo
      if (intervals.length >= 3) {
        this.userProfile.rhythmPattern = [...intervals];
        
        // Calcular frecuencia cardíaca estimada (60000 / intervalo promedio)
        const avgInterval = intervals.reduce((sum: number, val: number) => sum + val, 0) / intervals.length;
        this.userProfile.signalCharacteristics.frequency = avgInterval > 0 ? 60000 / avgInterval : 0;
      }
    }
    
    // Buscar valores máximos y mínimos para actualizar características
    const signalValues = events
      .filter(e => e.signalValue !== undefined)
      .map(e => e.signalValue);
    
    if (signalValues.length > 0) {
      const peakValue = Math.max(...signalValues);
      const valleyValue = Math.min(...signalValues);
      
      // Actualizar con decaimiento exponencial
      this.userProfile.signalCharacteristics.peak = 
        this.userProfile.signalCharacteristics.peak === 0 
          ? peakValue 
          : this.userProfile.signalCharacteristics.peak * 0.7 + peakValue * 0.3;
          
      this.userProfile.signalCharacteristics.valley = 
        this.userProfile.signalCharacteristics.valley === 0 
          ? valleyValue 
          : this.userProfile.signalCharacteristics.valley * 0.7 + valleyValue * 0.3;
    }
  }
  
  /**
   * Ajusta los parámetros de calibración basados en la tasa de detección
   * y datos de diagnóstico
   */
  private adjustCalibrationParameters(
    detectionRate: number,
    summary: any
  ): void {
    // Obtener copia de los parámetros actuales
    const newParams = { ...this.calibration };
    
    // Ajustar según tasa de detección
    if (detectionRate < 0.3) {
      // Detección baja - aumentar sensibilidad
      newParams.sensitivityLevel = Math.min(1, newParams.sensitivityLevel + 0.05 * this.calibration.adaptationRate);
      newParams.falseNegativeReduction = Math.min(0.8, newParams.falseNegativeReduction + 0.05 * this.calibration.adaptationRate);
      newParams.amplitudeThreshold = Math.max(0.1, newParams.amplitudeThreshold - 0.02 * this.calibration.adaptationRate);
    } else if (detectionRate > 0.7) {
      // Detección alta - mejorar precisión
      newParams.falsePositiveReduction = Math.min(0.8, newParams.falsePositiveReduction + 0.05 * this.calibration.adaptationRate);
    }
    
    // Ajustar según falsos positivos/negativos
    if (summary.falsePositives > summary.falseNegatives * 2) {
      // Muchos falsos positivos - ser más restrictivo
      newParams.sensitivityLevel = Math.max(0.3, newParams.sensitivityLevel - 0.05 * this.calibration.adaptationRate);
      newParams.rhythmDetectionThreshold = Math.min(0.35, newParams.rhythmDetectionThreshold + 0.02 * this.calibration.adaptationRate);
    } else if (summary.falseNegatives > summary.falsePositives * 2) {
      // Muchos falsos negativos - ser más permisivo
      newParams.sensitivityLevel = Math.min(0.9, newParams.sensitivityLevel + 0.05 * this.calibration.adaptationRate);
      newParams.rhythmDetectionThreshold = Math.max(0.15, newParams.rhythmDetectionThreshold - 0.02 * this.calibration.adaptationRate);
    }
    
    // Ajustar ventana de estabilidad según las condiciones de señal
    if (this.environment.motionLevel > 0.6) {
      // Movimiento alto - aumentar ventana para estabilidad
      newParams.stabilityWindow = Math.min(8, newParams.stabilityWindow + 1);
    } else if (this.environment.motionLevel < 0.3) {
      // Movimiento bajo - reducir ventana para respuesta rápida
      newParams.stabilityWindow = Math.max(3, newParams.stabilityWindow - 1);
    }
    
    // Aplicar cambios con la tasa de adaptación configurada
    for (const key in newParams) {
      if (Object.prototype.hasOwnProperty.call(newParams, key) && 
          Object.prototype.hasOwnProperty.call(this.calibration, key)) {
        const paramKey = key as keyof CalibrationParameters;
        if (paramKey !== 'adaptationRate') { // No adaptar la propia tasa
          this.calibration[paramKey] = (this.calibration[paramKey] * (1 - this.calibration.adaptationRate) + 
                                       newParams[paramKey] * this.calibration.adaptationRate);
        }
      }
    }
  }
  
  /**
   * Registra una calibración en el historial para análisis
   */
  private recordCalibration(performance: {
    detectionRate: number,
    falsePositiveRate: number,
    falseNegativeRate: number
  }): void {
    this.calibrationHistory.push({
      timestamp: Date.now(),
      params: { ...this.calibration },
      environment: { ...this.environment },
      performance
    });
    
    // Mantener historial limitado
    if (this.calibrationHistory.length > this.maxCalibrationHistorySize) {
      this.calibrationHistory.shift();
    }
  }
  
  /**
   * Actualiza el estado ambiental para calibración
   */
  public updateEnvironmentalState(state: Partial<EnvironmentalState>): void {
    this.environment = {
      ...this.environment,
      ...state
    };
    
    // Si hay cambios significativos, realizar calibración
    const significantChange = 
      (state.lightLevel !== undefined && Math.abs(state.lightLevel - this.environment.lightLevel) > 0.2) ||
      (state.motionLevel !== undefined && Math.abs(state.motionLevel - this.environment.motionLevel) > 0.2);
      
    if (significantChange && this.isAutoCalibrationEnabled) {
      this.performAutomaticCalibration();
    }
  }
  
  /**
   * Aplica los parámetros de calibración actuales al detector
   */
  public applyCalibrationToDetector(): void {
    // Aquí se aplicarían los parámetros al detector unificado
    // y a otros componentes del sistema de detección
    
    // Por ejemplo, ajustar el umbral de consenso basado en la sensibilidad
    
    console.log('AdaptiveCalibration: Aplicando parámetros:', this.calibration);
  }
  
  /**
   * Obtiene los parámetros de calibración actuales
   */
  public getCalibrationParameters(): CalibrationParameters {
    return { ...this.calibration };
  }
  
  /**
   * Establece manualmente los parámetros de calibración
   */
  public setCalibrationParameters(params: Partial<CalibrationParameters>): void {
    this.calibration = {
      ...this.calibration,
      ...params
    };
    
    this.applyCalibrationToDetector();
    console.log('AdaptiveCalibration: Parámetros actualizados manualmente', params);
  }
  
  /**
   * Habilita o deshabilita la calibración automática
   */
  public setAutoCalibration(enabled: boolean): void {
    this.isAutoCalibrationEnabled = enabled;
    
    if (enabled && this.autoCalibrationInterval === null) {
      this.start();
    } else if (!enabled && this.autoCalibrationInterval !== null) {
      this.stop();
    }
    
    console.log(`AdaptiveCalibration: Calibración automática ${enabled ? 'habilitada' : 'deshabilitada'}`);
  }
  
  /**
   * Obtiene el perfil de usuario actual
   */
  public getUserProfile(): typeof this.userProfile {
    return { ...this.userProfile };
  }
  
  /**
   * Obtiene el historial de calibraciones
   */
  public getCalibrationHistory(): typeof this.calibrationHistory {
    return [...this.calibrationHistory];
  }
  
  /**
   * Reinicia el sistema a su estado inicial
   */
  public reset(): void {
    this.stop();
    
    // Reiniciar parámetros a valores predeterminados
    this.calibration = {
      sensitivityLevel: 0.6,
      rhythmDetectionThreshold: 0.2,
      amplitudeThreshold: 0.3,
      stabilityWindow: 5,
      falsePositiveReduction: 0.3,
      falseNegativeReduction: 0.3,
      adaptationRate: 0.1
    };
    
    // Reiniciar estado ambiental
    this.environment = {
      lightLevel: 0.5,
      motionLevel: 0,
      signalToNoiseRatio: 0.5,
      devicePerformance: 0.5
    };
    
    // Limpiar historial
    this.calibrationHistory = [];
    
    // Reiniciar perfil de usuario
    this.userProfile = {
      averageAmplitude: 0,
      rhythmPattern: [],
      signalCharacteristics: {
        peak: 0,
        valley: 0,
        frequency: 0
      }
    };
    
    this.isPerformingCalibration = false;
    
    console.log('AdaptiveCalibration: Sistema reiniciado');
  }
}

// Instancia única para toda la aplicación
export const adaptiveCalibration = new AdaptiveCalibration();

// Funciones de ayuda para simplificar el uso
export const startAdaptiveCalibration = () => 
  adaptiveCalibration.start();

export const stopAdaptiveCalibration = () => 
  adaptiveCalibration.stop();

export const updateEnvironmentalState = (state: Partial<EnvironmentalState>) => 
  adaptiveCalibration.updateEnvironmentalState(state);

export const getCalibrationParameters = () => 
  adaptiveCalibration.getCalibrationParameters();

export const setCalibrationParameters = (params: Partial<CalibrationParameters>) => 
  adaptiveCalibration.setCalibrationParameters(params);

export const resetAdaptiveCalibration = () => 
  adaptiveCalibration.reset();
