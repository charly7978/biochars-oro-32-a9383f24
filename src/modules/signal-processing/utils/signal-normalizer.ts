
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utility functions for signal normalization and amplification
 */

/**
 * Normalizes a signal value based on recent signal history
 */
export function normalizeSignal(value: number, recentValues: number[]): number {
  if (recentValues.length < 3) {
    return value; // Not enough history to normalize
  }
  
  try {
    // Calculate min, max, and range from recent history
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const range = max - min;
    
    // Avoid division by zero
    if (range < 0.0001) {
      return 0; // Signal is essentially flat
    }
    
    // Normalize to range [-0.5, 0.5]
    const mean = (max + min) / 2;
    const normalizedValue = (value - mean) / range;
    
    // Clamp to reasonable range
    return Math.max(-0.5, Math.min(0.5, normalizedValue));
  } catch (error) {
    console.error("Error normalizing signal:", error);
    return value; // Fall back to original value
  }
}

/**
 * Amplifies a normalized signal by a given factor
 */
export function amplifySignal(normalizedValue: number, factor: number = 1.0): number {
  try {
    // Apply amplification with reasonable limits
    const amplified = normalizedValue * factor;
    
    // Clamp to reasonable range
    return Math.max(-1.0, Math.min(1.0, amplified));
  } catch (error) {
    console.error("Error amplifying signal:", error);
    return normalizedValue; // Fall back to normalized value
  }
}
