
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useState, useCallback, useEffect } from 'react';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useArrhythmiaVisualization } from './vital-signs/use-arrhythmia-visualization';

/**
 * Hook for integrating arrhythmia detection and visualization
 */
export function useArrhythmiaProcessor() {
  const arrhythmiaDetector = useArrhythmiaDetector();
  const arrhythmiaVisualization = useArrhythmiaVisualization();
  const [arrhythmiaCount, setArrhythmiaCount] = useState<number>(0);
  const [lastArrhythmiaData, setLastArrhythmiaData] = useState<any>(null);

  /**
   * Process RR intervals for arrhythmia detection
   */
  const processRRIntervals = useCallback((rrIntervals: number[]) => {
    // Detect arrhythmia from real RR intervals
    const result = arrhythmiaDetector.detectArrhythmia(rrIntervals);
    
    // If new arrhythmia detected, update visualization and counter
    if (result.isArrhythmia) {
      arrhythmiaVisualization.addArrhythmiaWindow(result.timestamp - 500, result.timestamp + 500);
      setArrhythmiaCount(prevCount => prevCount + 1);
      setLastArrhythmiaData(result);
    }
    
    return result;
  }, [arrhythmiaDetector, arrhythmiaVisualization]);
  
  /**
   * Get arrhythmia windows for visualization
   */
  const getArrhythmiaWindows = useCallback(() => {
    return arrhythmiaVisualization.arrhythmiaWindows;
  }, [arrhythmiaVisualization]);
  
  /**
   * Reset arrhythmia processor
   */
  const reset = useCallback(() => {
    arrhythmiaDetector.reset();
    arrhythmiaVisualization.clearArrhythmiaWindows();
    setArrhythmiaCount(0);
    setLastArrhythmiaData(null);
  }, [arrhythmiaDetector, arrhythmiaVisualization]);
  
  return {
    processRRIntervals,
    arrhythmiaCount,
    lastArrhythmiaData,
    arrhythmiaWindows: arrhythmiaVisualization.arrhythmiaWindows,
    getArrhythmiaWindows,
    reset
  };
}
