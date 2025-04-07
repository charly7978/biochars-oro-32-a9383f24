
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

// Re-export utility functions
export * from './signal-processing-utils';
export * from './perfusion-utils';

/**
 * Calculates amplitude more accurately from peaks and valleys
 */
export function calculateAmplitude(
  values: number[],
  peakIndices: number[],
  valleyIndices: number[]
): number {
  if (peakIndices.length === 0 || valleyIndices.length === 0 || values.length === 0) return 0;
  
  // Get all peak values
  const peakValues = peakIndices.map(index => values[index] || 0);
  
  // Get all valley values
  const valleyValues = valleyIndices.map(index => values[index] || 0);
  
  // Calculate average peak and valley
  const avgPeak = peakValues.reduce((sum, val) => sum + val, 0) / peakValues.length;
  const avgValley = valleyValues.reduce((sum, val) => sum + val, 0) / valleyValues.length;
  
  // Amplitude is difference between average peak and valley
  return Math.abs(avgPeak - avgValley);
}

/**
 * Improved peak and valley detection with enhanced sensitivity
 */
export function findPeaksAndValleys(values: number[]): {
  peakIndices: number[];
  valleyIndices: number[];
} {
  const peakIndices: number[] = [];
  const valleyIndices: number[] = [];
  
  if (values.length < 3) {
    return { peakIndices, valleyIndices };
  }
  
  // Minimum height difference to consider a peak/valley (adaptive threshold)
  const signalRange = Math.max(...values) - Math.min(...values);
  const minHeightDiff = Math.max(0.005, signalRange * 0.05); // At least 0.005 or 5% of signal range
  
  // Look for peaks and valleys
  for (let i = 1; i < values.length - 1; i++) {
    const prevVal = values[i - 1];
    const currVal = values[i];
    const nextVal = values[i + 1];
    
    // Peak detection with improved sensitivity
    if (
      currVal > prevVal && 
      currVal > nextVal && 
      currVal - Math.min(prevVal, nextVal) > minHeightDiff
    ) {
      peakIndices.push(i);
    }
    
    // Valley detection with improved sensitivity
    if (
      currVal < prevVal && 
      currVal < nextVal && 
      Math.min(prevVal, nextVal) - currVal > minHeightDiff
    ) {
      valleyIndices.push(i);
    }
  }
  
  return { peakIndices, valleyIndices };
}
