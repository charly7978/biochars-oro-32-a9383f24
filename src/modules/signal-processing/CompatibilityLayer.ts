
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Capa de compatibilidad para la transición al sistema unificado
 * Permite que el código existente siga funcionando con la nueva implementación
 */

import { UnifiedVitalSignsProcessor } from './UnifiedVitalSignsProcessor';
import { VitalSignsProcessor as LegacyVitalSignsProcessor } from '../vital-signs/VitalSignsProcessor';
import { UnifiedVitalSignsResult } from '../../types/signal-processing';

/**
 * Adaptador para mantener compatibilidad con VitalSignsProcessor original
 */
export class VitalSignsProcessorAdapter extends LegacyVitalSignsProcessor {
  private unifiedProcessor: UnifiedVitalSignsProcessor;
  
  constructor() {
    super();
    this.unifiedProcessor = new UnifiedVitalSignsProcessor();
    console.log("VitalSignsProcessorAdapter: Created with unified backend");
  }
  
  /**
   * Procesa la señal usando el procesador unificado pero manteniendo la interfaz original
   */
  public override processSignal(data: {
    value: number, 
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  }): UnifiedVitalSignsResult {
    return this.unifiedProcessor.processSignal(data.value, data.rrData);
  }
  
  /**
   * Procesa con nueva interfaz pero mantiene compatibilidad
   */
  public override process(
    ppgValue: number,
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): UnifiedVitalSignsResult {
    return this.unifiedProcessor.processSignal(ppgValue, rrData);
  }
  
  /**
   * Reinicio con compatibilidad
   */
  public override reset(): UnifiedVitalSignsResult | null {
    return this.unifiedProcessor.reset();
  }
  
  /**
   * Reinicio completo con compatibilidad
   */
  public override fullReset(): void {
    this.unifiedProcessor.fullReset();
  }
  
  /**
   * Obtener contador de arritmias con compatibilidad
   */
  public override getArrhythmiaCounter(): number {
    return this.unifiedProcessor.getArrhythmiaCounter();
  }
  
  /**
   * Obtener últimos resultados válidos con compatibilidad
   */
  public override getLastValidResults(): UnifiedVitalSignsResult | null {
    return this.unifiedProcessor.getLastValidResults();
  }
}

/**
 * Crea un procesador con la interfaz antigua pero usando el nuevo sistema unificado
 */
export function createCompatibleVitalSignsProcessor(): LegacyVitalSignsProcessor {
  return new VitalSignsProcessorAdapter();
}
