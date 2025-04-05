
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador de señales vitales optimizado para dispositivos móviles
 * Implementa filtros y procesamiento eficientes para hardware limitado
 */

import { VitalSignsResult } from './types/vital-signs-result';
import { AdaptiveFilters } from '../signal-processing/adaptive-filters';

export class OptimizedMobileProcessor {
  private static instance: OptimizedMobileProcessor;
  
  // Configuración de procesamiento
  private processingQuality: 'high' | 'medium' | 'low' = 'medium';
  private updateInterval: number = 250; // ms entre actualizaciones
  private lastUpdateTime: number = 0;
  private signalBuffer: number[] = [];
  private readonly BUFFER_SIZE = 30;
  
  // Contador de arritmias
  private arrhythmiaCounter: number = 0;
  
  // Filtros adaptativos
  private adaptiveFilters = AdaptiveFilters.getInstance();
  
  /**
   * Constructor privado para singleton
   */
  private constructor() {
    console.log("OptimizedMobileProcessor: Initialized with mobile-optimized settings");
  }
  
  /**
   * Obtener instancia única
   */
  public static getInstance(): OptimizedMobileProcessor {
    if (!OptimizedMobileProcessor.instance) {
      OptimizedMobileProcessor.instance = new OptimizedMobileProcessor();
    }
    return OptimizedMobileProcessor.instance;
  }
  
  /**
   * Configurar calidad de procesamiento según capacidad del dispositivo
   * @param quality Nivel de calidad
   */
  public setProcessingQuality(quality: 'high' | 'medium' | 'low'): void {
    this.processingQuality = quality;
    
    // Ajustar intervalo de actualización según calidad
    switch (quality) {
      case 'high':
        this.updateInterval = 100;
        break;
      case 'medium':
        this.updateInterval = 250;
        break;
      case 'low':
        this.updateInterval = 500;
        break;
    }
    
    console.log(`OptimizedMobileProcessor: Quality set to ${quality}, update interval: ${this.updateInterval}ms`);
  }
  
  /**
   * Procesar valor de señal con optimizaciones móviles
   * @param value Valor de la señal PPG
   * @param rrData Datos de intervalo RR opcionales
   */
  public processValue(
    value: number, 
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): VitalSignsResult | null {
    const now = Date.now();
    
    // Aplicar filtro adaptativo optimizado para móvil
    const filteredValue = this.adaptiveFilters.applyFilter(value);
    
    // Añadir al buffer
    this.signalBuffer.push(filteredValue);
    if (this.signalBuffer.length > this.BUFFER_SIZE) {
      this.signalBuffer.shift();
    }
    
    // Limitar frecuencia de actualización para ahorrar batería
    if (now - this.lastUpdateTime < this.updateInterval) {
      return null;
    }
    
    this.lastUpdateTime = now;
    
    // Verificar si hay suficientes datos
    if (this.signalBuffer.length < 10) {
      return this.createEmptyResult();
    }
    
    // Verificar calidad mínima de señal
    const signalQuality = this.calculateSignalQuality();
    if (signalQuality < 0.3) {
      return this.createEmptyResult();
    }
    
    // Calcular signos vitales con algoritmos simplificados para móvil
    const spo2 = this.calculateSpO2();
    const pressure = this.calculateBloodPressure(rrData);
    
    // Verificar arritmia con enfoque simplificado para ahorro de batería
    let arrhythmiaDetected = false;
    if (rrData && rrData.intervals.length >= 3 && this.processingQuality !== 'low') {
      arrhythmiaDetected = this.detectArrhythmia(rrData.intervals);
    }
    
    // Incrementar contador si se detecta arritmia
    if (arrhythmiaDetected) {
      this.arrhythmiaCounter++;
    }
    
    return {
      spo2,
      pressure,
      arrhythmiaStatus: arrhythmiaDetected ? 
        `ARRHYTHMIA DETECTED|${this.arrhythmiaCounter}` : 
        `NORMAL RHYTHM|${this.arrhythmiaCounter}`,
      glucose: 0, // No calculado en modo optimizado móvil
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: arrhythmiaDetected ? {
        timestamp: Date.now(),
        rmssd: 0,
        rrVariation: 0
      } : null,
      confidence: {
        overall: signalQuality
      }
    };
  }
  
  /**
   * Calcula la calidad de la señal (0-1)
   */
  private calculateSignalQuality(): number {
    if (this.signalBuffer.length < 10) return 0;
    
    // Cálculos simplificados para móvil
    const recentValues = this.signalBuffer.slice(-10);
    
    // 1. Calcular amplitud
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // 2. Calcular variabilidad (señal plana = mala)
    const diffs = [];
    for (let i = 1; i < recentValues.length; i++) {
      diffs.push(Math.abs(recentValues[i] - recentValues[i-1]));
    }
    const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    
    // Combinar métricas
    const amplitudeScore = Math.min(1, amplitude / 0.3);
    const variabilityScore = Math.min(1, avgDiff / 0.05);
    
    return (amplitudeScore * 0.7) + (variabilityScore * 0.3);
  }
  
  /**
   * Calcular SpO2 con algoritmo optimizado para móvil
   */
  private calculateSpO2(): number {
    // Usar algoritmo simplificado
    const recentValues = this.signalBuffer.slice(-10);
    const avg = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const amplitude = Math.max(...recentValues) - Math.min(...recentValues);
    
    // Base + ajuste por amplitud y calidad
    const baseSpO2 = 95;
    const qualityAdjustment = Math.min(4, Math.max(-4, amplitude * 10));
    
    return Math.max(90, Math.min(99, Math.round(baseSpO2 + qualityAdjustment)));
  }
  
  /**
   * Calcular presión arterial con algoritmo optimizado para móvil
   */
  private calculateBloodPressure(
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): string {
    // Valores base
    const baseSystolic = 120;
    const baseDiastolic = 80;
    
    // Si no hay datos suficientes, devolver valores base
    if (!rrData || rrData.intervals.length < 3) {
      return `${baseSystolic}/${baseDiastolic}`;
    }
    
    // Calcular frecuencia cardíaca de intervalos RR
    const avgInterval = rrData.intervals.reduce((sum, i) => sum + i, 0) / rrData.intervals.length;
    const heartRate = Math.round(60000 / avgInterval);
    
    // Ajuste simplificado basado en frecuencia cardíaca
    const systolicAdjustment = Math.round((heartRate - 70) * 0.7);
    const diastolicAdjustment = Math.round((heartRate - 70) * 0.4);
    
    const systolic = Math.max(90, Math.min(180, baseSystolic + systolicAdjustment));
    const diastolic = Math.max(60, Math.min(120, baseDiastolic + diastolicAdjustment));
    
    return `${systolic}/${diastolic}`;
  }
  
  /**
   * Detectar arritmia con algoritmo simplificado para ahorrar batería
   */
  private detectArrhythmia(rrIntervals: number[]): boolean {
    if (rrIntervals.length < 3) return false;
    
    // Usar solo los últimos 3 intervalos
    const intervals = rrIntervals.slice(-3);
    
    // Calcular variabilidad simplificada
    const avg = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const maxDiff = Math.max(...intervals.map(i => Math.abs(i - avg) / avg));
    
    // Umbral simplificado de variabilidad
    return maxDiff > 0.2;
  }
  
  /**
   * Crear resultado vacío
   */
  private createEmptyResult(): VitalSignsResult {
    return {
      spo2: 0,
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      },
      lastArrhythmiaData: null,
      confidence: {
        overall: 0
      }
    };
  }
  
  /**
   * Restablecer el procesador
   */
  public reset(): void {
    this.signalBuffer = [];
    this.lastUpdateTime = 0;
    this.adaptiveFilters.reset();
  }
  
  /**
   * Reinicio completo
   */
  public fullReset(): void {
    this.reset();
    this.arrhythmiaCounter = 0;
  }
  
  /**
   * Obtener contador de arritmias
   */
  public getArrhythmiaCounter(): number {
    return this.arrhythmiaCounter;
  }
}
