
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';

/**
 * Canal especializado para procesamiento de glucosa
 */
export class GlucoseChannel extends SpecializedChannel {
  private amplificationFactor: number = 1.0;
  private filterStrength: number = 0.15;
  
  constructor(config?: ChannelConfig) {
    super(VitalSignType.GLUCOSE, config);
    
    // Aplicar configuración si está disponible
    if (config) {
      this.amplificationFactor = config.initialAmplification || this.amplificationFactor;
      this.filterStrength = config.initialFilterStrength || this.filterStrength;
    }
  }
  
  /**
   * Optimización específica para glucosa
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Filtrado específico para extracción de componentes de glucosa
    const filteredValue = this.applySpecializedFilter(value);
    
    // Amplificar señal
    return filteredValue * this.amplificationFactor;
  }

  /**
   * Aplica filtrado especializado para componentes de glucosa
   */
  private applySpecializedFilter(value: number): number {
    if (this.recentValues.length < 10) return value;
    
    // Aplicar filtrado simple para este ejemplo
    const recentValues = this.recentValues.slice(-10);
    const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Mezcla con valor actual usando intensidad de filtro
    return value * (1 - this.filterStrength) + avg * this.filterStrength;
  }
  
  /**
   * Implementación de retroalimentación para canal de glucosa
   */
  public override applyFeedback(feedback: ChannelFeedback): void {
    super.applyFeedback(feedback);
    
    // Ajustes específicos para este canal
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this.amplificationFactor = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
    }
  }
}
