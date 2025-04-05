
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Coordinador de sistema adaptativo
 * Integra y coordina los diferentes subsistemas adaptativos
 * Implementa comunicación bidireccional entre componentes
 */
import { BayesianOptimizer, OptimizationParameter, createBayesianOptimizer } from './bayesian-optimization';
import { AdaptivePredictor, getAdaptivePredictor } from './adaptive-predictor';
import { unifiedFingerDetector } from './unified-finger-detector';
import { SignalProcessingOptions, MemoryState, OptimizationState } from '../types';
import { ErrorLevel, logError } from '@/utils/debugUtils';

/**
 * Configuración del coordinador de sistemas adaptativos
 */
export interface AdaptiveSystemConfig {
  enableOptimization: boolean;
  enablePrediction: boolean;
  enableMemoryOptimization: boolean;
  enableDiagnostics: boolean;
  adaptationRate: number;
  maxMemoryUsageMB: number;
  optimizationFrequencyMs: number;
}

/**
 * Mensaje entre subsistemas
 */
export interface SystemMessage {
  source: string;
  destination: string;
  type: string;
  payload: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

/**
 * Parámetros para optimización
 */
const OPTIMIZATION_PARAMETERS: OptimizationParameter[] = [
  {
    name: 'adaptationRate',
    min: 0.05,
    max: 0.5,
    step: 0.05,
    default: 0.2,
    description: 'Tasa de adaptación para filtros adaptativos',
    weight: 0.8
  },
  {
    name: 'signalQualityThreshold',
    min: 20,
    max: 80,
    step: 5,
    default: 40,
    description: 'Umbral de calidad de señal para procesamiento',
    weight: 1.0
  },
  {
    name: 'filterStrength',
    min: 0.1,
    max: 0.8,
    step: 0.05,
    default: 0.25,
    description: 'Fuerza del filtrado de señal',
    weight: 0.9
  },
  {
    name: 'amplificationFactor',
    min: 0.8,
    max: 1.8,
    step: 0.1,
    default: 1.2,
    description: 'Factor de amplificación de señal',
    weight: 0.7
  }
];

/**
 * Coordinador del sistema adaptativo
 */
export class AdaptiveSystemCoordinator {
  // Subsistemas
  private bayesianOptimizer: BayesianOptimizer;
  private adaptivePredictor: AdaptivePredictor;
  
  // Cola de mensajes entre sistemas
  private messageQueue: SystemMessage[] = [];
  
  // Configuración
  private config: AdaptiveSystemConfig;
  
  // Estado del sistema
  private memoryState: MemoryState = {
    usedMemory: 0,
    totalMemory: 0,
    usagePercentage: 0,
    isMemoryLimited: false
  };
  
  private optimizationState: OptimizationState = {
    isOptimized: false,
    lastOptimizationTime: 0,
    performanceScore: 0,
    parameters: {},
    memoryUsage: this.memoryState
  };
  
  // Indicadores de rendimiento
  private qualityScores: number[] = [];
  private processingTimes: number[] = [];
  private lastOptimizationTime: number = 0;
  
  /**
   * Constructor del coordinador
   */
  constructor(config?: Partial<AdaptiveSystemConfig>) {
    // Configuración por defecto
    this.config = {
      enableOptimization: true,
      enablePrediction: true,
      enableMemoryOptimization: true,
      enableDiagnostics: true,
      adaptationRate: 0.2,
      maxMemoryUsageMB: 50,
      optimizationFrequencyMs: 30000,
      ...config
    };
    
    // Inicializar optimizador bayesiano
    this.bayesianOptimizer = createBayesianOptimizer({
      parameters: OPTIMIZATION_PARAMETERS,
      explorationFactor: 0.3,
      maxObservations: 50,
      memoryOptimization: this.config.enableMemoryOptimization
    });
    
    // Obtener predictor adaptativo
    this.adaptivePredictor = getAdaptivePredictor();
    
    // Inicializar memoria
    this.updateMemoryState();
    
    // Log de inicialización
    logError(
      "AdaptiveSystemCoordinator: Sistema inicializado con configuración: " + 
      JSON.stringify(this.config),
      ErrorLevel.INFO,
      "AdaptiveSystem"
    );
  }
  
  /**
   * Actualiza el estado de memoria
   */
  private updateMemoryState(): void {
    try {
      const memoryInfo = window.performance && 'memory' in window.performance
        ? (window.performance as any).memory
        : null;
        
      if (memoryInfo) {
        this.memoryState = {
          usedMemory: memoryInfo.usedJSHeapSize / (1024 * 1024),
          totalMemory: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
          usagePercentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100,
          isMemoryLimited: memoryInfo.usedJSHeapSize > this.config.maxMemoryUsageMB * 1024 * 1024
        };
      }
    } catch (error) {
      // Fallback si no se puede acceder a la información de memoria
      this.memoryState = {
        usedMemory: 0,
        totalMemory: 0,
        usagePercentage: 0,
        isMemoryLimited: false
      };
    }
    
    // Actualizar estado de optimización con la memoria actual
    this.optimizationState.memoryUsage = this.memoryState;
  }
  
  /**
   * Procesa un valor con todo el sistema adaptativo
   */
  public processValue(value: number, quality: number, timestamp: number): {
    processedValue: number;
    prediction: any;
    optimizationStatus: any;
  } {
    const startTime = performance.now();
    
    // 1. Actualizar predictor adaptativo
    if (this.config.enablePrediction) {
      this.adaptivePredictor.update(timestamp, value, quality / 100);
    }
    
    // 2. Obtener predicción para mejorar calidad
    const prediction = this.config.enablePrediction
      ? this.adaptivePredictor.predict(timestamp)
      : { predictedValue: value, confidence: 0, predictedTimestamp: timestamp };
    
    // 3. Actualizar estadísticas de calidad
    this.updateQualityStatistics(quality);
    
    // 4. Ejecutar optimización periódica si está habilitada
    let optimizationStatus = null;
    if (this.config.enableOptimization) {
      optimizationStatus = this.checkAndRunOptimization();
    }
    
    // 5. Medir tiempo de procesamiento
    const processingTime = performance.now() - startTime;
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 50) {
      this.processingTimes.shift();
    }
    
    // 6. Actualizar estado de memoria
    if (this.config.enableMemoryOptimization) {
      this.updateMemoryState();
    }
    
    return {
      processedValue: this.config.enablePrediction && prediction.confidence > 0.6
        ? prediction.predictedValue
        : value,
      prediction,
      optimizationStatus
    };
  }
  
  /**
   * Actualiza estadísticas de calidad
   */
  private updateQualityStatistics(quality: number): void {
    this.qualityScores.push(quality);
    if (this.qualityScores.length > 50) {
      this.qualityScores.shift();
    }
  }
  
  /**
   * Verifica y ejecuta optimización si es necesario
   */
  private checkAndRunOptimization(): any {
    const now = Date.now();
    
    // Verificar si es momento de optimizar
    if (now - this.lastOptimizationTime < this.config.optimizationFrequencyMs) {
      return null;
    }
    
    // Obtener calidad media reciente
    const averageQuality = this.qualityScores.length > 0
      ? this.qualityScores.reduce((sum, q) => sum + q, 0) / this.qualityScores.length
      : 0;
    
    // Obtener tiempos de procesamiento medios
    const averageProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length
      : 0;
    
    // Registrar observación para el optimizador
    // Función objetivo: calidad - (tiempo_procesamiento * factor_penalización)
    const objectiveValue = averageQuality - (averageProcessingTime * 0.1);
    
    // Obtener parámetros actuales
    const currentParams = this.adaptivePredictor.getState();
    
    // Añadir observación
    this.bayesianOptimizer.addObservation(
      {
        adaptationRate: currentParams.adaptationRate,
        signalQualityThreshold: currentParams.confidenceThreshold * 100,
        filterStrength: 0.25, // Valor por defecto si no está disponible
        amplificationFactor: 1.2 // Valor por defecto si no está disponible
      },
      objectiveValue,
      {
        timestamp: now,
        quality: averageQuality / 100,
        source: 'automatic'
      }
    );
    
    // Obtener sugerencia para nuevos parámetros
    const suggestion = this.bayesianOptimizer.suggestParams();
    
    // Actualizar configuración del predictor
    this.adaptivePredictor.configure({
      adaptationRate: suggestion.params.adaptationRate,
      signalQualityThreshold: suggestion.params.signalQualityThreshold,
      filterStrength: suggestion.params.filterStrength,
      amplificationFactor: suggestion.params.amplificationFactor
    });
    
    // Actualizar estado
    this.lastOptimizationTime = now;
    this.optimizationState = {
      ...this.optimizationState,
      isOptimized: true,
      lastOptimizationTime: now,
      performanceScore: objectiveValue,
      parameters: suggestion.params
    };
    
    // Informar sobre la optimización
    if (this.config.enableDiagnostics) {
      logError(
        "AdaptiveSystemCoordinator: Optimización completada. " +
        `Puntuación: ${objectiveValue.toFixed(2)}, ` +
        `Calidad media: ${averageQuality.toFixed(2)}, ` +
        `Tiempo de procesamiento: ${averageProcessingTime.toFixed(2)}ms`,
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
    }
    
    return {
      newParams: suggestion.params,
      expectedImprovement: suggestion.expectedImprovement,
      confidence: suggestion.confidence,
      performanceScore: objectiveValue
    };
  }
  
  /**
   * Envía mensaje a un subsistema
   */
  public sendMessage(message: Omit<SystemMessage, 'timestamp'>): void {
    this.messageQueue.push({
      ...message,
      timestamp: Date.now()
    });
    
    // Procesar la cola de mensajes (en la práctica, podría ser asíncrono)
    this.processMessageQueue();
  }
  
  /**
   * Procesa la cola de mensajes
   */
  private processMessageQueue(): void {
    // Ordenar por prioridad
    this.messageQueue.sort((a, b) => {
      const priorityLevel = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityLevel[a.priority] - priorityLevel[b.priority];
    });
    
    // Procesar mensajes
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      
      // Dirigir mensaje al destino correspondiente
      switch (message.destination) {
        case 'optimizer':
          this.handleOptimizerMessage(message);
          break;
        case 'predictor':
          this.handlePredictorMessage(message);
          break;
        case 'finger-detector':
          this.handleFingerDetectorMessage(message);
          break;
        default:
          logError(
            `AdaptiveSystemCoordinator: Mensaje para destino desconocido: ${message.destination}`,
            ErrorLevel.WARNING,
            "AdaptiveSystem"
          );
      }
    }
  }
  
  /**
   * Maneja mensaje para el optimizador
   */
  private handleOptimizerMessage(message: SystemMessage): void {
    switch (message.type) {
      case 'add-observation':
        this.bayesianOptimizer.addObservation(
          message.payload.params,
          message.payload.value,
          message.payload.metadata
        );
        break;
      case 'reset':
        this.bayesianOptimizer.reset();
        break;
      default:
        // Ignorar mensajes no reconocidos
        break;
    }
  }
  
  /**
   * Maneja mensaje para el predictor
   */
  private handlePredictorMessage(message: SystemMessage): void {
    switch (message.type) {
      case 'update-config':
        this.adaptivePredictor.configure(message.payload);
        break;
      case 'reset':
        this.adaptivePredictor.reset();
        break;
      default:
        // Ignorar mensajes no reconocidos
        break;
    }
  }
  
  /**
   * Maneja mensaje para el detector de dedos
   */
  private handleFingerDetectorMessage(message: SystemMessage): void {
    switch (message.type) {
      case 'update-source':
        unifiedFingerDetector.updateSource(
          message.payload.source,
          message.payload.detected,
          message.payload.confidence
        );
        break;
      case 'adapt-thresholds':
        unifiedFingerDetector.adaptThresholds(
          message.payload.quality,
          message.payload.brightness
        );
        break;
      case 'reset':
        unifiedFingerDetector.reset();
        break;
      default:
        // Ignorar mensajes no reconocidos
        break;
    }
  }
  
  /**
   * Actualiza la configuración del sistema
   */
  public updateConfig(newConfig: Partial<AdaptiveSystemConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    logError(
      "AdaptiveSystemCoordinator: Configuración actualizada: " + 
      JSON.stringify(this.config),
      ErrorLevel.INFO,
      "AdaptiveSystem"
    );
  }
  
  /**
   * Obtiene estado del sistema completo
   */
  public getSystemState(): any {
    return {
      config: this.config,
      optimizer: this.bayesianOptimizer.getState(),
      predictor: this.adaptivePredictor.getState(),
      memory: this.memoryState,
      optimization: this.optimizationState,
      performance: {
        avgQuality: this.qualityScores.length > 0
          ? this.qualityScores.reduce((sum, q) => sum + q, 0) / this.qualityScores.length
          : 0,
        avgProcessingTime: this.processingTimes.length > 0
          ? this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length
          : 0,
        messageQueueLength: this.messageQueue.length
      }
    };
  }
  
  /**
   * Reinicia todo el sistema
   */
  public reset(): void {
    // Limpiar estadísticas
    this.qualityScores = [];
    this.processingTimes = [];
    this.messageQueue = [];
    this.lastOptimizationTime = 0;
    
    // Reiniciar subsistemas
    this.bayesianOptimizer.reset();
    this.adaptivePredictor.reset();
    unifiedFingerDetector.reset();
    
    // Restablecer estados
    this.optimizationState = {
      isOptimized: false,
      lastOptimizationTime: 0,
      performanceScore: 0,
      parameters: {},
      memoryUsage: this.memoryState
    };
    
    logError(
      "AdaptiveSystemCoordinator: Sistema reiniciado completamente",
      ErrorLevel.INFO,
      "AdaptiveSystem"
    );
  }
}

/**
 * Instancia singleton del coordinador
 */
let adaptiveSystemCoordinator: AdaptiveSystemCoordinator | null = null;

/**
 * Obtiene o crea el coordinador del sistema adaptativo
 */
export function getAdaptiveSystemCoordinator(config?: Partial<AdaptiveSystemConfig>): AdaptiveSystemCoordinator {
  if (!adaptiveSystemCoordinator) {
    adaptiveSystemCoordinator = new AdaptiveSystemCoordinator(config);
  } else if (config) {
    adaptiveSystemCoordinator.updateConfig(config);
  }
  
  return adaptiveSystemCoordinator;
}
