
import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedMobileProcessor } from '../modules/vital-signs/OptimizedMobileProcessor';
import { VitalSignsResult } from '../modules/vital-signs/types/vital-signs-result';
import { useIsMobile } from './use-mobile';

/**
 * Resultado del procesador móvil optimizado con metadata
 */
interface OptimizedProcessorResult {
  isProcessing: boolean;
  lastResult: VitalSignsResult | null;
  signalQuality: number;
  batteryOptimized: boolean;
  processingQuality: 'high' | 'medium' | 'low';
}

/**
 * Hook para usar el procesador de señales vitales optimizado para móviles
 */
export function useOptimizedMobileProcessor() {
  // Estado del procesador
  const [state, setState] = useState<OptimizedProcessorResult>({
    isProcessing: false,
    lastResult: null,
    signalQuality: 0,
    batteryOptimized: true,
    processingQuality: 'medium'
  });
  
  // Referencias
  const processorRef = useRef<OptimizedMobileProcessor>(OptimizedMobileProcessor.getInstance());
  const isMobile = useIsMobile();
  const processingIntervalRef = useRef<number | null>(null);
  
  // Iniciar procesamiento
  const startProcessing = useCallback(() => {
    if (state.isProcessing) return;
    
    setState(prev => ({
      ...prev,
      isProcessing: true
    }));
    
    // Determinar calidad de procesamiento basada en rendimiento del dispositivo
    const setOptimalQuality = () => {
      // Prueba de rendimiento simple
      const startTime = performance.now();
      let counter = 0;
      for (let i = 0; i < 100000; i++) {
        counter += Math.sqrt(i);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Determinar calidad según rendimiento
      let quality: 'high' | 'medium' | 'low';
      if (duration < 20) {
        quality = 'high';
      } else if (duration < 50) {
        quality = 'medium';
      } else {
        quality = 'low';
      }
      
      processorRef.current.setProcessingQuality(quality);
      setState(prev => ({ ...prev, processingQuality: quality }));
      
      console.log(`OptimizedMobileProcessor: Performance test completed in ${duration.toFixed(2)}ms, quality set to ${quality}`);
    };
    
    // Realizar prueba de rendimiento y configurar
    setOptimalQuality();
    
  }, [state.isProcessing]);
  
  // Detener procesamiento
  const stopProcessing = useCallback(() => {
    if (!state.isProcessing) return;
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isProcessing: false
    }));
    
    console.log("OptimizedMobileProcessor: Processing stopped");
  }, [state.isProcessing]);
  
  // Procesar valor
  const processValue = useCallback((
    value: number,
    rrData?: { intervals: number[]; lastPeakTime: number | null }
  ): VitalSignsResult | null => {
    if (!state.isProcessing) return null;
    
    try {
      // Procesar con optimizaciones para móvil
      const result = processorRef.current.processValue(value, rrData);
      
      if (result) {
        setState(prev => ({
          ...prev,
          lastResult: result,
          signalQuality: result.confidence?.overall || 0
        }));
      }
      
      return result;
    } catch (error) {
      console.error("Error en procesamiento optimizado:", error);
      return null;
    }
  }, [state.isProcessing]);
  
  // Cambiar calidad de procesamiento
  const setProcessingQuality = useCallback((quality: 'high' | 'medium' | 'low') => {
    processorRef.current.setProcessingQuality(quality);
    setState(prev => ({ ...prev, processingQuality: quality }));
  }, []);
  
  // Reiniciar procesador
  const reset = useCallback(() => {
    processorRef.current.reset();
    setState({
      isProcessing: false,
      lastResult: null,
      signalQuality: 0,
      batteryOptimized: true,
      processingQuality: 'medium'
    });
  }, []);
  
  // Reinicio completo
  const fullReset = useCallback(() => {
    processorRef.current.fullReset();
    reset();
  }, [reset]);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, []);
  
  // Optimizar automáticamente para móvil
  useEffect(() => {
    if (isMobile && state.processingQuality !== 'low') {
      // Bajar calidad en dispositivos móviles para ahorrar batería
      setProcessingQuality('medium');
    }
  }, [isMobile, state.processingQuality, setProcessingQuality]);
  
  return {
    ...state,
    startProcessing,
    stopProcessing,
    processValue,
    setProcessingQuality,
    reset,
    fullReset,
    arrhythmiaCount: processorRef.current.getArrhythmiaCounter()
  };
}
