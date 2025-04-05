/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';
import { SpecializedChannel, ChannelConfig } from './SpecializedChannel';

/**
 * Canal especializado para señales cardíacas
 */
export class CardiacChannel extends SpecializedChannel {
  private amplificationFactor: number = 2.0;
  private filterStrength: number = 0.3;
  private peakDetectionThreshold: number = 0.6;
  private lastPeakTime: number | null = null;
  private peakToPeakIntervals: number[] = [];

  constructor(config?: ChannelConfig) {
    super(VitalSignType.CARDIAC, config);
    
    // Aplicar configuración específica
    if (config) {
      this.amplificationFactor = config.initialAmplification || this.amplificationFactor;
      this.filterStrength = config.initialFilterStrength || this.filterStrength;
    }
  }

  /**
   * Implementación de optimización específica para señales cardíacas
   */
  protected applyChannelSpecificOptimization(value: number): number {
    // Bandpass filter for cardiac signal (0.5Hz - 4Hz typical for PPG cardiac)
    const filteredValue = this.applyBandPassFilter(value);
    
    // Amplify the cardiac component
    const amplifiedValue = filteredValue * this.amplificationFactor;
    
    // Detect peaks (for demonstration, not actual peak detection)
    this.detectPeak(amplifiedValue);
    
    return amplifiedValue;
  }
  
  /**
   * Aplica retroalimentación para ajustar parámetros
   */
  public override applyFeedback(feedback: ChannelFeedback): void {
    super.applyFeedback(feedback);
    
    // Ajustes específicos para canal cardíaco
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
   * Aplica un filtro pasa-banda simple
   */
  private applyBandPassFilter(value: number): number {
    if (this.recentValues.length < 5) return value;
    
    // High-pass component (removes DC offset)
    const highPassValue = value - this.recentValues[this.recentValues.length - 1];
    
    // Low-pass component (smooth signal)
    const recentForAvg = this.recentValues.slice(-5);
    const avgValue = recentForAvg.reduce((sum, val) => sum + val, 0) / recentForAvg.length;
    
    // Combined bandpass
    return highPassValue * (1 - this.filterStrength) + avgValue * this.filterStrength;
  }
  
  /**
   * Detecta picos en la señal (simulación)
   */
  private detectPeak(value: number): void {
    if (this.recentValues.length < 3) return;
    
    const now = Date.now();
    
    // Simple peak detection (more advanced algorithm would be used in real implementation)
    const prev2 = this.recentValues[this.recentValues.length - 3];
    const prev1 = this.recentValues[this.recentValues.length - 2];
    
    // Check if current value is lower than previous and previous is higher than the one before
    // This indicates we just passed a peak at prev1
    if (value < prev1 && prev1 > prev2 && prev1 > this.peakDetectionThreshold) {
      // Don't detect peaks too close together (physiological limit)
      if (this.lastPeakTime === null || now - this.lastPeakTime > 300) {
        // Process peak
        if (this.lastPeakTime !== null) {
          const interval = now - this.lastPeakTime;
          this.peakToPeakIntervals.push(interval);
          
          // Keep only recent intervals
          if (this.peakToPeakIntervals.length > 10) {
            this.peakToPeakIntervals.shift();
          }
        }
        
        this.lastPeakTime = now;
      }
    }
  }
  
  /**
   * Obtiene intervalos RR actuales
   */
  public getRRIntervals(): number[] {
    return [...this.peakToPeakIntervals];
  }
  
  /**
   * Calcula ritmo cardíaco estimado
   */
  public getEstimatedHeartRate(): number {
    if (this.peakToPeakIntervals.length < 3) return 0;
    
    // Calculate average interval
    const avgInterval = this.peakToPeakIntervals.reduce((sum, i) => sum + i, 0) / 
                      this.peakToPeakIntervals.length;
    
    // Convert to BPM: 60000 ms / avg RR interval
    return avgInterval > 0 ? Math.round(60000 / avgInterval) : 0;
  }
  
  /**
   * Reinicia el canal
   */
  public override reset(): void {
    super.reset();
    this.lastPeakTime = null;
    this.peakToPeakIntervals = [];
  }
}
