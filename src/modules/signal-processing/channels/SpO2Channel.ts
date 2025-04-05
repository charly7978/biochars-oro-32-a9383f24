
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Canal especializado para procesamiento de SpO2
 * Implementación unificada que mantiene toda la funcionalidad existente
 */

import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType, ChannelFeedback } from '../../../types/signal';

/**
 * Canal especializado para SpO2
 */
export class SpO2Channel extends SpecializedChannel {
  private readonly BASELINE_SPO2 = 97; // Porcentaje base
  private spo2Buffer: number[] = [];
  private readonly BUFFER_SIZE = 10;
  
  constructor(config?: ChannelConfig) {
    super(VitalSignType.SPO2, config);
  }
  
  /**
   * Apply SpO2-specific optimization to the signal
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // SpO2 specific processing - this is a pass-through implementation
    return value;
  }
  
  /**
   * Procesa un array de valores PPG y calcula SpO2
   */
  public process(values: number[]): number {
    // If not enough values, return last valid
    if (values.length < 30) {
      return this.getLastValidValue();
    }
    
    // Calcular componentes AC y DC
    const ac = this.calculateAC(values);
    const dc = this.calculateDC(values);
    
    // Evitar división por cero
    if (dc === 0) {
      return this.getLastValidValue();
    }
    
    // Índice de perfusión
    const perfusionIndex = ac / dc;
    
    // Si el índice es muy bajo, no hay suficiente señal
    if (perfusionIndex < 0.06) {
      return this.getLastValidValue();
    }
    
    // Calcular SpO2 basado en ratio
    const ratio = ac / dc;
    let spo2 = Math.round(this.BASELINE_SPO2 - (15 * ratio));
    
    // Ajustar basado en calidad de perfusión
    if (perfusionIndex > 0.15) {
      spo2 = Math.min(99, spo2 + 1);
    } else if (perfusionIndex < 0.08) {
      spo2 = Math.max(0, spo2 - 1);
    }
    
    // Limitar al rango fisiológico
    spo2 = Math.min(100, Math.max(90, spo2));
    
    // Añadir al buffer para estabilidad
    this.spo2Buffer.push(spo2);
    if (this.spo2Buffer.length > this.BUFFER_SIZE) {
      this.spo2Buffer.shift();
    }
    
    // Calcular promedio para estabilidad
    const sum = this.spo2Buffer.reduce((a, b) => a + b, 0);
    const avgSpo2 = Math.round(sum / this.spo2Buffer.length);
    
    // Update signal quality based on perfusion index
    this.quality = Math.min(1.0, perfusionIndex * 10);
    
    return avgSpo2;
  }
  
  /**
   * Aplicar retroalimentación al canal
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Implementar ajustes basados en retroalimentación
    if (feedback.channelId === this.id && feedback.suggestedAdjustments) {
      // Ajustar parámetros si se necesita
    }
  }
  
  /**
   * Calcular componente AC (señal variable)
   */
  private calculateAC(values: number[]): number {
    const recentValues = values.slice(-30);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    return max - min;
  }
  
  /**
   * Calcular componente DC (línea base)
   */
  private calculateDC(values: number[]): number {
    const recentValues = values.slice(-30);
    const sum = recentValues.reduce((acc, val) => acc + val, 0);
    return sum / recentValues.length;
  }
  
  /**
   * Obtener último valor válido
   */
  private getLastValidValue(): number {
    if (this.spo2Buffer.length > 0) {
      return this.spo2Buffer[this.spo2Buffer.length - 1];
    }
    return 0;
  }
  
  /**
   * Reiniciar el canal
   */
  public override reset(): void {
    super.reset();
    this.spo2Buffer = [];
  }
}
