
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Monitor de recursos y rendimiento
 * Proporciona información sobre el uso de recursos y rendimiento de la aplicación
 */
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Tipo de información de rendimiento recopilada
 */
export interface PerformanceInfo {
  fps: number;
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  cpuUsage: number;
  processingLatency: number;
  frameDropRate: number;
}

/**
 * Clase para monitorear recursos y rendimiento
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  // Métricas de rendimiento
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameRates: number[] = [];
  private processingTimes: number[] = [];
  private frameDrops: number = 0;
  private totalFrames: number = 0;
  
  // Estado del monitor
  private isMonitoring: boolean = false;
  private monitorInterval: number | null = null;
  
  // Umbrales
  private readonly FPS_THRESHOLD = 20;
  private readonly PROCESSING_TIME_THRESHOLD = 50; // ms
  private readonly MEMORY_USAGE_THRESHOLD = 0.8; // 80% de límite de memoria
  
  /**
   * Constructor privado (singleton)
   */
  private constructor() {
    // Inicializar
  }
  
  /**
   * Obtiene la instancia del monitor
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Inicia el monitoreo
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.frameRates = [];
    this.processingTimes = [];
    this.frameDrops = 0;
    this.totalFrames = 0;
    
    // Monitorear periódicamente el rendimiento
    this.monitorInterval = window.setInterval(() => this.checkPerformance(), 5000);
    
    logError("Performance monitoring started", ErrorLevel.INFO, "PerformanceMonitor");
  }
  
  /**
   * Detiene el monitoreo
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitorInterval !== null) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    logError("Performance monitoring stopped", ErrorLevel.INFO, "PerformanceMonitor");
  }
  
  /**
   * Registra un frame procesado
   * @param processingTime Tiempo de procesamiento en ms
   */
  public recordFrame(processingTime: number): void {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    
    this.frameCount++;
    this.totalFrames++;
    this.lastFrameTime = now;
    
    // Calcular FPS instantáneo
    if (frameDelta > 0) {
      const instantFPS = 1000 / frameDelta;
      this.frameRates.push(instantFPS);
      
      // Limitar tamaño del historial
      if (this.frameRates.length > 100) {
        this.frameRates.shift();
      }
      
      // Considerar un frame perdido si el FPS cae significativamente
      if (instantFPS < this.FPS_THRESHOLD) {
        this.frameDrops++;
      }
    }
    
    // Registrar tiempo de procesamiento
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
  }
  
  /**
   * Comprueba el rendimiento general
   */
  private checkPerformance(): void {
    if (this.frameRates.length === 0) return;
    
    try {
      // Calcular métricas
      const avgFPS = this.calculateAverage(this.frameRates);
      const avgProcessingTime = this.calculateAverage(this.processingTimes);
      const frameDropRate = this.totalFrames > 0 ? 
                           (this.frameDrops / this.totalFrames) * 100 : 0;
      
      // Obtener uso de memoria si está disponible
      let memoryInfo: PerformanceInfo['memory'] = undefined;
      
      if (window.performance && (performance as any).memory) {
        const memoryUsage = (performance as any).memory;
        memoryInfo = {
          usedJSHeapSize: memoryUsage.usedJSHeapSize,
          totalJSHeapSize: memoryUsage.totalJSHeapSize,
          jsHeapSizeLimit: memoryUsage.jsHeapSizeLimit
        };
      }
      
      // Estimar uso de CPU basado en tiempo de procesamiento y FPS
      const estimatedCPUUsage = Math.min(100, (avgProcessingTime / (1000 / avgFPS)) * 100);
      
      // Ensamblar información de rendimiento
      const performanceInfo: PerformanceInfo = {
        fps: avgFPS,
        memory: memoryInfo,
        cpuUsage: estimatedCPUUsage,
        processingLatency: avgProcessingTime,
        frameDropRate
      };
      
      // Registrar métricas de rendimiento
      this.logPerformanceMetrics(performanceInfo);
      
      // Comprobar si hay problemas de rendimiento
      this.checkPerformanceIssues(performanceInfo);
    } catch (error) {
      logError(
        `Error al verificar rendimiento: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.WARNING,
        "PerformanceMonitor"
      );
    }
  }
  
  /**
   * Calcula el promedio de un array de números
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Registra métricas de rendimiento
   */
  private logPerformanceMetrics(info: PerformanceInfo): void {
    // Registrar cada 10 segundos para no saturar
    logError(
      `Performance metrics - FPS: ${info.fps.toFixed(1)}, ` +
      `CPU: ${info.cpuUsage.toFixed(1)}%, ` +
      `Latency: ${info.processingLatency.toFixed(1)}ms, ` +
      `Frame drops: ${info.frameDropRate.toFixed(1)}%` +
      (info.memory ? `, Memory: ${(info.memory.usedJSHeapSize || 0) / (1024 * 1024)}MB / ${(info.memory.jsHeapSizeLimit || 0) / (1024 * 1024)}MB` : ''),
      ErrorLevel.INFO,
      "PerformanceMonitor"
    );
  }
  
  /**
   * Comprueba si hay problemas de rendimiento
   */
  private checkPerformanceIssues(info: PerformanceInfo): void {
    let hasIssues = false;
    const issues: string[] = [];
    
    // Comprobar FPS bajo
    if (info.fps < this.FPS_THRESHOLD) {
      hasIssues = true;
      issues.push(`Low FPS: ${info.fps.toFixed(1)} (threshold: ${this.FPS_THRESHOLD})`);
    }
    
    // Comprobar alto tiempo de procesamiento
    if (info.processingLatency > this.PROCESSING_TIME_THRESHOLD) {
      hasIssues = true;
      issues.push(`High processing time: ${info.processingLatency.toFixed(1)}ms (threshold: ${this.PROCESSING_TIME_THRESHOLD}ms)`);
    }
    
    // Comprobar alto uso de memoria
    if (info.memory && info.memory.jsHeapSizeLimit && info.memory.usedJSHeapSize) {
      const memoryUsageRatio = info.memory.usedJSHeapSize / info.memory.jsHeapSizeLimit;
      
      if (memoryUsageRatio > this.MEMORY_USAGE_THRESHOLD) {
        hasIssues = true;
        issues.push(`High memory usage: ${(memoryUsageRatio * 100).toFixed(1)}% (threshold: ${(this.MEMORY_USAGE_THRESHOLD * 100)}%)`);
      }
    }
    
    // Comprobar alto ratio de frames perdidos
    if (info.frameDropRate > 10) {
      hasIssues = true;
      issues.push(`High frame drop rate: ${info.frameDropRate.toFixed(1)}% (threshold: 10%)`);
    }
    
    // Registrar problemas si los hay
    if (hasIssues) {
      logError(
        `Performance issues detected: ${issues.join(", ")}`,
        ErrorLevel.WARNING,
        "PerformanceMonitor"
      );
    }
  }
  
  /**
   * Comprueba si hay una posible fuga de memoria
   */
  public checkMemoryLeak(): boolean {
    if (!window.performance || !(performance as any).memory) {
      return false;
    }
    
    try {
      const memoryUsage = (performance as any).memory;
      const memoryUsageRatio = memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit;
      
      // Considerar fuga si el uso es mayor al 90% del límite
      const hasPotentialLeak = memoryUsageRatio > 0.9;
      
      if (hasPotentialLeak) {
        logError(
          `Potential memory leak detected: ${(memoryUsageRatio * 100).toFixed(1)}% of available memory used`,
          ErrorLevel.ERROR,
          "PerformanceMonitor"
        );
      }
      
      return hasPotentialLeak;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Obtiene las métricas de rendimiento actuales
   */
  public getCurrentMetrics(): PerformanceInfo {
    const avgFPS = this.frameRates.length > 0 ? 
                  this.calculateAverage(this.frameRates) : 0;
                  
    const avgProcessingTime = this.processingTimes.length > 0 ? 
                             this.calculateAverage(this.processingTimes) : 0;
                             
    const frameDropRate = this.totalFrames > 0 ? 
                         (this.frameDrops / this.totalFrames) * 100 : 0;
    
    // Estimar uso de CPU
    const estimatedCPUUsage = Math.min(100, (avgProcessingTime / (1000 / Math.max(1, avgFPS))) * 100);
    
    // Obtener información de memoria si está disponible
    let memoryInfo: PerformanceInfo['memory'] = undefined;
    
    if (window.performance && (performance as any).memory) {
      const memoryUsage = (performance as any).memory;
      memoryInfo = {
        usedJSHeapSize: memoryUsage.usedJSHeapSize,
        totalJSHeapSize: memoryUsage.totalJSHeapSize,
        jsHeapSizeLimit: memoryUsage.jsHeapSizeLimit
      };
    }
    
    return {
      fps: avgFPS,
      memory: memoryInfo,
      cpuUsage: estimatedCPUUsage,
      processingLatency: avgProcessingTime,
      frameDropRate
    };
  }
}

/**
 * Obtiene la instancia del monitor de rendimiento
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return PerformanceMonitor.getInstance();
}
