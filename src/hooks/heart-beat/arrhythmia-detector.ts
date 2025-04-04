
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useCallback, useRef, useEffect } from 'react';
import { calculateRMSSD, calculateRRVariation } from '../../modules/vital-signs/arrhythmia/calculations';
import { ArrhythmiaState } from '../vital-signs/types';
import { RRAnalysisResult } from './arrhythmia/types';

interface UseArrhythmiaDetectorReturn {
  processRRIntervals: (intervals: number[]) => boolean;
  reset: () => void;
  getArrhythmiaState: () => ArrhythmiaState;
  
  // Additional refs needed by useHeartBeatProcessor
  heartRateVariabilityRef: React.MutableRefObject<number[]>;
  stabilityCounterRef: React.MutableRefObject<number>;
  lastRRIntervalsRef: React.MutableRefObject<number[]>;
  lastIsArrhythmiaRef: React.MutableRefObject<boolean>;
  currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>;
}

/**
 * Hook for arrhythmia detection based on real RR interval data
 * No simulation or data manipulation is used - direct measurement only
 */
export function useArrhythmiaDetector(): UseArrhythmiaDetectorReturn {
  const heartRateVariabilityRef = useRef<number[]>([]);
  const stabilityCounterRef = useRef<number>(0);
  const lastRRIntervalsRef = useRef<number[]>([]);
  const lastAnomalyTimeRef = useRef<number>(0);
  const lastIsArrhythmiaRef = useRef<boolean>(false);
  const currentBeatIsArrhythmiaRef = useRef<boolean>(false);
  
  // Estado para evitar que las arritmias queden "trabadas"
  const arrhythmiaStateRef = useRef<ArrhythmiaState>({
    isActive: false,
    lastDetectionTime: 0,
    recoveryTime: 3000, // Auto-reset después de 3 segundos sin nuevos eventos
    windows: []
  });

  // Efecto para auto-reset de estado de arritmia después de un tiempo
  useEffect(() => {
    // Crea un intervalo para verificar el estado de arritmia
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (arrhythmiaStateRef.current.isActive && 
          (now - arrhythmiaStateRef.current.lastDetectionTime > arrhythmiaStateRef.current.recoveryTime)) {
        // Auto-reset del estado de arritmia
        arrhythmiaStateRef.current = {
          ...arrhythmiaStateRef.current,
          isActive: false
        };
        
        console.log("ArrhythmiaDetector: Auto-reset del estado de arritmia después de timeout");
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  /**
   * Analyzes RR intervals and returns whether an arrhythmia is detected
   */
  const detectArrhythmia = useCallback((intervals: number[]): RRAnalysisResult => {
    if (intervals.length < 3) {
      return {
        rmssd: 0,
        rrVariation: 0,
        timestamp: Date.now(),
        isArrhythmia: false
      };
    }
    
    // Calculate heart rate variability metrics
    const rmssd = calculateRMSSD(intervals.slice(-8));
    const rrVariation = calculateRRVariation(intervals.slice(-8));
    
    // Update tracked intervals
    lastRRIntervalsRef.current = intervals.slice(-8);
    
    // Detect arrhythmia based on variability thresholds
    const isHighVariability = rrVariation > 0.2;
    const isHighRMSSD = rmssd > 50;
    const isArrhythmia = isHighVariability && isHighRMSSD;
    
    if (isArrhythmia) {
      lastIsArrhythmiaRef.current = true;
      currentBeatIsArrhythmiaRef.current = true;
      lastAnomalyTimeRef.current = Date.now();
      
      // Update arrhythmia state
      arrhythmiaStateRef.current.isActive = true;
      arrhythmiaStateRef.current.lastDetectionTime = Date.now();
      
      // Update visualization window
      if (arrhythmiaStateRef.current.windows.length === 0 || 
          Date.now() - arrhythmiaStateRef.current.windows[arrhythmiaStateRef.current.windows.length - 1].end > 1000) {
        // Create new window
        arrhythmiaStateRef.current.windows.push({
          start: Date.now(),
          end: Date.now() + 1000
        });
        
        // Limit window count
        if (arrhythmiaStateRef.current.windows.length > 10) {
          arrhythmiaStateRef.current.windows.shift();
        }
      } else {
        // Extend current window
        arrhythmiaStateRef.current.windows[arrhythmiaStateRef.current.windows.length - 1].end = Date.now() + 1000;
      }
      
      stabilityCounterRef.current = 0;
    } else {
      currentBeatIsArrhythmiaRef.current = false;
      stabilityCounterRef.current++;
      
      // After enough stable beats, reset arrhythmia state,
      // but don't clear the windows for visualization
      if (stabilityCounterRef.current > 10) {
        lastIsArrhythmiaRef.current = false;
      }
    }
    
    // Update variability history
    heartRateVariabilityRef.current.push(rrVariation);
    if (heartRateVariabilityRef.current.length > 10) {
      heartRateVariabilityRef.current.shift();
    }
    
    return {
      rmssd,
      rrVariation,
      timestamp: Date.now(),
      isArrhythmia
    };
  }, []);
  
  /**
   * Process RR intervals and detect arrhythmias
   */
  const processRRIntervals = useCallback((intervals: number[]): boolean => {
    if (!intervals || intervals.length < 3) {
      return false;
    }
    
    const result = detectArrhythmia(intervals);
    return result.isArrhythmia;
  }, [detectArrhythmia]);
  
  /**
   * Reset the detector state
   */
  const reset = useCallback(() => {
    heartRateVariabilityRef.current = [];
    stabilityCounterRef.current = 0;
    lastRRIntervalsRef.current = [];
    lastAnomalyTimeRef.current = 0;
    lastIsArrhythmiaRef.current = false;
    currentBeatIsArrhythmiaRef.current = false;
    
    // Reset arrhythmia state
    arrhythmiaStateRef.current = {
      isActive: false,
      lastDetectionTime: 0,
      recoveryTime: 3000,
      windows: []
    };
  }, []);
  
  /**
   * Get the current arrhythmia state
   */
  const getArrhythmiaState = useCallback((): ArrhythmiaState => {
    return arrhythmiaStateRef.current;
  }, []);
  
  return {
    processRRIntervals,
    reset,
    getArrhythmiaState,
    heartRateVariabilityRef,
    stabilityCounterRef,
    lastRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef
  };
}
