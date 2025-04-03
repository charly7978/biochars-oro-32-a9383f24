
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Monitor de calidad de señal avanzado
 * Proporciona métricas de calidad generales y específicas por algoritmo
 * Permite comunicación bidireccional entre algoritmos y optimizador
 */

// Estructura para métricas específicas de algoritmos cardíacos
export interface CardiacMetrics {
  pulseQuality: number;
  rhythmStability: number;
}

// Estructura para métricas específicas de SpO2
export interface SpO2Metrics {
  perfusionIndex: number;
  signalToNoise: number;
}

// Estructura para retroalimentación de algoritmos
export interface AlgorithmFeedback {
  algorithm: string;
  qualityScore: number;
  issues: string[];
  timestamp: number;
  recommendations?: Record<string, any>;
}

// Métricas de calidad general de la señal
export interface SignalQualityMetrics {
  generalQuality: number;
  signalStrength: number;
  stability: number;
  periodicity: number;
  noiseLevel: number;
  
  // Métricas específicas por algoritmo
  algorithmSpecific: {
    cardiac?: CardiacMetrics;
    spo2?: SpO2Metrics;
    [key: string]: any;
  };
  
  // Alertas de calidad
  hasQualityAlert: boolean;
  diagnosticDetails: string[];
}

/**
 * Monitor avanzado de calidad de señal
 * Permite comunicación bidireccional entre algoritmos y optimizador
 */
export class SignalQualityMonitor {
  // Métricas actuales
  private metrics: SignalQualityMetrics = {
    generalQuality: 0,
    signalStrength: 0,
    stability: 0,
    periodicity: 0,
    noiseLevel: 0,
    algorithmSpecific: {},
    hasQualityAlert: false,
    diagnosticDetails: []
  };
  
  // Algoritmos registrados con sus métricas
  private algorithms: Record<string, {
    lastUpdate: number;
    qualityScore: number;
    issues: string[];
    isActive: boolean;
  }> = {};
  
  // Umbral de calidad para alertas
  private generalThreshold: number = 40;
  private stabilityThreshold: number = 60;
  private periodicityThreshold: number = 65;
  private noiseLevelThreshold: number = 30;
  private minAlgorithmQuality: number = 40;
  
  // Tasa de adaptación para actualizaciones
  private adaptationRate: number = 0.1;
  
  // Estado de alertas
  private isAlertActive: boolean = false;
  private alertStartTime: number | null = null;
  private problemAlgorithms: {algorithm: string, issues: string[], quality: number}[] = [];
  
  /**
   * Inicializa el monitor con umbrales personalizados
   */
  public initialize(config: {
    generalThreshold?: number;
    stabilityThreshold?: number;
    periodicityThreshold?: number;
    noiseLevelThreshold?: number;
    minAlgorithmQuality?: number;
    adaptationRate?: number;
  }) {
    if (config.generalThreshold !== undefined) {
      this.generalThreshold = config.generalThreshold;
    }
    
    if (config.stabilityThreshold !== undefined) {
      this.stabilityThreshold = config.stabilityThreshold;
    }
    
    if (config.periodicityThreshold !== undefined) {
      this.periodicityThreshold = config.periodicityThreshold;
    }
    
    if (config.noiseLevelThreshold !== undefined) {
      this.noiseLevelThreshold = config.noiseLevelThreshold;
    }
    
    if (config.minAlgorithmQuality !== undefined) {
      this.minAlgorithmQuality = config.minAlgorithmQuality;
    }
    
    if (config.adaptationRate !== undefined) {
      this.adaptationRate = config.adaptationRate;
    }
    
    // Resetear métricas
    this.metrics = {
      generalQuality: 0,
      signalStrength: 0,
      stability: 0,
      periodicity: 0,
      noiseLevel: 0,
      algorithmSpecific: {},
      hasQualityAlert: false,
      diagnosticDetails: []
    };
    
    this.algorithms = {};
    this.isAlertActive = false;
    this.alertStartTime = null;
    this.problemAlgorithms = [];
  }
  
  /**
   * Actualiza las métricas de calidad generales
   */
  public updateMetrics(metrics: {
    signalStrength: number;
    stability: number;
    periodicity: number;
    noiseLevel: number;
  }) {
    // Actualizar métricas con suavizado exponencial
    this.metrics.signalStrength = this.applyExponentialSmoothing(
      this.metrics.signalStrength, 
      metrics.signalStrength
    );
    
    this.metrics.stability = this.applyExponentialSmoothing(
      this.metrics.stability, 
      metrics.stability
    );
    
    this.metrics.periodicity = this.applyExponentialSmoothing(
      this.metrics.periodicity, 
      metrics.periodicity
    );
    
    this.metrics.noiseLevel = this.applyExponentialSmoothing(
      this.metrics.noiseLevel, 
      metrics.noiseLevel
    );
    
    // Calcular calidad general combinando métricas individuales
    this.metrics.generalQuality = this.calculateGeneralQuality();
    
    // Verificar si se necesita activar alerta
    this.updateAlertStatus();
    
    // Retornar el estado actual
    return {
      metrics: this.metrics,
      isAlertActive: this.isAlertActive,
      problemAlgorithms: this.problemAlgorithms
    };
  }
  
  /**
   * Recibe retroalimentación de algoritmos específicos
   */
  public receiveFeedback(feedback: AlgorithmFeedback) {
    const now = Date.now();
    
    // Actualizar registro del algoritmo
    this.algorithms[feedback.algorithm] = {
      lastUpdate: now,
      qualityScore: feedback.qualityScore,
      issues: feedback.issues,
      isActive: true
    };
    
    // Actualizar métricas específicas del algoritmo
    if (feedback.recommendations) {
      // Procesar métricas específicas por tipo de algoritmo
      if (feedback.algorithm.startsWith('Cardiac') && feedback.recommendations.cardiac) {
        this.metrics.algorithmSpecific.cardiac = {
          pulseQuality: feedback.recommendations.cardiac.pulseQuality || 0,
          rhythmStability: feedback.recommendations.cardiac.rhythmStability || 0
        };
      } else if (feedback.algorithm.startsWith('SpO2') && feedback.recommendations.spo2) {
        this.metrics.algorithmSpecific.spo2 = {
          perfusionIndex: feedback.recommendations.spo2.perfusionIndex || 0,
          signalToNoise: feedback.recommendations.spo2.signalToNoise || 0
        };
      }
      
      // Guardar métricas específicas adicionales
      for (const [key, value] of Object.entries(feedback.recommendations)) {
        if (key !== 'cardiac' && key !== 'spo2') {
          this.metrics.algorithmSpecific[key] = value;
        }
      }
    }
    
    // Validar algoritmos activos (descartar los que no han enviado feedback recientemente)
    this.cleanupInactiveAlgorithms();
    
    // Actualizar estado de alerta
    this.updateAlertStatus();
    
    // Retornar el estado actual
    return {
      metrics: this.metrics,
      isAlertActive: this.isAlertActive,
      problemAlgorithms: this.problemAlgorithms
    };
  }
  
  /**
   * Cambia la tasa de adaptación
   */
  public setAdaptationRate(rate: number) {
    if (rate >= 0 && rate <= 1) {
      this.adaptationRate = rate;
    }
  }
  
  /**
   * Reinicia el monitor de calidad
   */
  public reset() {
    this.metrics = {
      generalQuality: 0,
      signalStrength: 0,
      stability: 0,
      periodicity: 0,
      noiseLevel: 0,
      algorithmSpecific: {},
      hasQualityAlert: false,
      diagnosticDetails: []
    };
    
    this.algorithms = {};
    this.isAlertActive = false;
    this.alertStartTime = null;
    this.problemAlgorithms = [];
  }
  
  /**
   * Calcula la calidad general a partir de métricas individuales
   */
  private calculateGeneralQuality(): number {
    // Verificar valores nulos
    if (
      this.metrics.signalStrength === undefined ||
      this.metrics.stability === undefined ||
      this.metrics.periodicity === undefined ||
      this.metrics.noiseLevel === undefined
    ) {
      return 0;
    }
    
    // Invertir nivel de ruido (más ruido = peor calidad)
    const noiseQuality = Math.max(0, 100 - this.metrics.noiseLevel);
    
    // Calcular promedio ponderado
    const weights = {
      signalStrength: 0.35,
      stability: 0.25,
      periodicity: 0.25,
      noiseQuality: 0.15
    };
    
    const generalQuality = 
      weights.signalStrength * this.metrics.signalStrength +
      weights.stability * this.metrics.stability +
      weights.periodicity * this.metrics.periodicity +
      weights.noiseQuality * noiseQuality;
    
    // Si hay algoritmos activos, tomar en cuenta sus calidades también
    const activeAlgorithms = Object.values(this.algorithms).filter(a => a.isActive);
    if (activeAlgorithms.length > 0) {
      // Obtener calidad promedio de los algoritmos
      const avgAlgorithmQuality = activeAlgorithms.reduce(
        (sum, alg) => sum + alg.qualityScore, 
        0
      ) / activeAlgorithms.length;
      
      // Mezclar con calidad general (70% métricas generales, 30% algoritmos)
      return 0.7 * generalQuality + 0.3 * avgAlgorithmQuality;
    }
    
    return generalQuality;
  }
  
  /**
   * Actualiza el estado de alerta basado en métricas
   */
  private updateAlertStatus() {
    // Diagnósticos actualizados
    const diagnostics: string[] = [];
    const problems: {algorithm: string, issues: string[], quality: number}[] = [];
    
    // Verificar métricas generales
    if (this.metrics.generalQuality < this.generalThreshold) {
      diagnostics.push(`Calidad general baja: ${Math.round(this.metrics.generalQuality)}%`);
    }
    
    if (this.metrics.signalStrength < this.generalThreshold) {
      diagnostics.push(`Señal débil: ${Math.round(this.metrics.signalStrength)}%`);
    }
    
    if (this.metrics.stability < this.stabilityThreshold) {
      diagnostics.push(`Estabilidad baja: ${Math.round(this.metrics.stability)}%`);
    }
    
    if (this.metrics.periodicity < this.periodicityThreshold) {
      diagnostics.push(`Periodicidad insuficiente: ${Math.round(this.metrics.periodicity)}%`);
    }
    
    if (this.metrics.noiseLevel > this.noiseLevelThreshold) {
      diagnostics.push(`Nivel de ruido alto: ${Math.round(this.metrics.noiseLevel)}%`);
    }
    
    // Verificar algoritmos con problemas
    for (const [name, data] of Object.entries(this.algorithms)) {
      if (data.isActive && data.qualityScore < this.minAlgorithmQuality) {
        const issues = data.issues.length > 0 
          ? data.issues 
          : [`Calidad insuficiente: ${Math.round(data.qualityScore)}%`];
        
        problems.push({
          algorithm: name,
          issues,
          quality: data.qualityScore
        });
        
        // Añadir a diagnósticos
        diagnostics.push(`Problema en ${name}: ${issues[0]}`);
      }
    }
    
    // Actualizar lista de problemas
    this.problemAlgorithms = problems;
    
    // Actualizar estado de alerta
    const shouldActivateAlert = (
      this.metrics.generalQuality < this.generalThreshold ||
      problems.length > 0
    );
    
    // Si debemos activar la alerta
    if (shouldActivateAlert) {
      // Si la alerta no estaba activa, registrar inicio
      if (!this.isAlertActive) {
        this.isAlertActive = true;
        this.alertStartTime = Date.now();
      }
    }
    // Si debemos desactivar la alerta
    else if (this.isAlertActive) {
      this.isAlertActive = false;
      this.alertStartTime = null;
    }
    
    // Actualizar detalles de diagnóstico
    this.metrics.diagnosticDetails = diagnostics;
    this.metrics.hasQualityAlert = this.isAlertActive;
  }
  
  /**
   * Limpia algoritmos inactivos
   */
  private cleanupInactiveAlgorithms() {
    const now = Date.now();
    const MAX_INACTIVE_TIME = 5000; // 5 segundos
    
    for (const [name, data] of Object.entries(this.algorithms)) {
      if (now - data.lastUpdate > MAX_INACTIVE_TIME) {
        this.algorithms[name].isActive = false;
      }
    }
  }
  
  /**
   * Aplica suavizado exponencial a un valor
   */
  private applyExponentialSmoothing(currentValue: number, newValue: number): number {
    // Si el valor actual es 0, inicializar con el nuevo valor
    if (currentValue === 0) {
      return newValue;
    }
    
    // Suavizado exponencial
    return (1 - this.adaptationRate) * currentValue + this.adaptationRate * newValue;
  }
}
