
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Canal especializado base para procesamiento de señales
 * Define la interfaz común para todos los canales de procesamiento
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';

/**
 * Channel configuration interface
 */
export interface ChannelConfig {
  initialAmplification?: number;
  initialFilterStrength?: number;
  frequencyBandMin?: number;
  frequencyBandMax?: number;
}

/**
 * Clase base para canales de procesamiento especializados
 */
export abstract class SpecializedChannel {
  protected id: string;
  protected type: VitalSignType;
  protected quality: number = 0;
  protected recentValues: number[] = [];
  
  constructor(type: VitalSignType, config?: ChannelConfig) {
    this.type = type;
    this.id = `channel-${type}-${Date.now()}`;
  }
  
  /**
   * Obtiene el ID único del canal
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Obtiene el tipo de canal
   */
  public getType(): VitalSignType {
    return this.type;
  }
  
  /**
   * Obtiene la calidad de señal actual (0-1)
   */
  public getQuality(): number {
    return this.quality;
  }

  /**
   * Updates the quality value
   * Made protected to allow subclasses to access it
   */
  protected updateQuality(value: number): void {
    this.quality = Math.max(0, Math.min(1, value));
  }

  /**
   * Process a value through this channel
   */
  public processValue(value: number): number {
    // Store recent values
    this.recentValues.push(value);
    if (this.recentValues.length > 50) {
      this.recentValues.shift();
    }
    
    // Apply channel-specific optimization
    return this.applyChannelSpecificOptimization(value);
  }
  
  /**
   * Apply channel-specific optimization to the signal
   * Must be implemented by each specialized channel
   */
  protected abstract applyChannelSpecificOptimization(value: number): number;
  
  /**
   * Aplica retroalimentación al canal
   * Implementation required in all derived classes
   */
  public applyFeedback(feedback: ChannelFeedback): void {
    // Base implementation - update quality if provided
    if (feedback.signalQuality !== undefined) {
      this.updateQuality(feedback.signalQuality);
    }
  }
  
  /**
   * Reinicia el canal
   */
  public reset(): void {
    this.quality = 0;
    this.recentValues = [];
  }

  /**
   * Get diagnostics data
   */
  public getDiagnostics(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      quality: this.quality,
      valuesCount: this.recentValues.length
    };
  }
}

