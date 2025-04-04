
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useState, useCallback, useEffect } from 'react';
import { ArrhythmiaWindow } from './types';
import { dispatchArrhythmiaVisualizationEvent } from '../heart-beat/signal-processing/peak-detection';

/**
 * Hook to manage arrhythmia visualization windows
 * Based on real data only
 */
export const useArrhythmiaVisualization = () => {
  const [arrhythmiaWindows, setArrhythmiaWindows] = useState<ArrhythmiaWindow[]>([]);
  
  // Listen for arrhythmia events and update windows
  useEffect(() => {
    const handleArrhythmiaEvent = (event: CustomEvent) => {
      const { start, end } = event.detail;
      console.log('useArrhythmiaVisualization: Received arrhythmia window event', { start, end });
      
      // Add the window using internal method
      addArrhythmiaWindow(start, end);
    };
    
    window.addEventListener('arrhythmia-window-detected', 
      handleArrhythmiaEvent as EventListener);
    
    return () => {
      window.removeEventListener('arrhythmia-window-detected', 
        handleArrhythmiaEvent as EventListener);
    };
  }, []);
  
  /**
   * Register a new arrhythmia window for visualization
   * Based on real data only
   */
  const addArrhythmiaWindow = useCallback((start: number, end: number) => {
    // Limit to most recent arrhythmia windows for visualization
    setArrhythmiaWindows(prev => {
      const newWindows = [...prev, { start, end }];
      
      // Also dispatch event to ensure visualization in PPGSignalMeter
      dispatchArrhythmiaVisualizationEvent(true, start);
      
      return newWindows.slice(-3);
    });
  }, []);
  
  /**
   * Clear all arrhythmia visualization windows
   */
  const clearArrhythmiaWindows = useCallback(() => {
    setArrhythmiaWindows([]);
  }, []);
  
  /**
   * Manually trigger an arrhythmia window for visualization
   * Useful for testing or external integrations
   */
  const triggerArrhythmiaVisualization = useCallback(() => {
    const now = Date.now();
    dispatchArrhythmiaVisualizationEvent(true, now);
    addArrhythmiaWindow(now, now + 2000);
    console.log("useArrhythmiaVisualization: Manually triggered visualization");
    return true;
  }, [addArrhythmiaWindow]);
  
  return {
    arrhythmiaWindows,
    addArrhythmiaWindow,
    clearArrhythmiaWindows,
    triggerArrhythmiaVisualization
  };
};
