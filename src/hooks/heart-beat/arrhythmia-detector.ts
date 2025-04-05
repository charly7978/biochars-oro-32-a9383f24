
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useCallback, useRef, useEffect } from 'react';
import { calculateRMSSD, calculateRRVariation } from '../../modules/vital-signs/arrhythmia/calculations';
import { ArrhythmiaState } from '../vital-signs/types';

/**
 * Hook for arrhythmia detection based on real RR interval data
 * No simulation or data manipulation is used - direct measurement only
 */
export function useArrhythmiaDetector() {
  const heartRateVariabilityRef = useRef<number[]>([]);
  const stabilityCounterRef = useRef<number>(0);
  const lastAnomalyTimeRef = useRef<number>(0);
  
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
   * Procesa datos de intervalo RR para detección de arritmias
   * Solo usa datos reales medidos - sin simulaciones
   */
  const processRRIntervals = useCallback((intervals: number[]): boolean => {
    if (!intervals || intervals.length < 3) {
      return false;
    }
    
    // Usar solo los últimos 8 intervalos para análisis de tiempo real
    const recentIntervals = intervals.slice(-8);
    
    // Calcular variabilidad y RMSSD con datos reales
    const rmssd = calculateRMSSD(recentIntervals);
    const rrVariation = calculateRRVariation(recentIntervals);
    
    // Detección de arritmia con estadísticas reales - no simuladas
    const isHighVariability = rrVariation > 0.2;
    const isHighRMSSD = rmssd > 50;
    
    // Anomalía detectada con datos reales
    const anomalyDetected = isHighVariability && isHighRMSSD;
    
    // Actualizar historial de variabilidad
    heartRateVariabilityRef.current.push(rrVariation);
    if (heartRateVariabilityRef.current.length > 10) {
      heartRateVariabilityRef.current.shift();
    }
    
    // Lógica de detección de arritmia con memoria
    if (anomalyDetected) {
      stabilityCounterRef.current = 0;
      lastAnomalyTimeRef.current = Date.now();
      
      // Actualizar estado de arritmia
      arrhythmiaStateRef.current = {
        ...arrhythmiaStateRef.current,
        isActive: true,
        lastDetectionTime: lastAnomalyTimeRef.current
      };
      
      // Actualizar ventanas de visualización
      if (arrhythmiaStateRef.current.windows.length === 0 || 
          Date.now() - arrhythmiaStateRef.current.windows[arrhythmiaStateRef.current.windows.length - 1].end > 1000) {
        // Crear nueva ventana
        arrhythmiaStateRef.current.windows.push({
          start: Date.now(),
          end: Date.now() + 1000
        });
        
        // Limitar número de ventanas
        if (arrhythmiaStateRef.current.windows.length > 10) {
          arrhythmiaStateRef.current.windows.shift();
        }
      } else {
        // Extender ventana actual
        arrhythmiaStateRef.current.windows[arrhythmiaStateRef.current.windows.length - 1].end = 
          Date.now() + 1000;
      }
      
      return true;
    } else {
      stabilityCounterRef.current++;
      
      // Si hay suficientes ciclos estables, desactivar estado de arritmia
      // pero esto no borra las ventanas de arritmia para visualización
      if (stabilityCounterRef.current > 10) {
        // No hacemos reset aquí - dejamos que el timeout lo haga para evitar
        // falsos negativos en la detección de arritmias
      }
      
      return arrhythmiaStateRef.current.isActive;
    }
  }, []);
  
  /**
   * Resetea el detector de arritmias
   */
  const reset = useCallback(() => {
    heartRateVariabilityRef.current = [];
    stabilityCounterRef.current = 0;
    lastAnomalyTimeRef.current = 0;
    
    // Reset del estado de arritmia
    arrhythmiaStateRef.current = {
      isActive: false,
      lastDetectionTime: 0,
      recoveryTime: 3000,
      windows: []
    };
  }, []);
  
  /**
   * Obtiene el estado actual de arritmia
   */
  const getArrhythmiaState = useCallback((): ArrhythmiaState => {
    return arrhythmiaStateRef.current;
  }, []);
  
  return {
    processRRIntervals,
    reset,
    getArrhythmiaState
  };
}
