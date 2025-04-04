
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Coordinador del sistema adaptativo
 * Implementa comunicación bidireccional entre componentes y optimización automática
 */
import { 
  AdaptiveSystemConfig, 
  AdaptiveSystemMessage,
  MemoryState, 
  OptimizationState,
  CalibrationState
} from '../types';
import { BayesianOptimizer, createDefaultPPGOptimizer } from './bayesian-optimization';
import { getAdaptivePredictor } from './adaptive-predictor';
import { unifiedFingerDetector } from './unified-finger-detector';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Configuración predeterminada
const DEFAULT_CONFIG: AdaptiveSystemConfig = {
  enableOptimization: true,
  optimizationInterval: 60000, // 1 minuto
  adaptationRate: 0.25,
  fingerDetectionThreshold: 0.6,
  qualityThreshold: 40,
  memoryManagement: {
    maxObservations: 100,
    gcInterval: 30000, // 30 segundos
    maxBufferSize: 50
  },
  diagnostics: {
    enableDetailedLogs: false,
    logLevel: 'info',
    collectMetrics: true
  }
};

// Tipos de mensajes del sistema
export enum MessageType {
  CONFIG_UPDATE = 'config_update',
  OPTIMIZATION_REQUEST = 'optimization_request',
  OPTIMIZATION_RESULT = 'optimization_result',
  QUALITY_UPDATE = 'quality_update',
  PARAMETER_UPDATE = 'parameter_update',
  FINGER_DETECTION = 'finger_detection',
  SYSTEM_RESET = 'system_reset',
  DIAGNOSTICS_REQUEST = 'diagnostics_request',
  DIAGNOSTICS_RESULT = 'diagnostics_result',
  MODEL_UPDATE = 'model_update',
  MEMORY_OPTIMIZATION = 'memory_optimization'
}

/**
 * Resultado del procesamiento adaptativo
 */
interface ProcessingResult {
  processedValue: number;
  prediction: {
    predictedValue: number;
    confidence: number;
  };
  optimizationStatus: any | null;
}

/**
 * Clase principal del coordinador del sistema adaptativo
 */
export class AdaptiveSystemCoordinator {
  private config: AdaptiveSystemConfig;
  private bayesianOptimizer: BayesianOptimizer;
  private messageQueue: AdaptiveSystemMessage[] = [];
  private optimizationState: OptimizationState;
  private calibrationState: CalibrationState;
  private memoryState: MemoryState;
  private lastProcessedValues: number[] = [];
  private lastQualityScores: number[] = [];
  private optimizationTimer: ReturnType<typeof setTimeout> | null = null;
  private memoryOptimizationTimer: ReturnType<typeof setTimeout> | null = null;
  private isOptimizing: boolean = false;
  private componentStates: Map<string, any> = new Map();
  
  /**
   * Constructor del coordinador
   */
  constructor(initialConfig?: Partial<AdaptiveSystemConfig>) {
    // Aplicar configuración inicial
    this.config = {
      ...DEFAULT_CONFIG,
      ...initialConfig
    };
    
    // Inicializar optimizador
    this.bayesianOptimizer = createDefaultPPGOptimizer();
    
    // Estados iniciales
    this.optimizationState = {
      isOptimized: false,
      lastOptimizationTime: 0,
      performanceScore: 0,
      parameters: {},
      memoryUsage: {
        usedMemory: 0,
        totalMemory: 0,
        usagePercentage: 0,
        isMemoryLimited: false
      }
    };
    
    this.calibrationState = {
      isCalibrated: false,
      lastCalibrationTime: 0,
      calibrationQuality: 0,
      parameters: {}
    };
    
    this.memoryState = {
      usedMemory: 0,
      totalMemory: typeof performance !== 'undefined' && performance.memory ? 
        performance.memory.jsHeapSizeLimit / (1024 * 1024) : 1000,
      usagePercentage: 0,
      isMemoryLimited: false
    };
    
    // Iniciar timers
    this.startTimers();
    
    // Log de inicialización
    logError(
      `Sistema adaptativo inicializado con optimización ${this.config.enableOptimization ? 'activada' : 'desactivada'}`,
      ErrorLevel.INFO,
      "AdaptiveSystem"
    );
  }
  
  /**
   * Inicia los temporizadores para tareas periódicas
   */
  private startTimers(): void {
    // Timer para optimización periódica
    if (this.config.enableOptimization && !this.optimizationTimer) {
      this.optimizationTimer = setInterval(() => {
        this.triggerOptimization();
      }, this.config.optimizationInterval);
    }
    
    // Timer para optimización de memoria
    if (!this.memoryOptimizationTimer) {
      this.memoryOptimizationTimer = setInterval(() => {
        this.optimizeMemory();
      }, this.config.memoryManagement.gcInterval);
    }
  }
  
  /**
   * Detiene los temporizadores
   */
  private stopTimers(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    if (this.memoryOptimizationTimer) {
      clearInterval(this.memoryOptimizationTimer);
      this.memoryOptimizationTimer = null;
    }
  }
  
  /**
   * Procesa un valor con el sistema adaptativo
   */
  public processValue(value: number, quality: number, timestamp: number = Date.now()): ProcessingResult {
    try {
      // Almacenar valor y calidad
      this.lastProcessedValues.push(value);
      if (this.lastProcessedValues.length > this.config.memoryManagement.maxBufferSize) {
        this.lastProcessedValues.shift();
      }
      
      this.lastQualityScores.push(quality);
      if (this.lastQualityScores.length > this.config.memoryManagement.maxBufferSize) {
        this.lastQualityScores.shift();
      }
      
      // Actualizar detector de dedos
      unifiedFingerDetector.updateSource(
        'adaptive-system', 
        quality > this.config.qualityThreshold, 
        quality / 100
      );
      
      // Obtener predicción adaptativa
      const predictor = getAdaptivePredictor();
      predictor.update(timestamp - 50, value, quality / 100);
      const prediction = predictor.predict(timestamp);
      
      // Combinar valor real y predicción según calidad
      let processedValue = value;
      if (quality < 80 && prediction.confidence > 0.5) {
        // Mezclar valor real y predicción cuando la calidad es baja
        const blendFactor = (80 - quality) / 80 * prediction.confidence;
        processedValue = value * (1 - blendFactor) + prediction.predictedValue * blendFactor;
      }
      
      // Resultado de optimización (si está en curso)
      let optimizationStatus = null;
      if (this.isOptimizing) {
        // Añadir observación al optimizador
        this.bayesianOptimizer.addObservation(
          this.optimizationState.parameters,
          quality,
          { timestamp, quality: quality / 100, source: 'processor' }
        );
        
        // Verificar si hay nueva sugerencia de parámetros
        if (this.bayesianOptimizer.getState().iterations % 5 === 0) {
          const suggestion = this.bayesianOptimizer.suggestParams();
          
          // Actualizar parámetros
          this.optimizationState.parameters = { ...suggestion.params };
          
          // Enviar mensaje de actualización de parámetros
          this.sendMessage({
            source: 'adaptive-coordinator',
            destination: 'signal-processor',
            type: MessageType.PARAMETER_UPDATE,
            payload: {
              parameters: suggestion.params,
              confidence: suggestion.confidence,
              expectedImprovement: suggestion.expectedImprovement
            },
            priority: 'medium'
          });
          
          // Preparar estado para enviar al cliente
          optimizationStatus = {
            newParameters: suggestion.params,
            confidence: suggestion.confidence,
            expectedImprovement: suggestion.expectedImprovement,
            currentIteration: this.bayesianOptimizer.getState().iterations
          };
        }
      }
      
      return {
        processedValue,
        prediction: {
          predictedValue: prediction.predictedValue,
          confidence: prediction.confidence
        },
        optimizationStatus
      };
    } catch (error) {
      logError(
        `Error en procesamiento adaptativo: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
      
      // Resultado por defecto en caso de error
      return {
        processedValue: value,
        prediction: {
          predictedValue: value,
          confidence: 0
        },
        optimizationStatus: null
      };
    }
  }
  
  /**
   * Inicia un ciclo de optimización
   */
  private triggerOptimization(): void {
    if (!this.config.enableOptimization || this.isOptimizing) {
      return;
    }
    
    try {
      // Marcar inicio de optimización
      this.isOptimizing = true;
      
      // Actualizar estado
      this.optimizationState.lastOptimizationTime = Date.now();
      
      // Log de inicio
      logError(
        "Iniciando ciclo de optimización bayesiana",
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
      
      // Obtener parámetros iniciales del optimizador
      const initialSuggestion = this.bayesianOptimizer.suggestParams();
      this.optimizationState.parameters = { ...initialSuggestion.params };
      
      // Enviar mensaje de inicio de optimización
      this.sendMessage({
        source: 'adaptive-coordinator',
        destination: 'broadcast',
        type: MessageType.OPTIMIZATION_REQUEST,
        payload: {
          parameters: initialSuggestion.params,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      this.isOptimizing = false;
      logError(
        `Error al iniciar optimización: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Finaliza un ciclo de optimización
   */
  private finalizeOptimization(): void {
    if (!this.isOptimizing) {
      return;
    }
    
    try {
      // Obtener mejores parámetros
      const bestParams = this.bayesianOptimizer.getBestParameters();
      
      // Actualizar estado de optimización
      this.optimizationState.isOptimized = true;
      if (bestParams) {
        this.optimizationState.parameters = { ...bestParams };
      }
      
      // Actualizar rendimiento
      const bestValue = this.bayesianOptimizer.getBestValue() || 0;
      this.optimizationState.performanceScore = bestValue;
      
      // Enviar mensaje con resultado
      this.sendMessage({
        source: 'adaptive-coordinator',
        destination: 'broadcast',
        type: MessageType.OPTIMIZATION_RESULT,
        payload: {
          success: true,
          bestParameters: bestParams,
          performanceScore: bestValue,
          iterations: this.bayesianOptimizer.getState().iterations
        }
      });
      
      // Log de finalización
      logError(
        `Optimización finalizada: score=${bestValue.toFixed(2)}, iteraciones=${this.bayesianOptimizer.getState().iterations}`,
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
      
    } catch (error) {
      logError(
        `Error al finalizar optimización: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    } finally {
      // Marcar fin de optimización
      this.isOptimizing = false;
    }
  }
  
  /**
   * Optimiza el uso de memoria
   */
  private optimizeMemory(): void {
    try {
      // Actualizar estado de memoria
      if (typeof performance !== 'undefined' && performance.memory) {
        this.memoryState = {
          usedMemory: performance.memory.usedJSHeapSize / (1024 * 1024),
          totalMemory: performance.memory.jsHeapSizeLimit / (1024 * 1024),
          usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
          isMemoryLimited: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) > 0.8
        };
      }
      
      // Enviar mensaje de optimización de memoria
      this.sendMessage({
        source: 'adaptive-coordinator',
        destination: 'broadcast',
        type: MessageType.MEMORY_OPTIMIZATION,
        payload: {
          memoryState: this.memoryState,
          timestamp: Date.now()
        },
        priority: 'low'
      });
      
      // Reducir buffers si hay presión de memoria
      if (this.memoryState.isMemoryLimited) {
        // Reducir tamaño de buffer de valores
        const reductionFactor = 0.7;
        const newBufferSize = Math.max(
          10,
          Math.floor(this.config.memoryManagement.maxBufferSize * reductionFactor)
        );
        
        this.lastProcessedValues = this.lastProcessedValues.slice(-newBufferSize);
        this.lastQualityScores = this.lastQualityScores.slice(-newBufferSize);
        
        // Log de reducción
        logError(
          `Reducción de buffer por presión de memoria: ${this.config.memoryManagement.maxBufferSize} → ${newBufferSize}`,
          ErrorLevel.WARNING,
          "AdaptiveSystem"
        );
      }
      
    } catch (error) {
      logError(
        `Error en optimización de memoria: ${error}`,
        ErrorLevel.WARNING,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Envía un mensaje a otros componentes
   */
  public sendMessage(message: AdaptiveSystemMessage): void {
    try {
      // Añadir timestamp si no existe
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      
      // Añadir ID único
      if (!message.id) {
        message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Añadir a cola de mensajes
      this.messageQueue.push(message);
      
      // Limitar tamaño de la cola
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift();
      }
      
      // Procesar mensajes según tipo
      this.processMessage(message);
      
    } catch (error) {
      logError(
        `Error enviando mensaje: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Procesa un mensaje recibido
   */
  private processMessage(message: AdaptiveSystemMessage): void {
    // Ignorar mensajes sin tipo
    if (!message.type) return;
    
    try {
      switch (message.type) {
        case MessageType.CONFIG_UPDATE:
          // Actualizar configuración
          if (message.payload && typeof message.payload === 'object') {
            this.updateConfig(message.payload);
          }
          break;
          
        case MessageType.QUALITY_UPDATE:
          // Actualizar métricas de calidad
          if (message.payload && typeof message.payload.quality === 'number') {
            // Actualizar estado del detector de dedos
            unifiedFingerDetector.updateSource(
              message.source,
              message.payload.quality > this.config.qualityThreshold,
              message.payload.quality / 100
            );
            
            // Si está optimizando, añadir observación
            if (this.isOptimizing && message.payload.quality > 0) {
              this.bayesianOptimizer.addObservation(
                this.optimizationState.parameters,
                message.payload.quality,
                { 
                  timestamp: message.timestamp,
                  quality: message.payload.confidence || 0.5,
                  source: message.source
                }
              );
            }
          }
          break;
          
        case MessageType.SYSTEM_RESET:
          // Resetear sistema
          this.reset();
          break;
          
        case MessageType.OPTIMIZATION_REQUEST:
          // Iniciar optimización
          if (!this.isOptimizing) {
            this.triggerOptimization();
          }
          break;
          
        case MessageType.OPTIMIZATION_RESULT:
          // Finalizar optimización
          if (this.isOptimizing) {
            this.finalizeOptimization();
          }
          break;
          
        case MessageType.DIAGNOSTICS_REQUEST:
          // Enviar diagnósticos
          this.sendMessage({
            source: 'adaptive-coordinator',
            destination: message.source,
            type: MessageType.DIAGNOSTICS_RESULT,
            payload: this.getSystemState()
          });
          break;
          
        case MessageType.MODEL_UPDATE:
          // Actualizar estado de componente
          if (message.source && message.payload) {
            this.componentStates.set(message.source, message.payload);
          }
          break;
      }
    } catch (error) {
      logError(
        `Error procesando mensaje de tipo ${message.type}: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Actualiza la configuración del sistema
   */
  public updateConfig(newConfig: Partial<AdaptiveSystemConfig>): void {
    try {
      // Guardar configuración anterior
      const wasOptimizationEnabled = this.config.enableOptimization;
      
      // Actualizar configuración
      this.config = {
        ...this.config,
        ...newConfig,
        // Preservar sub-objetos
        memoryManagement: {
          ...this.config.memoryManagement,
          ...(newConfig.memoryManagement || {})
        },
        diagnostics: {
          ...this.config.diagnostics,
          ...(newConfig.diagnostics || {})
        }
      };
      
      // Ajustar estado si cambió la optimización
      if (wasOptimizationEnabled !== this.config.enableOptimization) {
        this.stopTimers();
        this.startTimers();
      }
      
      // Log de actualización
      logError(
        `Configuración actualizada: optimización ${this.config.enableOptimization ? 'activada' : 'desactivada'}`,
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
      
    } catch (error) {
      logError(
        `Error actualizando configuración: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Obtiene el estado actual del sistema
   */
  public getSystemState(): any {
    return {
      config: this.config,
      optimization: this.optimizationState,
      calibration: this.calibrationState,
      memory: this.memoryState,
      fingerDetection: unifiedFingerDetector.getDetectionState(),
      messageQueue: this.messageQueue.length,
      isOptimizing: this.isOptimizing,
      bayes: {
        observations: this.bayesianOptimizer.getObservations().length,
        bestValue: this.bayesianOptimizer.getBestValue(),
        iterations: this.bayesianOptimizer.getState().iterations,
        hasConverged: this.bayesianOptimizer.hasConverged()
      },
      components: Object.fromEntries(this.componentStates)
    };
  }
  
  /**
   * Reinicia el sistema adaptativo completamente
   */
  public reset(): void {
    try {
      // Detener timers
      this.stopTimers();
      
      // Resetear optimizador
      this.bayesianOptimizer.reset();
      
      // Resetear detector de dedos
      unifiedFingerDetector.reset();
      
      // Resetear predictor
      getAdaptivePredictor().reset();
      
      // Resetear buffers
      this.lastProcessedValues = [];
      this.lastQualityScores = [];
      this.messageQueue = [];
      this.componentStates.clear();
      
      // Resetear estados
      this.isOptimizing = false;
      this.optimizationState = {
        isOptimized: false,
        lastOptimizationTime: 0,
        performanceScore: 0,
        parameters: {},
        memoryUsage: this.memoryState
      };
      
      this.calibrationState = {
        isCalibrated: false,
        lastCalibrationTime: 0,
        calibrationQuality: 0,
        parameters: {}
      };
      
      // Reiniciar timers
      this.startTimers();
      
      // Log de reset
      logError(
        "Sistema adaptativo reiniciado completamente",
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
      
    } catch (error) {
      logError(
        `Error al reiniciar sistema adaptativo: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
}

// Instancia singleton compartida
let adaptiveSystemInstance: AdaptiveSystemCoordinator | null = null;

/**
 * Obtiene o crea la instancia del coordinador del sistema adaptativo
 */
export function getAdaptiveSystemCoordinator(
  config?: Partial<AdaptiveSystemConfig>
): AdaptiveSystemCoordinator {
  if (!adaptiveSystemInstance) {
    adaptiveSystemInstance = new AdaptiveSystemCoordinator(config);
  } else if (config) {
    // Actualizar configuración si se proporciona
    adaptiveSystemInstance.updateConfig(config);
  }
  
  return adaptiveSystemInstance;
}
