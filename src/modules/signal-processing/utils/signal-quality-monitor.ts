
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Monitor avanzado de calidad de señal
 * Se ubica entre el optimizador y los algoritmos de medición para evaluar la calidad general
 * y proporcionar retroalimentación bidireccional
 */

export interface AlgorithmFeedback {
  algorithm: string;       // Nombre del algoritmo que reporta
  qualityScore: number;    // Puntuación de calidad (0-100)
  issues: string[];        // Problemas específicos detectados
  timestamp: number;       // Momento del reporte
  recommendations?: {      // Recomendaciones opcionales para el optimizador
    filterStrength?: number;
    amplificationFactor?: number;
    adaptiveParams?: Record<string, number>;
  };
}

export interface SignalQualityMetrics {
  generalQuality: number;  // Calidad general de la señal (0-100)
  signalStrength: number;  // Fuerza de la señal (0-100)
  stability: number;       // Estabilidad de la señal (0-100)
  periodicity: number;     // Periodicidad de la señal (0-100)
  noiseLevel: number;      // Nivel de ruido estimado (0-100, donde 0 es mejor)
  timestamp: number;       // Momento de la medición
  algorithmSpecific: {     // Métricas específicas para cada algoritmo
    cardiac?: {
      pulseQuality: number;
      rhythmStability: number;
    };
    spo2?: {
      perfusionIndex: number;
      signalToNoise: number;
    };
    pressure?: {
      waveformQuality: number;
    };
  };
}

export interface OptimizationResponse {
  adjustments: {
    filterStrength?: number;
    amplificationFactor?: number;
    adaptiveParams?: Record<string, number>;
  };
  message: string;
  success: boolean;
  timestamp: number;
}

/**
 * Clase para monitoreo avanzado de calidad de señal
 * Ubicado estratégicamente entre el optimizador y los algoritmos de medición
 */
export class SignalQualityMonitor {
  // Métricas actuales de calidad
  private currentMetrics: SignalQualityMetrics;
  
  // Historial de retroalimentación de algoritmos
  private algorithmFeedback: Map<string, AlgorithmFeedback> = new Map();
  
  // Últimas respuestas de optimización
  private optimizationResponses: OptimizationResponse[] = [];
  
  // Umbral para alertas de calidad
  private qualityAlertThreshold: number = 40;
  
  // Umbral para activar diagnóstico detallado
  private detailedDiagnosticsThreshold: number = 35;
  
  // Estado de alerta actual
  private isAlertActive: boolean = false;
  
  // Callbacks
  private onQualityUpdate?: (metrics: SignalQualityMetrics) => void;
  private onAlertStateChange?: (isActive: boolean, details: any) => void;
  
  constructor() {
    // Inicializar métricas con valores predeterminados
    this.currentMetrics = {
      generalQuality: 0,
      signalStrength: 0,
      stability: 0,
      periodicity: 0,
      noiseLevel: 0,
      timestamp: Date.now(),
      algorithmSpecific: {}
    };
  }
  
  /**
   * Evalúa la calidad de la señal antes de enviarla a los algoritmos individuales
   * @param signal Señal optimizada a evaluar
   * @param recentSignals Buffer de señales recientes para análisis
   */
  public evaluateSignalQuality(signal: number, recentSignals: number[]): SignalQualityMetrics {
    const timestamp = Date.now();
    
    // Evaluar calidad general basada en características de la señal
    const signalStrength = this.calculateSignalStrength(signal, recentSignals);
    const stability = this.calculateStability(recentSignals);
    const periodicity = this.calculatePeriodicity(recentSignals);
    const noiseLevel = this.calculateNoiseLevel(recentSignals);
    
    // Calcular calidad general ponderada
    const generalQuality = this.calculateGeneralQuality(
      signalStrength, 
      stability, 
      periodicity, 
      noiseLevel
    );
    
    // Actualizar métricas actuales
    this.currentMetrics = {
      generalQuality,
      signalStrength,
      stability,
      periodicity,
      noiseLevel,
      timestamp,
      algorithmSpecific: {...this.currentMetrics.algorithmSpecific}
    };
    
    // Verificar si se debe activar una alerta de calidad
    this.checkQualityAlert();
    
    // Notificar actualización si hay callback registrado
    if (this.onQualityUpdate) {
      this.onQualityUpdate(this.currentMetrics);
    }
    
    return this.currentMetrics;
  }
  
  /**
   * Recibe retroalimentación de un algoritmo específico
   * @param feedback Retroalimentación del algoritmo
   */
  public receiveAlgorithmFeedback(feedback: AlgorithmFeedback): void {
    // Guardar retroalimentación más reciente
    this.algorithmFeedback.set(feedback.algorithm, feedback);
    
    // Actualizar métricas específicas del algoritmo
    this.updateAlgorithmSpecificMetrics(feedback);
    
    // Verificar si se debe activar una alerta con los nuevos datos
    this.checkQualityAlert();
    
    console.log(`SignalQualityMonitor: Recibida retroalimentación de ${feedback.algorithm}`, {
      qualityScore: feedback.qualityScore,
      issues: feedback.issues,
      timestamp: new Date(feedback.timestamp).toISOString()
    });
  }
  
  /**
   * Genera recomendaciones para el optimizador basadas en la retroalimentación
   */
  public generateOptimizerRecommendations(): Record<string, any> {
    // Recopila recomendaciones de todos los algoritmos
    const recommendations: Record<string, any> = {};
    
    // Analizar retroalimentación de cada algoritmo
    this.algorithmFeedback.forEach((feedback) => {
      if (feedback.recommendations) {
        // Priorizar algoritmos con problemas graves
        const priority = feedback.qualityScore < 40 ? 'high' : 'normal';
        
        if (!recommendations[priority]) {
          recommendations[priority] = [];
        }
        
        recommendations[priority].push({
          source: feedback.algorithm,
          params: feedback.recommendations,
          issues: feedback.issues,
          qualityScore: feedback.qualityScore
        });
      }
    });
    
    // Agregar recomendaciones generales basadas en métricas actuales
    if (this.currentMetrics.generalQuality < 50) {
      if (!recommendations.general) {
        recommendations.general = {};
      }
      
      // Ajustar según métricas específicas
      if (this.currentMetrics.noiseLevel > 60) {
        recommendations.general.filterStrength = 0.35; // Aumentar filtrado para reducir ruido
      }
      
      if (this.currentMetrics.signalStrength < 40) {
        recommendations.general.amplificationFactor = 1.5; // Aumentar amplificación para señal débil
      }
    }
    
    return recommendations;
  }
  
  /**
   * Recibe respuesta del optimizador
   * @param response Respuesta del optimizador
   */
  public receiveOptimizerResponse(response: OptimizationResponse): void {
    // Guardar respuesta
    this.optimizationResponses.push(response);
    
    // Limitar historial
    if (this.optimizationResponses.length > 10) {
      this.optimizationResponses.shift();
    }
    
    console.log("SignalQualityMonitor: Recibida respuesta del optimizador", {
      adjustments: response.adjustments,
      success: response.success,
      timestamp: new Date(response.timestamp).toISOString()
    });
  }
  
  /**
   * Registra callback para notificaciones de cambios en calidad
   */
  public onQualityMetricsUpdate(callback: (metrics: SignalQualityMetrics) => void): void {
    this.onQualityUpdate = callback;
  }
  
  /**
   * Registra callback para cambios en estado de alerta
   */
  public onAlertChange(callback: (isActive: boolean, details: any) => void): void {
    this.onAlertStateChange = callback;
  }
  
  /**
   * Verifica si se debe activar o desactivar alerta de calidad
   */
  private checkQualityAlert(): void {
    // Evaluar si algún algoritmo tiene problemas graves
    let hasAlgorithmIssues = false;
    let problemAlgorithms: {algorithm: string, issues: string[], quality: number}[] = [];
    
    this.algorithmFeedback.forEach((feedback) => {
      if (feedback.qualityScore < this.qualityAlertThreshold) {
        hasAlgorithmIssues = true;
        problemAlgorithms.push({
          algorithm: feedback.algorithm,
          issues: feedback.issues,
          quality: feedback.qualityScore
        });
      }
    });
    
    // También verificar calidad general
    const hasGeneralQualityIssue = this.currentMetrics.generalQuality < this.qualityAlertThreshold;
    
    // Determinar si debe activarse la alerta
    const shouldActivateAlert = hasAlgorithmIssues || hasGeneralQualityIssue;
    
    // Si el estado de alerta cambia, notificar
    if (shouldActivateAlert !== this.isAlertActive) {
      this.isAlertActive = shouldActivateAlert;
      
      if (this.onAlertStateChange) {
        this.onAlertStateChange(this.isAlertActive, {
          generalQuality: this.currentMetrics.generalQuality,
          problemAlgorithms,
          timestamp: Date.now(),
          detailedDiagnostics: this.shouldShowDetailedDiagnostics()
        });
      }
    }
  }
  
  /**
   * Determina si se debe mostrar diagnóstico detallado
   */
  public shouldShowDetailedDiagnostics(): boolean {
    // Mostrar diagnóstico detallado si la calidad general es muy baja
    if (this.currentMetrics.generalQuality < this.detailedDiagnosticsThreshold) {
      return true;
    }
    
    // O si algún algoritmo tiene problemas graves
    for (const [_, feedback] of this.algorithmFeedback) {
      if (feedback.qualityScore < this.detailedDiagnosticsThreshold) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calcula la calidad general basada en varias métricas
   */
  private calculateGeneralQuality(
    signalStrength: number, 
    stability: number, 
    periodicity: number, 
    noiseLevel: number
  ): number {
    // Ponderación de cada factor en la calidad general
    const weights = {
      signalStrength: 0.25,
      stability: 0.25,
      periodicity: 0.35,
      noiseLevel: 0.15
    };
    
    // Calcular calidad ponderada
    const qualityScore = 
      (signalStrength * weights.signalStrength) +
      (stability * weights.stability) +
      (periodicity * weights.periodicity) +
      ((100 - noiseLevel) * weights.noiseLevel); // Invertir noiseLevel para que 0 ruido = 100 puntos
    
    // Asegurar que esté en el rango 0-100
    return Math.min(100, Math.max(0, qualityScore));
  }
  
  /**
   * Calcula la fuerza de la señal basada en amplitud
   */
  private calculateSignalStrength(signal: number, recentSignals: number[]): number {
    if (recentSignals.length < 5) return 0;
    
    // Calcular amplitud como diferencia entre máximo y mínimo
    const min = Math.min(...recentSignals);
    const max = Math.max(...recentSignals);
    const amplitude = max - min;
    
    // Normalizar a un rango 0-100 con una función de mapeo adecuada
    // Una amplitud de 0.8 o mayor se considera 100% de fuerza
    return Math.min(100, Math.max(0, (amplitude / 0.8) * 100));
  }
  
  /**
   * Calcula la estabilidad de la señal
   */
  private calculateStability(recentSignals: number[]): number {
    if (recentSignals.length < 10) return 0;
    
    // Calcular la desviación estándar
    const mean = recentSignals.reduce((sum, val) => sum + val, 0) / recentSignals.length;
    const variance = recentSignals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentSignals.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalizar a un rango 0-100 donde menor desviación = mayor estabilidad
    // Una desviación de 0.5 o mayor se considera 0% de estabilidad
    const stabilityScore = Math.max(0, 100 - (stdDev / 0.005) * 100);
    
    return Math.min(100, Math.max(0, stabilityScore));
  }
  
  /**
   * Evalúa la periodicidad de la señal (importante para señales cardíacas)
   */
  private calculatePeriodicity(recentSignals: number[]): number {
    if (recentSignals.length < 20) return 0;
    
    // Simplificado: buscar cruces por cero como indicador de periodicidad
    let zeroCrossings = 0;
    const mean = recentSignals.reduce((sum, val) => sum + val, 0) / recentSignals.length;
    
    for (let i = 1; i < recentSignals.length; i++) {
      // Detectar cuando la señal cruza su media
      if ((recentSignals[i-1] > mean && recentSignals[i] <= mean) ||
          (recentSignals[i-1] < mean && recentSignals[i] >= mean)) {
        zeroCrossings++;
      }
    }
    
    // Normalizar cruces a un rango 0-100
    // Para un PPG típico, esperamos alrededor de 1-2 cruces por segundo
    // con una tasa de muestreo de 30fps, eso sería ~5-6 cruces en 20 muestras para un buen pulso
    const expectedCrossings = 6;
    const crossingsDifference = Math.abs(zeroCrossings - expectedCrossings);
    
    // Mayor puntuación cuando está cerca del valor esperado
    const periodicityScore = Math.max(0, 100 - (crossingsDifference / expectedCrossings) * 100);
    
    return Math.min(100, Math.max(0, periodicityScore));
  }
  
  /**
   * Estima el nivel de ruido en la señal
   */
  private calculateNoiseLevel(recentSignals: number[]): number {
    if (recentSignals.length < 10) return 100;
    
    // Aplicar un filtro de mediana para obtener una señal de referencia
    const sortedValues = [...recentSignals].sort((a, b) => a - b);
    const medianFiltered = [];
    
    for (let i = 0; i < recentSignals.length; i++) {
      const windowStart = Math.max(0, i - 2);
      const windowEnd = Math.min(recentSignals.length - 1, i + 2);
      const window = recentSignals.slice(windowStart, windowEnd + 1).sort((a, b) => a - b);
      const median = window[Math.floor(window.length / 2)];
      medianFiltered.push(median);
    }
    
    // Calcular la suma de diferencias cuadráticas entre la señal original y la filtrada
    let sumSquaredDiff = 0;
    for (let i = 0; i < recentSignals.length; i++) {
      sumSquaredDiff += Math.pow(recentSignals[i] - medianFiltered[i], 2);
    }
    
    // Normalizar a un rango 0-100
    const noiseEstimate = Math.min(100, Math.sqrt(sumSquaredDiff / recentSignals.length) * 500);
    
    return noiseEstimate;
  }
  
  /**
   * Actualiza métricas específicas para un algoritmo
   */
  private updateAlgorithmSpecificMetrics(feedback: AlgorithmFeedback): void {
    const algorithm = feedback.algorithm.toLowerCase();
    
    // Actualizar métricas específicas según el tipo de algoritmo
    if (algorithm.includes('cardiac') || algorithm.includes('heart')) {
      // Métricas cardíacas
      this.currentMetrics.algorithmSpecific.cardiac = {
        pulseQuality: this.extractMetric(feedback, 'pulseQuality', 0),
        rhythmStability: this.extractMetric(feedback, 'rhythmStability', 0)
      };
    } 
    else if (algorithm.includes('spo2') || algorithm.includes('oxygen')) {
      // Métricas de SpO2
      this.currentMetrics.algorithmSpecific.spo2 = {
        perfusionIndex: this.extractMetric(feedback, 'perfusionIndex', 0),
        signalToNoise: this.extractMetric(feedback, 'signalToNoise', 0)
      };
    }
    else if (algorithm.includes('pressure') || algorithm.includes('bp')) {
      // Métricas de presión
      this.currentMetrics.algorithmSpecific.pressure = {
        waveformQuality: this.extractMetric(feedback, 'waveformQuality', 0)
      };
    }
  }
  
  /**
   * Extrae una métrica específica de la retroalimentación
   */
  private extractMetric(feedback: AlgorithmFeedback, metricName: string, defaultValue: number): number {
    if (feedback.recommendations && typeof feedback.recommendations[metricName] === 'number') {
      return feedback.recommendations[metricName];
    }
    return defaultValue;
  }
  
  /**
   * Reinicia el monitor
   */
  public reset(): void {
    // Reiniciar métricas
    this.currentMetrics = {
      generalQuality: 0,
      signalStrength: 0,
      stability: 0,
      periodicity: 0,
      noiseLevel: 0,
      timestamp: Date.now(),
      algorithmSpecific: {}
    };
    
    // Limpiar retroalimentación
    this.algorithmFeedback.clear();
    this.optimizationResponses = [];
    this.isAlertActive = false;
  }
  
  /**
   * Obtiene métricas actuales
   */
  public getCurrentMetrics(): SignalQualityMetrics {
    return {...this.currentMetrics};
  }
  
  /**
   * Obtiene el estado actual de alerta
   */
  public getAlertState(): boolean {
    return this.isAlertActive;
  }
  
  /**
   * Obtiene un resumen de problemas detectados
   */
  public getIssuesSummary(): Record<string, string[]> {
    const issues: Record<string, string[]> = {};
    
    this.algorithmFeedback.forEach((feedback) => {
      if (feedback.issues.length > 0) {
        issues[feedback.algorithm] = feedback.issues;
      }
    });
    
    return issues;
  }
}

/**
 * Crea una nueva instancia del monitor de calidad
 */
export function createSignalQualityMonitor(): SignalQualityMonitor {
  return new SignalQualityMonitor();
}
