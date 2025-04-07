
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Canal especializado base para procesamiento de señales
 * Define la interfaz común para todos los canales de procesamiento
 */

import { VitalSignType, ChannelFeedback } from '../../../types/signal';

/**
 * Clase base para canales de procesamiento especializados
 */
export abstract class SpecializedChannel {
  protected id: string;
  protected type: VitalSignType;
  protected quality: number = 0;
  
  constructor(type: VitalSignType) {
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
   * Aplica retroalimentación al canal
   */
  public abstract applyFeedback(feedback: ChannelFeedback): void;
  
  /**
   * Reinicia el canal
   */
  public reset(): void {
    this.quality = 0;
  }
}
