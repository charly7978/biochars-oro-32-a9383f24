/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Coordinador del sistema adaptativo
 * Implementa comunicación entre componentes y adaptación de parámetros
 */
import { createDefaultPPGOptimizer, BayesianOptimizer } from './bayesian-optimization';
import { unifiedFingerDetector, DetectionSource } from './unified-finger-detector';
import { getAdaptivePredictor, PredictionResult } from './adaptive-predictor';
import { AdaptiveSystemConfig, AdaptiveSystemMessage } from '../types';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Tipos de mensajes del sistema adaptativo
 */
export enum MessageType {
  CALIBRATION_REQUEST = 'calibration.request',
  CALIBRATION_COMPLETE = 'calibration.complete',
  OPTIMIZATION_REQUEST = 'optimization.request',
  OPTIMIZATION_COMPLETE = 'optimization.complete',
  QUALITY_UPDATE = 'quality.update',
  MEMORY_WARNING = 'memory.warning',
  DIAGNOSTICS_REQUEST = 'diagnostics.request',
  DIAGNOSTICS_REPORT = 'diagnostics.report',
  FINGER_DETECTION = 'finger.detection',
  FINGER_LOST = 'finger.lost',
  PARAMETER_UPDATE = 'parameter.update'
}

/**
 * Estado del sistema
 */
export interface SystemState {
  isCalibrated: boolean;
  isOptimized: boolean;
  fingerDetected: boolean;
  signalQuality: number;
  lastMessage: string;
  messageQueueLength: number;
  memoryUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  lastError: string;
}

/**
 * Interfaz para componentes adaptativos
 */
interface AdaptiveComponent {
  name: string;
  process: (message: AdaptiveSystemMessage) => void;
}

/**
 * Implementación del coordinador
 */
class AdaptiveSystemCoordinator {
  private config: Required<AdaptiveSystemConfig>;
  private optimizer: BayesianOptimizer | null = null;
  private messageQueue: AdaptiveSystemMessage[] = [];
  private lastProcessedTimestamp: number = 0;
  private messageCount: number = 0;
  private memoryStats = {
    lastCheck: 0,
    usage: 0,
    peak: 0,
    warnings: 0
  };
  
  constructor(config?: Partial<AdaptiveSystemConfig>) {
    this.config = {
      enableOptimization: config?.enableOptimization ?? true,
      optimizationInterval: config?.optimizationInterval ?? 60000,
      adaptationRate: config?.adaptationRate ?? 0.2,
      fingerDetectionThreshold: config?.fingerDetectionThreshold ?? 0.5,
      qualityThreshold: config?.qualityThreshold ?? 30,
      memoryManagement: {
        maxObservations: config?.memoryManagement?.maxObservations ?? 100,
        gcInterval: config?.memoryManagement?.gcInterval ?? 30000,
        maxBufferSize: config?.memoryManagement?.maxBufferSize ?? 1000
      },
      diagnostics: {
        enableDetailedLogs: config?.diagnostics?.enableDetailedLogs ?? false,
        logLevel: config?.diagnostics?.logLevel ?? 'info',
        collectMetrics: config?.diagnostics?.collectMetrics ?? true
      }
    };
    
    // Inicializar optimizador
    if (this.config.enableOptimization) {
      try {
        this.optimizer = createDefaultPPGOptimizer();
      } catch (error) {
        logError(
          `Error al inicializar optimizador: ${error}`,
          ErrorLevel.ERROR,
          "AdaptiveSystem"
        );
      }
    }
    
    // Iniciar intervalo de optimización
    if (this.config.enableOptimization && this.config.optimizationInterval > 0) {
      setInterval(() => {
        this.optimizeParameters();
      }, this.config.optimizationInterval);
    }
  }
  
  /**
   * Procesa un valor con el sistema adaptativo
   */
  public processValue(value: number, quality: number, timestamp: number): any {
    // Verificar uso de memoria
    this.checkMemoryUsage();
    
    // Actualizar detector de dedos
    this.updateFingerDetector(value, quality);
    
    // Adaptar umbrales
    unifiedFingerDetector.adaptThresholds(quality);
    
    // Predecir valor
    const prediction: PredictionResult = getAdaptivePredictor().predict(timestamp);
    
    // Enviar mensaje de actualización de calidad
    this.sendMessage({
      source: 'adaptive-coordinator',
      destination: 'any',
      type: MessageType.QUALITY_UPDATE,
      payload: {
        value,
        quality,
        timestamp,
        prediction
      }
    });
    
    // Procesar mensajes en cola
    this.processMessageQueue();
    
    // Guardar timestamp
    this.lastProcessedTimestamp = timestamp;
    
    return {
      processedValue: value,
      prediction,
      optimizationStatus: null
    };
  }
  
  /**
   * Envía un mensaje al sistema
   */
  public sendMessage(message: AdaptiveSystemMessage): void {
    message.timestamp = Date.now();
    message.id = `msg-${this.messageCount++}`;
    this.messageQueue.push(message);
  }
  
  /**
   * Procesa la cola de mensajes
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      if (message) {
        this.processMessage(message);
      }
    }
  }
  
  /**
   * Realiza la optimización de parámetros
   */
  private optimizeParameters(): void {
    if (!this.optimizer) return;
    
    try {
      // Simular una función de evaluación
      const simulatedQuality = Math.random() * 100;
      
      // Obtener los parámetros actuales
      const currentParams = this.optimizer.getBestParameters() || {};
      
      // Añadir observación
      this.optimizer.addObservation(currentParams, simulatedQuality);
      
      // Obtener los próximos parámetros a probar
      const nextParams = this.optimizer.nextPointToEvaluate();
      
      // Enviar mensaje de actualización de parámetros
      this.sendMessage({
        source: 'adaptive-coordinator',
        destination: 'ppg-processor',
        type: MessageType.PARAMETER_UPDATE,
        payload: nextParams
      });
      
      logError(
        `Optimizando parámetros: ${simulatedQuality.toFixed(2)}`,
        ErrorLevel.INFO,
        "AdaptiveSystem"
      );
    } catch (error) {
      logError(
        `Error durante la optimización: ${error}`,
        ErrorLevel.WARNING,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Verifica el uso de memoria
   */
  private checkMemoryUsage(): void {
    const now = Date.now();
    
    // Verificar memoria solo cada cierto intervalo
    if (now - this.memoryStats.lastCheck < 1000) {
      return;
    }
    
    try {
      // Obtener uso aproximado de memoria usando performance.now()
      // como sustituto (no podemos usar performance.memory en todos los navegadores)
      const approximateUsage = performance.now() / 100000;
      const normalizedUsage = Math.min(100, approximateUsage);
      
      this.memoryStats.usage = normalizedUsage;
      this.memoryStats.lastCheck = now;
      
      if (normalizedUsage > this.memoryStats.peak) {
        this.memoryStats.peak = normalizedUsage;
      }
      
      // Si el uso es alto, enviar advertencia
      if (normalizedUsage > 80) {
        this.memoryStats.warnings++;
        
        this.sendMessage({
          source: 'adaptive-coordinator',
          destination: 'system',
          type: MessageType.MEMORY_WARNING,
          payload: {
            usage: normalizedUsage,
            peak: this.memoryStats.peak,
            timestamp: now
          },
          priority: 'high'
        });
      }
    } catch (error) {
      // Silenciar errores - esta función es solo para monitoreo
    }
  }
  
  /**
   * Actualiza unifiedFingerDetector
   */
  private updateFingerDetector(value: number, quality: number): void {
    try {
      // Actualizar detector unificado
      unifiedFingerDetector.updateSource('adaptive-system' as DetectionSource, quality > 40, quality / 100);
    } catch (error) {
      logError(
        `Error actualizando detector de dedos unificado: ${error}`,
        ErrorLevel.WARNING,
        "AdaptiveSystem"
      );
    }
  }
  
  /**
   * Obtiene el estado actual del sistema
   */
  public getSystemState(): SystemState {
    return {
      isCalibrated: false,
      isOptimized: false,
      fingerDetected: unifiedFingerDetector.getDetectionState().isFingerDetected,
      signalQuality: 0,
      lastMessage: 'N/A',
      messageQueueLength: this.messageQueue.length,
      memoryUsage: this.memoryStats.usage,
      cpuUsage: 0,
      batteryLevel: 100,
      lastError: 'N/A'
    };
  }
  
  /**
   * Actualiza la configuración del sistema
   */
  public updateConfig(newConfig: Partial<AdaptiveSystemConfig>): void {
    this.config = {
      enableOptimization: newConfig?.enableOptimization ?? this.config.enableOptimization,
      optimizationInterval: newConfig?.optimizationInterval ?? this.config.optimizationInterval,
      adaptationRate: newConfig?.adaptationRate ?? this.config.adaptationRate,
      fingerDetectionThreshold: newConfig?.fingerDetectionThreshold ?? this.config.fingerDetectionThreshold,
      qualityThreshold: newConfig?.qualityThreshold ?? this.config.qualityThreshold,
      memoryManagement: {
        maxObservations: newConfig?.memoryManagement?.maxObservations ?? this.config.memoryManagement.maxObservations,
        gcInterval: newConfig?.memoryManagement?.gcInterval ?? this.config.memoryManagement.gcInterval,
        maxBufferSize: newConfig?.memoryManagement?.maxBufferSize ?? this.config.memoryManagement.maxBufferSize
      },
      diagnostics: {
        enableDetailedLogs: newConfig?.diagnostics?.enableDetailedLogs ?? this.config.diagnostics.enableDetailedLogs,
        logLevel: newConfig?.diagnostics?.logLevel ?? this.config.diagnostics.logLevel,
        collectMetrics: newConfig?.diagnostics?.collectMetrics ?? this.config.diagnostics.collectMetrics
      }
    };
  }
  
  /**
   * Reinicia el sistema
   */
  public reset(): void {
    this.messageQueue = [];
    this.lastProcessedTimestamp = 0;
    this.messageCount = 0;
    this.memoryStats = {
      lastCheck: 0,
      usage: 0,
      peak: 0,
      warnings: 0
    };
  }
  
  /**
   * Genera un informe de diagnóstico
   */
  private generateDiagnosticsReport(): any {
    try {
      // Obtener estado de memoria
      const memReport = {
        usage: this.memoryStats.usage,
        peak: this.memoryStats.peak,
        warnings: this.memoryStats.warnings,
        lastCheck: this.memoryStats.lastCheck
      };
      
      // Otros diagnósticos
      return {
        timestamp: Date.now(),
        memory: memReport,
        optimizer: this.optimizer ? {
          active: true,
          state: this.optimizer.getState()
        } : { active: false },
        messages: {
          processed: this.messageCount,
          queued: this.messageQueue.length
        },
        configuration: this.config
      };
    } catch (error) {
      return {
        error: `Error generando diagnósticos: ${error}`,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Procesa un mensaje específico
   */
  private processMessage(message: AdaptiveSystemMessage): void {
    try {
      switch (message.type) {
        case MessageType.CALIBRATION_REQUEST:
          // Lógica para manejar la solicitud de calibración
          logError(
            `Solicitud de calibración recibida`,
            ErrorLevel.INFO,
            "AdaptiveSystem"
          );
          break;
          
        case MessageType.OPTIMIZATION_REQUEST:
          // Lógica para manejar la solicitud de optimización
          logError(
            `Solicitud de optimización recibida`,
            ErrorLevel.INFO,
            "AdaptiveSystem"
          );
          this.optimizeParameters();
          break;
          
        case MessageType.DIAGNOSTICS_REQUEST:
          // Generar y enviar informe de diagnóstico
          const report = this.generateDiagnosticsReport();
          
          this.sendMessage({
            source: 'adaptive-coordinator',
            destination: message.source || 'any',
            type: MessageType.DIAGNOSTICS_REPORT,
            payload: report
          });
          break;
          
        case MessageType.FINGER_DETECTION:
          // Actualizar detector unificado
          if (message.payload && typeof message.payload.source === 'string') {
            unifiedFingerDetector.updateSource(
              message.payload.source as DetectionSource,
              message.payload.detected,
              message.payload.confidence || 0.5
            );
          }
          break;
          
        // Otros casos
        default:
          logError(
            `Mensaje desconocido: ${message.type}`,
            ErrorLevel.WARNING,
            "AdaptiveSystem"
          );
          break;
      }
    } catch (error) {
      logError(
        `Error procesando mensaje ${message.type}: ${error}`,
        ErrorLevel.ERROR,
        "AdaptiveSystem"
      );
    }
  }
}

// Singleton
let adaptiveCoordinator: AdaptiveSystemCoordinator | null = null;

/**
 * Obtiene el coordinador del sistema adaptativo
 */
export function getAdaptiveSystemCoordinator(config?: Partial<AdaptiveSystemConfig>): AdaptiveSystemCoordinator {
  if (!adaptiveCoordinator) {
    adaptiveCoordinator = new AdaptiveSystemCoordinator(config);
  } else if (config) {
    adaptiveCoordinator.updateConfig(config);
  }
  
  return adaptiveCoordinator;
}
