
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { calculateAC, calculateDC } from '../../../modules/vital-signs/spo2-processor';

/**
 * Canal especializado para procesamiento de señales de SpO2
 */
export class SpO2Channel extends SpecializedChannel {
  // Configuración específica para SpO2
  private amplificationFactor: number = 1.5;
  private filterStrength: number = 0.4;
  private lowPass: number[] = [];
  
  constructor(config?: ChannelConfig) {
    super(VitalSignType.SPO2, config);
    
    // Aplicar configuración específica
    if (config) {
      this.amplificationFactor = config.initialAmplification || this.amplificationFactor;
      this.filterStrength = config.initialFilterStrength || this.filterStrength;
    }
  }
  
  /**
   * Procesa un valor y calcula directamente SpO2
   */
  public process(values: number[]): number {
    if (values.length < 30) {
      return 0;
    }
    
    // Calcular componentes AC y DC
    const ac = calculateAC(values);
    const dc = calculateDC(values);
    
    // Evitar división por cero
    if (dc === 0) {
      return 0;
    }
    
    // Calcular índice de perfusión
    const perfusionIndex = ac / dc;
    
    // Umbral mínimo para índice de perfusión
    if (perfusionIndex < 0.06) {
      return 0;
    }
    
    // Calcular SpO2 basado en la relación AC/DC
    const R = (ac / dc);
    
    // Fórmula de conversión
    let spo2 = Math.round(98 - (15 * R));
    
    // Ajuste basado en la calidad de perfusión
    if (perfusionIndex > 0.15) {
      spo2 = Math.min(98, spo2 + 1);
    } else if (perfusionIndex < 0.08) {
      spo2 = Math.max(0, spo2 - 1);
    }
    
    // Limitar valores
    spo2 = Math.min(98, spo2);
    spo2 = Math.max(94, spo2);
    
    // Actualizar calidad basado en índice de perfusión
    this.quality = Math.min(1, perfusionIndex * 10);
    
    return spo2;
  }
  
  /**
   * Implementación de optimización específica para este canal
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Aplicar filtrado específico para SpO2
    
    // Filtro pasa-bajos simple para suavizar la señal
    let filtered = value;
    
    if (this.lowPass.length > 0) {
      // Media móvil ponderada
      const lastFiltered = this.lowPass[this.lowPass.length - 1];
      filtered = lastFiltered * (1 - this.filterStrength) + value * this.filterStrength;
    }
    
    this.lowPass.push(filtered);
    if (this.lowPass.length > 10) {
      this.lowPass.shift();
    }
    
    // Amplificar la señal para enfatizar cambios
    const amplified = filtered * this.amplificationFactor;
    
    return amplified;
  }
  
  /**
   * Aplica retroalimentación para ajustar parámetros
   */
  public override applyFeedback(feedback: ChannelFeedback): void {
    super.applyFeedback(feedback);
    
    // Ajustes específicos para SpO2
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this.amplificationFactor = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
    }
  }
  
  /**
   * Reinicia el canal
   */
  public override reset(): void {
    super.reset();
    this.lowPass = [];
  }
}
