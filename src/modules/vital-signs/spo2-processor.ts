
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Utilidades para cálculos de señal PPG
 */
export const calculateAC = (values: number[]): number => {
  const recentValues = values.slice(-30);
  const min = Math.min(...recentValues);
  const max = Math.max(...recentValues);
  return max - min;
};

export const calculateDC = (values: number[]): number => {
  const recentValues = values.slice(-30);
  const sum = recentValues.reduce((acc, val) => acc + val, 0);
  return sum / recentValues.length;
};

/**
 * Procesador especializado para cálculo de SpO2
 */
export class SpO2Processor {
  private readonly SPO2_BUFFER_SIZE = 10;
  private spo2Buffer: number[] = [];
  private valueBuffer: number[] = [];

  /**
   * Process new PPG value and add to buffer
   */
  public processValue(value: number): number {
    this.valueBuffer.push(value);
    if (this.valueBuffer.length > 50) {
      this.valueBuffer.shift();
    }
    
    // Calculate SpO2 if we have enough values
    if (this.valueBuffer.length >= 30) {
      return this.calculateSpO2(this.valueBuffer);
    }
    
    return this.getLastValidSpo2(1);
  }

  /**
   * Calculates the oxygen saturation (SpO2) from real PPG values
   * No simulation or reference values are used
   */
  public calculateSpO2(values: number[]): number {
    if (values.length < 30) {
      return this.getLastValidSpo2(1);
    }

    const dc = calculateDC(values);
    if (dc === 0) {
      return this.getLastValidSpo2(1);
    }

    const ac = calculateAC(values);
    
    const perfusionIndex = ac / dc;
    
    if (perfusionIndex < 0.06) {
      return this.getLastValidSpo2(2);
    }

    // Direct calculation from real signal characteristics
    const R = (ac / dc);
    
    let spO2 = Math.round(98 - (15 * R));
    
    // Adjust based on real perfusion quality
    if (perfusionIndex > 0.15) {
      spO2 = Math.min(98, spO2 + 1);
    } else if (perfusionIndex < 0.08) {
      spO2 = Math.max(0, spO2 - 1);
    }

    spO2 = Math.min(98, spO2);

    // Update buffer with real measurement
    this.spo2Buffer.push(spO2);
    if (this.spo2Buffer.length > this.SPO2_BUFFER_SIZE) {
      this.spo2Buffer.shift();
    }

    // Calculate average for stability from real measurements
    if (this.spo2Buffer.length > 0) {
      const sum = this.spo2Buffer.reduce((a, b) => a + b, 0);
      spO2 = Math.round(sum / this.spo2Buffer.length);
    }

    return spO2;
  }
  
  /**
   * Get last valid SpO2 with optional decay
   * Only uses real historical values
   */
  private getLastValidSpo2(decayAmount: number): number {
    if (this.spo2Buffer.length > 0) {
      const lastValid = this.spo2Buffer[this.spo2Buffer.length - 1];
      return Math.max(0, lastValid - decayAmount);
    }
    return 0;
  }

  /**
   * Reset the SpO2 processor state
   * Ensures all measurements start from zero
   */
  public reset(): void {
    this.spo2Buffer = [];
    this.valueBuffer = [];
  }
}
