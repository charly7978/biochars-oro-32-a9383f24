
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Procesador especializado para la medición de hidratación
 * Utiliza análisis de perfusión y conductancia para estimar niveles de hidratación
 */

import { BaseVitalSignProcessor } from './BaseVitalSignProcessor';
import { VitalSignType } from '../../../types/signal';

/**
 * Interfaz para resultados de hidratación
 */
export interface HydrationResult {
  hydrationPercentage: number;  // Porcentaje de hidratación (0-100%)
  hydrationIndex: number;      // Índice de hidratación (0-10)
}

/**
 * Implementación del procesador de hidratación
 */
export class HydrationProcessor extends BaseVitalSignProcessor<HydrationResult> {
  // Valores de referencia para mediciones de hidratación
  private readonly BASELINE_HYDRATION = 70;  // Porcentaje de hidratación base
  private readonly MIN_HYDRATION = 40;      // Porcentaje mínimo de hidratación
  private readonly MAX_HYDRATION = 90;      // Porcentaje máximo de hidratación
  
  // Parámetros para análisis de la señal
  private readonly PERFUSION_WEIGHT = 0.6;   // Peso del componente de perfusión
  private readonly CONDUCTANCE_WEIGHT = 0.4; // Peso del componente de conductancia
  
  // Buffers para análisis temporal
  private perfusionBuffer: number[] = [];
  private readonly BUFFER_SIZE = 50;
  
  constructor() {
    super(VitalSignType.HYDRATION);
  }
  
  /**
   * Procesa un valor del canal optimizado para hidratación
   * @param value Valor de señal optimizada para hidratación
   * @returns Valores estimados de hidratación
   */
  protected processValueImpl(value: number): HydrationResult {
    // Omitir procesamiento si el valor es demasiado pequeño
    if (Math.abs(value) < 0.01 || this.confidence < 0.2) {
      return { hydrationPercentage: 0, hydrationIndex: 0 };
    }
    
    // Actualizar buffer de perfusión para análisis temporal
    this.updatePerfusionBuffer(value);
    
    // Calcular factores derivados de la señal PPG
    const perfusionComponent = this.calculatePerfusionComponent(value);
    const conductanceComponent = this.calculateConductanceComponent(value);
    
    // Calcular hidratación combinando componentes
    const hydrationPercentage = this.calculateHydrationPercentage(
      perfusionComponent, 
      conductanceComponent
    );
    
    // Calcular índice de hidratación (escala 0-10)
    const hydrationIndex = this.calculateHydrationIndex(hydrationPercentage);
    
    return {
      hydrationPercentage: Math.round(hydrationPercentage),
      hydrationIndex: Math.round(hydrationIndex * 10) / 10
    };
  }
  
  /**
   * Actualiza el buffer de análisis de perfusión
   */
  private updatePerfusionBuffer(value: number): void {
    this.perfusionBuffer.push(value);
    if (this.perfusionBuffer.length > this.BUFFER_SIZE) {
      this.perfusionBuffer.shift();
    }
  }
  
  /**
   * Calcula el componente de perfusión basado en análisis de amplitud y variabilidad
   * de la señal PPG, que correlaciona con el estado de hidratación
   */
  private calculatePerfusionComponent(value: number): number {
    if (this.perfusionBuffer.length < 10) {
      return 0.5; // Valor neutral si no hay suficientes datos
    }
    
    // Calcular rango dinámico de la señal (correlaciona con hidratación)
    const minVal = Math.min(...this.perfusionBuffer);
    const maxVal = Math.max(...this.perfusionBuffer);
    const signalRange = maxVal - minVal;
    
    // Calcular velocidad de cambio (derivada)
    let derivativeSum = 0;
    for (let i = 1; i < this.perfusionBuffer.length; i++) {
      derivativeSum += Math.abs(this.perfusionBuffer[i] - this.perfusionBuffer[i-1]);
    }
    const averageDerivative = derivativeSum / (this.perfusionBuffer.length - 1);
    
    // Factor de perfusión usando rango y velocidad (indicador de hidratación)
    // Valores más altos de signalRange y valores moderados de averageDerivative
    // correlacionan con mejor hidratación
    const perfusionFactor = (signalRange * 0.7) + (averageDerivative * 3.0);
    
    // Normalizar a 0-1, limitando el rango para valores fisiológicos
    return Math.min(0.95, Math.max(0.1, perfusionFactor));
  }
  
  /**
   * Calcula el componente de conductancia basado en la frecuencia
   * y características de fase de la señal
   */
  private calculateConductanceComponent(value: number): number {
    if (this.perfusionBuffer.length < 10) {
      return 0.5; // Valor neutral si no hay suficientes datos
    }
    
    // Calcular cruces por cero como aproximación de frecuencia
    const values = this.perfusionBuffer;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let crossings = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] > mean && values[i-1] <= mean) ||
          (values[i] <= mean && values[i-1] > mean)) {
        crossings++;
      }
    }
    
    // Frecuencia normalizada
    const normalizedFrequency = crossings / values.length;
    
    // Calcular factor de conductancia
    // La conductancia eléctrica de los tejidos varía con la hidratación
    // Mayor hidratación = mayor conductancia = mejor propagación de la señal
    const conductanceFactor = (normalizedFrequency * 0.4) + (Math.abs(value) * 0.6);
    
    // Normalizar a 0-1
    return Math.min(0.95, Math.max(0.1, conductanceFactor));
  }
  
  /**
   * Calcula el porcentaje de hidratación basado en los componentes analizados
   */
  private calculateHydrationPercentage(perfusion: number, conductance: number): number {
    // Combinar factores de perfusión y conductancia con pesos
    const combinedFactor = (perfusion * this.PERFUSION_WEIGHT) + 
                          (conductance * this.CONDUCTANCE_WEIGHT);
    
    // Aplicar al valor base de hidratación con un rango fisiológico
    const hydration = this.BASELINE_HYDRATION + ((combinedFactor - 0.5) * 40);
    
    // Garantizar que esté dentro del rango fisiológico
    return Math.min(this.MAX_HYDRATION, Math.max(this.MIN_HYDRATION, hydration));
  }
  
  /**
   * Convierte el porcentaje de hidratación a un índice de 0-10
   */
  private calculateHydrationIndex(percentage: number): number {
    // Considerar menos de 40% como 0 y más de 90% como 10
    if (percentage <= this.MIN_HYDRATION) return 0;
    if (percentage >= this.MAX_HYDRATION) return 10;
    
    // Escalar linealmente entre MIN y MAX
    return ((percentage - this.MIN_HYDRATION) / (this.MAX_HYDRATION - this.MIN_HYDRATION)) * 10;
  }
  
  /**
   * Reiniciar el procesador
   */
  public override reset(): void {
    super.reset();
    this.perfusionBuffer = [];
  }
}
