
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Canal especializado para procesamiento de señal de hidratación
 * Optimiza la señal para algoritmos de medición de hidratación
 * Se enfoca en la perfusión tisular y componentes de conductancia
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType } from '../../../types/signal';

/**
 * Implementación de canal específico para hidratación
 */
export class HydrationChannel extends SpecializedChannel {
  // Parámetros específicos para hidratación
  private readonly PERFUSION_EMPHASIS = 1.25;    // Énfasis en perfusión tisular
  private readonly SLOW_COMPONENT_WEIGHT = 0.65; // Peso para componentes lentos (DC)
  private readonly FAST_COMPONENT_WEIGHT = 0.35; // Peso para componentes rápidos (AC)
  
  // Buffers para análisis espectral
  private temporalBuffer: number[] = [];
  private readonly TEMPORAL_BUFFER_SIZE = 128; // Potencia de 2 para análisis FFT
  
  // Buffers para componentes lentos y rápidos
  private slowComponentBuffer: number[] = [];
  private fastComponentBuffer: number[] = [];
  private readonly COMPONENT_BUFFER_SIZE = 32;
  
  constructor(config: ChannelConfig) {
    super(VitalSignType.HYDRATION, config);
  }
  
  /**
   * Aplica optimización específica para hidratación a la señal
   * - Enfatiza componentes relacionados con la perfusión tisular
   * - Separa componentes lentos (DC) que correlacionan con nivel de hidratación
   * - Preserva componentes rápidos (AC) para análisis de pulsatilidad
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Actualizar buffer temporal
    this.updateTemporalBuffer(value);
    
    // Separar componentes lentos y rápidos
    this.separateComponents(value);
    
    // Calcular línea base (componente DC)
    const baseline = this.calculateBaseline();
    
    // Calcular componente de perfusión (indicador primario de hidratación)
    const perfusionComponent = this.calculatePerfusionComponent(value, baseline);
    
    // Calcular componente de conductancia (indicador secundario)
    const conductanceComponent = this.calculateConductanceComponent(value, baseline);
    
    // Combinar componentes con ponderación para optimizar la señal para hidratación
    const optimizedValue = baseline + 
                          (perfusionComponent * this.SLOW_COMPONENT_WEIGHT) +
                          (conductanceComponent * this.FAST_COMPONENT_WEIGHT);
    
    // Aplicar énfasis en perfusión
    return optimizedValue * this.PERFUSION_EMPHASIS;
  }
  
  /**
   * Actualiza el buffer temporal para análisis
   */
  private updateTemporalBuffer(value: number): void {
    this.temporalBuffer.push(value);
    
    if (this.temporalBuffer.length > this.TEMPORAL_BUFFER_SIZE) {
      this.temporalBuffer.shift();
    }
  }
  
  /**
   * Separa componentes lentos y rápidos de la señal
   * - Componentes lentos: relacionados con cambios en hidratación
   * - Componentes rápidos: relacionados con pulso y perfusión
   */
  private separateComponents(value: number): void {
    // Filtro simple paso bajo para componentes lentos (DC)
    const alpha = 0.1; // Factor de suavizado
    const lastSlowComponent = this.slowComponentBuffer.length > 0 ? 
                            this.slowComponentBuffer[this.slowComponentBuffer.length - 1] : 
                            value;
    
    const slowComponent = (alpha * value) + ((1 - alpha) * lastSlowComponent);
    
    // Componente rápido es la diferencia entre valor actual y componente lento
    const fastComponent = value - slowComponent;
    
    // Actualizar buffers
    this.slowComponentBuffer.push(slowComponent);
    this.fastComponentBuffer.push(fastComponent);
    
    // Mantener tamaño de buffer
    if (this.slowComponentBuffer.length > this.COMPONENT_BUFFER_SIZE) {
      this.slowComponentBuffer.shift();
    }
    
    if (this.fastComponentBuffer.length > this.COMPONENT_BUFFER_SIZE) {
      this.fastComponentBuffer.shift();
    }
  }
  
  /**
   * Calcula la línea base (componente DC)
   */
  private calculateBaseline(): number {
    if (this.slowComponentBuffer.length < 5) {
      return 0;
    }
    
    // Media ponderada para línea base
    const weights = this.slowComponentBuffer.map((_, i, arr) => (i + 1) / arr.length);
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    
    return this.slowComponentBuffer.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;
  }
  
  /**
   * Calcula componente de perfusión relevante para hidratación
   * La perfusión tisular es un fuerte indicador del estado de hidratación
   */
  private calculatePerfusionComponent(value: number, baseline: number): number {
    if (this.fastComponentBuffer.length < 10) {
      return value - baseline;
    }
    
    // Calcular amplitud de pulsatilidad (indicador de perfusión)
    const pulsatilityValues = this.fastComponentBuffer.slice(-10);
    const minVal = Math.min(...pulsatilityValues);
    const maxVal = Math.max(...pulsatilityValues);
    const pulsatilityAmplitude = maxVal - minVal;
    
    // Factor de perfusión basado en amplitud y valor actual
    const perfusionFactor = 1.0 + (pulsatilityAmplitude * 5.0);
    
    // Aplicar factor de perfusión al componente
    return (value - baseline) * perfusionFactor;
  }
  
  /**
   * Calcula componente de conductancia correlacionado con hidratación
   * La conductancia eléctrica del tejido varía con la hidratación
   */
  private calculateConductanceComponent(value: number, baseline: number): number {
    if (this.temporalBuffer.length < 10) {
      return value - baseline;
    }
    
    // Análisis de variabilidad (correlaciona con conductancia tisular)
    const recentValues = this.temporalBuffer.slice(-15);
    let variabilitySum = 0;
    
    for (let i = 1; i < recentValues.length; i++) {
      variabilitySum += Math.abs(recentValues[i] - recentValues[i-1]);
    }
    
    const averageVariability = variabilitySum / (recentValues.length - 1);
    
    // La conductancia influye en la propagación de la señal
    // En tejidos bien hidratados, la señal se propaga mejor (mayor variabilidad)
    const conductanceFactor = 1.0 + (averageVariability * 4.0);
    
    // Retornar componente ajustado por conductancia
    return (value - baseline) * conductanceFactor;
  }
  
  /**
   * Reiniciar canal
   */
  public override reset(): void {
    super.reset();
    this.temporalBuffer = [];
    this.slowComponentBuffer = [];
    this.fastComponentBuffer = [];
  }
}
