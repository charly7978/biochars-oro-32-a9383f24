
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';
import { VitalSignType, ChannelFeedback } from '../../../types/signal';

interface SpO2ChannelConfig extends ChannelConfig {
  initialSaturation?: number;  // Initial SpO2 saturation percentage
  adaptationRate?: number;     // How quickly the channel adapts to signal changes
}

export class SpO2Channel extends SpecializedChannel {
  private amplificationFactor: number;
  private filterStrength: number;
  private saturationEstimate: number;
  private adaptationRate: number;
  private perfusionIndex: number;
  
  constructor(config?: SpO2ChannelConfig) {
    super(VitalSignType.SPO2, config);
    
    this.amplificationFactor = config?.initialAmplification || 1.5;
    this.filterStrength = config?.initialFilterStrength || 0.8;
    this.saturationEstimate = config?.initialSaturation || 97;
    this.adaptationRate = config?.adaptationRate || 0.05;
    this.perfusionIndex = 0;
  }
  
  protected override applyChannelSpecificOptimization(value: number): number {
    // Aplicar amplificación adaptativa para SpO2
    const amplifiedValue = value * this.amplificationFactor;
    
    // Filtrado simple basado en promedio móvil ponderado
    let filteredValue = amplifiedValue;
    if (this.recentValues.length > 3) {
      const recentAvg = (
        this.recentValues[this.recentValues.length - 2] * 0.7 + 
        this.recentValues[this.recentValues.length - 3] * 0.3
      );
      filteredValue = amplifiedValue * (1 - this.filterStrength) + recentAvg * this.filterStrength;
    }
    
    // Calcular índice de perfusión simplificado (proporción de componente pulsátil)
    if (this.recentValues.length > 10) {
      const min = Math.min(...this.recentValues.slice(-10));
      const max = Math.max(...this.recentValues.slice(-10));
      this.perfusionIndex = (max - min) / ((max + min) / 2 || 1);
    }
    
    // Ajustar calidad basada en la estabilidad reciente y perfusión
    const recentValuesStd = this.calculateStandardDeviation(this.recentValues.slice(-15));
    this.quality = Math.min(1, Math.max(0, 1 - recentValuesStd / 5)) * 
                   Math.min(1, this.perfusionIndex * 10);
    
    return filteredValue;
  }
  
  /**
   * Implementación de applyFeedback para SpO2Channel
   * Ajusta parámetros en función del feedback recibido
   */
  public override applyFeedback(feedback: ChannelFeedback): void {
    super.applyFeedback(feedback);
    
    // Aplica ajustes específicos para SpO2
    if (feedback.suggestedAdjustments) {
      if (feedback.suggestedAdjustments.amplificationFactor !== undefined) {
        this.amplificationFactor = feedback.suggestedAdjustments.amplificationFactor;
      }
      
      if (feedback.suggestedAdjustments.filterStrength !== undefined) {
        this.filterStrength = feedback.suggestedAdjustments.filterStrength;
      }
    }
    
    // Ajustar estimación de saturación si la calidad es buena
    if (feedback.success && feedback.signalQuality && feedback.signalQuality > 0.7) {
      // Podríamos recibir una estimación de SpO2 desde algoritmos externos
      // y ajustar gradualmente nuestra estimación interna
    }
  }
  
  /**
   * Obtiene la estimación actual de SpO2
   */
  public getSaturationEstimate(): number {
    // Un valor de SpO2 básico basado en la calidad de la señal
    // En una implementación real, se usarían algoritmos más sofisticados
    return Math.min(100, this.saturationEstimate);
  }
  
  /**
   * Obtiene el índice de perfusión actual
   */
  public getPerfusionIndex(): number {
    return this.perfusionIndex;
  }
  
  /**
   * Calcula la desviación estándar de un array de valores
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Reset the channel state
   */
  public override reset(): void {
    super.reset();
    this.perfusionIndex = 0;
    this.saturationEstimate = 97; // Default SpO2 estimate
  }
}
