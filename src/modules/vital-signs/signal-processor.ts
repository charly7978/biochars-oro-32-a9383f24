/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
import { VitalSignsResult } from './types/vital-signs-result';

/**
 * Interface for signal processor
 */
export interface ISignalProcessor {
  processSignal(value: number): any;
  reset(): void;
}

/**
 * Signal processor for vital signs
 */
export class SignalProcessor implements ISignalProcessor {
  private valueBuffer: number[] = [];
  private readonly MAX_BUFFER_SIZE = 50;
  
  /**
   * Process a signal value
   */
  processSignal(value: number): number {
    // Store in buffer
    this.valueBuffer.push(value);
    
    // Keep buffer size in check
    if (this.valueBuffer.length > this.MAX_BUFFER_SIZE) {
      this.valueBuffer.shift();
    }
    
    // Apply simple filtering
    return this.applyFiltering(value);
  }
  
  /**
   * Reset processor
   */
  reset(): void {
    this.valueBuffer = [];
  }
  
  /**
   * Apply signal filtering
   */
  private applyFiltering(value: number): number {
    if (this.valueBuffer.length < 3) {
      return value;
    }
    
    // Apply simple moving average
    const recentValues = this.valueBuffer.slice(-3);
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    return avg;
  }
}
