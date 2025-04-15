
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';

/**
 * Canal especializado para presión arterial
 */
export class BloodPressureChannel extends SpecializedChannel {
  private amplificationFactor: number = 1.2;
  private filterStrength: number = 0.25;
  private baselineCorrection: number = 0.5;

  constructor(config?: ChannelConfig) {
    super(VitalSignType.BLOOD_PRESSURE, config);
    
    // Aplicar configuración si se proporciona
    if (config) {
      this.amplificationFactor = config.initialAmplification || this.amplificationFactor;
      this.filterStrength = config.initialFilterStrength || this.filterStrength;
    }
  }

  /**
   * Implementación específica para canal de presión arterial
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Simulación de procesamiento específico para presión arterial
    const filteredValue = this.applyFilter(value);
    const correctedValue = this.applyBaselineCorrection(filteredValue);
    const amplifiedValue = correctedValue * this.amplificationFactor;
    
    return amplifiedValue;
  }
  
  /**
   * Aplica retroalimentación para ajustar el canal
   */
  public override applyFeedback(feedback: ChannelFeedback): void {
    super.applyFeedback(feedback);
    
    if (feedback.suggestedAdjustments) {
      // Actualizar factores específicos
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this.amplificationFactor = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
      
      if (feedback.suggestedAdjustments.baselineCorrection !== undefined) {
        this.baselineCorrection = feedback.suggestedAdjustments.baselineCorrection;
      }
    }
  }

  /**
   * Aplicar filtrado específico
   */
  private applyFilter(value: number): number {
    if (this.recentValues.length < 3) return value;
    
    // Filtro simple para este ejemplo
    const lastValues = this.recentValues.slice(-3);
    const sum = lastValues.reduce((total, val) => total + val, 0);
    const avg = sum / lastValues.length;
    
    // Mezclar valor actual con promedio usando filterStrength
    return value * (1 - this.filterStrength) + avg * this.filterStrength;
  }
  
  /**
   * Aplicar corrección de línea base
   */
  private applyBaselineCorrection(value: number): number {
    if (this.recentValues.length < 10) return value;
    
    // Calcular línea base como promedio
    const baselineValues = this.recentValues.slice(-10);
    const baseline = baselineValues.reduce((sum, val) => sum + val, 0) / baselineValues.length;
    
    // Aplicar corrección
    return value - (baseline * this.baselineCorrection);
  }
}
