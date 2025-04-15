
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador unificado de señales
 * Simplifica la interacción con múltiples procesadores especializados
 */

import { ProcessedSignalResult, SignalProcessingOptions } from '../../types/signal-processing';

/**
 * Procesador de señales unificado
 * Realiza operaciones básicas de procesamiento de señal sin simulación
 */
export class UnifiedSignalProcessor {
  private signalBuffer: number[] = [];
  private readonly MAX_BUFFER_SIZE = 50;
  
  constructor() {
    // Inicialización sencilla
  }
  
  /**
   * Procesa un valor PPG crudo
   * Sin simulación o generación artificial de señales
   */
  public processSignal(value: number): ProcessedSignalResult {
    // Agregar valor al buffer
    this.signalBuffer.push(value);
    
    // Mantener tamaño de buffer limitado
    if (this.signalBuffer.length > this.MAX_BUFFER_SIZE) {
      this.signalBuffer.shift();
    }
    
    // Detectar dedo basado en la amplitud de la señal
    const fingerDetected = this.detectFinger();
    
    // Calcular calidad de señal
    const quality = this.calculateSignalQuality();
    
    // Filtrar la señal
    const filteredValue = this.filterSignal(value);
    
    // Normalizar y amplificar
    const normalizedValue = this.normalizeSignal(filteredValue);
    const amplifiedValue = this.amplifySignal(normalizedValue);
    
    // Generar resultado sin simulación de datos
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
   * Detecta si hay un dedo presente basado en la amplitud de la señal
   * Sin simulación
   */
  private detectFinger(): boolean {
    if (this.signalBuffer.length < 5) {
      return false;
    }
    
    const recentValues = this.signalBuffer.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Si la amplitud es mayor que un umbral, probablemente hay un dedo
    return amplitude > 0.1;
  }
  
  /**
   * Calcula la calidad de la señal basada en su estabilidad y amplitud
   * Sin simulación
   */
  private calculateSignalQuality(): number {
    if (this.signalBuffer.length < 10) {
      return 0;
    }
    
    const recentValues = this.signalBuffer.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const amplitude = max - min;
    
    // Calcular calidad basada en amplitud (sin simulación)
    let quality = Math.min(100, Math.max(0, amplitude * 500));
    
    // Ajustar calidad basada en estabilidad
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentValues.length;
    
    // Menor varianza significa mayor estabilidad
    const stabilityFactor = Math.max(0, 1 - variance * 20);
    quality *= stabilityFactor;
    
    return quality;
  }
  
  /**
   * Filtra la señal usando una media móvil simple
   * Sin simulación
   */
  private filterSignal(value: number): number {
    if (this.signalBuffer.length < 3) {
      return value;
    }
    
    // Aplicar filtro de media móvil simple
    const windowSize = Math.min(5, this.signalBuffer.length);
    const recentValues = this.signalBuffer.slice(-windowSize);
    const sum = recentValues.reduce((acc, val) => acc + val, 0);
    
    return sum / windowSize;
  }
  
  /**
   * Normaliza la señal al rango 0-1
   * Sin simulación
   */
  private normalizeSignal(value: number): number {
    if (this.signalBuffer.length < 5) {
      return value;
    }
    
    const recentValues = this.signalBuffer.slice(-10);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    
    if (max === min) {
      return 0.5; // Valor medio si no hay variación
    }
    
    return (value - min) / (max - min);
  }
  
  /**
   * Amplifica la señal para aumentar la sensibilidad
   * Sin simulación
   */
  private amplifySignal(normalizedValue: number): number {
    // Amplificación lineal básica centrada en 0.5
    return (normalizedValue - 0.5) * 2;
  }
  
  /**
   * Configura opciones del procesador
   */
  public configure(options: SignalProcessingOptions): void {
    // Implementación sencilla para configurar el procesador
  }
  
  /**
   * Reinicia el procesador
   */
  public reset(): void {
    this.signalBuffer = [];
  }
}
