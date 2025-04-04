
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador de señales unificado
 * Consolida la funcionalidad de múltiples procesadores mientras mantiene todas las características
 */

import { SignalProcessor, ProcessedSignalResult, SignalProcessingOptions } from '../../types/signal-processing';

/**
 * Implementación unificada del procesador de señales
 */
export class UnifiedSignalProcessor implements SignalProcessor<ProcessedSignalResult> {
  private values: number[] = [];
  private options: SignalProcessingOptions = {
    amplificationFactor: 1.2,
    filterStrength: 0.5,
    qualityThreshold: 0.3,
    fingerDetectionSensitivity: 0.5,
    useAdaptiveControl: true,
    qualityEnhancedByPrediction: true,
    predictionHorizon: 5,
    adaptationRate: 0.1
  };

  /**
   * Procesa un valor de señal y devuelve el resultado procesado
   */
  public processSignal(value: number): ProcessedSignalResult {
    // Guardar valor en el buffer
    this.values.push(value);
    if (this.values.length > 100) {
      this.values.shift();
    }

    // Aplicar filtros y procesamiento
    const filteredValue = this.applyFilter(value);
    const normalizedValue = this.normalizeValue(filteredValue);
    const amplifiedValue = normalizedValue * (this.options.amplificationFactor || 1);
    
    // Calcular calidad y detección
    const quality = this.calculateQuality(amplifiedValue);
    const fingerDetected = quality > (this.options.qualityThreshold || 0.3) * 100;
    
    // Crear resultado
    return {
      timestamp: Date.now(),
      rawValue: value,
      filteredValue,
      normalizedValue,
      amplifiedValue,
      quality,
      fingerDetected,
      signalStrength: Math.abs(amplifiedValue)
    };
  }

  /**
   * Configura las opciones del procesador
   */
  public configure(options: SignalProcessingOptions): void {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * Reinicia el procesador
   */
  public reset(): void {
    this.values = [];
  }

  /**
   * Aplica filtros a la señal
   */
  private applyFilter(value: number): number {
    if (this.values.length < 3) {
      return value;
    }
    
    // Aplicar filtro de media móvil
    const windowSize = Math.max(3, Math.floor(5 * (this.options.filterStrength || 0.5)));
    const recentValues = this.values.slice(-windowSize);
    const sum = recentValues.reduce((acc, val) => acc + val, 0);
    
    return sum / recentValues.length;
  }

  /**
   * Normaliza el valor en un rango apropiado
   */
  private normalizeValue(value: number): number {
    if (this.values.length < 5) {
      return value;
    }
    
    const recentValues = this.values.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const range = max - min || 1;
    
    return (value - min) / range;
  }

  /**
   * Calcula la calidad de la señal (0-100)
   */
  private calculateQuality(value: number): number {
    if (this.values.length < 5) {
      return 0;
    }
    
    const recentValues = this.values.slice(-10);
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentValues.length;
    
    // Mayor varianza indica menor calidad
    const varianceQuality = Math.max(0, 100 - Math.sqrt(variance) * 200);
    
    // Amplitud como medida de calidad
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitudeQuality = Math.min(100, (max - min) * 200);
    
    // Calidad combinada
    return Math.min(100, Math.max(0, (varianceQuality * 0.7 + amplitudeQuality * 0.3)));
  }
}
