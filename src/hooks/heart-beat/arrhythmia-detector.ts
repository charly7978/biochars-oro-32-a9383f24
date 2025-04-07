
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useCallback, useRef } from 'react';

/**
 * Hook for detecting arrhythmias from RR intervals
 */
export function useArrhythmiaDetector() {
  // RR interval buffer
  const rrIntervalsRef = useRef<number[]>([]);
  
  // Reference for current arrhythmia status
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  
  // Store the last intervals
  const lastRRIntervalsRef = useRef<number[]>([]);
  
  // Arrhythmia counter
  const arrhythmiaCountRef = useRef<number>(0);
  
  /**
   * Process RR intervals to detect arrhythmia
   */
  const processRRIntervals = useCallback((rrIntervals: number[]): boolean => {
    if (rrIntervals.length < 3) {
      return false;
    }
    
    // Get the most recent intervals
    const recentIntervals = rrIntervals.slice(-5);
    rrIntervalsRef.current = recentIntervals;
    lastRRIntervalsRef.current = recentIntervals;
    
    // Calculate average interval
    const avgInterval = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    
    // Calculate interval variation
    const variations = recentIntervals.map(interval => Math.abs(interval - avgInterval) / avgInterval);
    const maxVariation = Math.max(...variations);
    
    // Check for arrhythmia - high variation indicates arrhythmia
    // Medical threshold is typically around 0.2 or 20% variation
    const isArrhythmia = maxVariation > 0.2;
    
    // Update arrhythmia status
    if (isArrhythmia && !currentBeatIsArrhythmiaRef.current) {
      // New arrhythmia detected
      arrhythmiaCountRef.current++;
      currentBeatIsArrhythmiaRef.current = true;
    } else if (!isArrhythmia) {
      // Reset current arrhythmia flag
      currentBeatIsArrhythmiaRef.current = false;
    }
    
    return isArrhythmia;
  }, []);
  
  /**
   * Reset the detector
   */
  const reset = useCallback(() => {
    rrIntervalsRef.current = [];
    currentBeatIsArrhythmiaRef.current = false;
    lastRRIntervalsRef.current = [];
    arrhythmiaCountRef.current = 0;
  }, []);
  
  /**
   * Get arrhythmia count
   */
  const getArrhythmiaCount = useCallback(() => {
    return arrhythmiaCountRef.current;
  }, []);
  
  return {
    processRRIntervals,
    reset,
    getArrhythmiaCount,
    currentBeatIsArrhythmiaRef,
    lastRRIntervalsRef
  };
}
