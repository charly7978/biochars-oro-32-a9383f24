
import { useState, useRef, useCallback, useEffect } from 'react';
import { detectFingerPresence, resetFingerDetector } from '@/modules/signal-processing/utils/finger-detector';

/**
 * Hook centralizado para la detección de dedos
 * Proporciona una interfaz única para la detección usando algoritmos subyacentes
 */
export function useFingerDetection() {
  // Estado para tracking de dedo y calidad
  const [isFingerDetected, setIsFingerDetected] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Historial de calidad de señal
  const qualityHistoryRef = useRef<number[]>([]);
  const fingerDetectionBufferRef = useRef<boolean[]>([]);
  const consecutiveDetectionsRef = useRef(0);
  const consecutiveNoDetectionsRef = useRef(0);
  const stableDetectionRef = useRef(false);
  
  // Para métricas de rendimiento y debug
  const framesProcessedRef = useRef(0);
  const lastProcessTimeRef = useRef(0);
  const processingActiveRef = useRef(false);
  
  /**
   * Iniciar monitorización de dedo
   */
  const startMonitoring = useCallback(() => {
    console.log("Iniciando monitorización de dedo");
    resetFingerDetector();
    setIsMonitoring(true);
    setIsFingerDetected(false);
    setSignalQuality(0);
    qualityHistoryRef.current = [];
    fingerDetectionBufferRef.current = [];
    consecutiveDetectionsRef.current = 0;
    consecutiveNoDetectionsRef.current = 0;
    stableDetectionRef.current = false;
    framesProcessedRef.current = 0;
    processingActiveRef.current = true;
  }, []);
  
  /**
   * Detener monitorización de dedo
   */
  const stopMonitoring = useCallback(() => {
    console.log("Deteniendo monitorización de dedo");
    setIsMonitoring(false);
    processingActiveRef.current = false;
  }, []);
  
  /**
   * Reiniciar el detector de dedo completamente
   */
  const reset = useCallback(() => {
    console.log("Reiniciando detector de dedo");
    resetFingerDetector();
    setIsMonitoring(false);
    processingActiveRef.current = false;
    setIsFingerDetected(false);
    setSignalQuality(0);
    qualityHistoryRef.current = [];
    fingerDetectionBufferRef.current = [];
    consecutiveDetectionsRef.current = 0;
    consecutiveNoDetectionsRef.current = 0;
    stableDetectionRef.current = false;
    framesProcessedRef.current = 0;
  }, []);
  
  /**
   * Procesa una señal para detectar la presencia de un dedo
   * @param value - Valor de la señal procesada
   * @param rawQuality - Calidad de señal proporcionada por el procesador (opcional)
   * @param sourceFingerDetected - Detección previa del extractor de señal (opcional)
   * @returns boolean - Si se detecta un dedo
   */
  const processSignal = useCallback((
    value: number,
    rawQuality?: number,
    sourceFingerDetected?: boolean
  ): boolean => {
    if (!isMonitoring || !processingActiveRef.current) {
      return false;
    }
    
    try {
      framesProcessedRef.current++;
      
      // Crear buffer de valores recientes
      const signalBuffer = [value];
      
      // Usar el detector optimizado para máxima sensibilidad
      const detectedByAlgorithm = detectFingerPresence(signalBuffer, 0.95);
      
      // Si tenemos una fuente externa de detección, combinar los resultados
      const combinedDetection = detectedByAlgorithm || !!sourceFingerDetected;
      
      // Mejorar la robustez con buffer de detecciones recientes
      fingerDetectionBufferRef.current.push(combinedDetection);
      if (fingerDetectionBufferRef.current.length > 10) {
        fingerDetectionBufferRef.current.shift();
      }
      
      // Contabilizar detecciones consecutivas
      if (combinedDetection) {
        consecutiveDetectionsRef.current++;
        consecutiveNoDetectionsRef.current = 0;
      } else {
        consecutiveNoDetectionsRef.current++;
        consecutiveDetectionsRef.current = 0;
      }
      
      // Determinar si hay dedo presente basado en consenso
      const positiveDetections = fingerDetectionBufferRef.current.filter(Boolean).length;
      const detectionConsensus = positiveDetections / Math.max(1, fingerDetectionBufferRef.current.length);
      
      // Estrategia de histéresis: más difícil perder la detección que adquirirla
      let fingerDetected = false;
      
      if (isFingerDetected) {
        // Ya teníamos dedo detectado, mantener a menos que haya muchas detecciones negativas
        fingerDetected = detectionConsensus >= 0.3 || consecutiveNoDetectionsRef.current < 15;
        
        if (!fingerDetected && stableDetectionRef.current) {
          console.log("Detección estable perdida", {
            consensus: detectionConsensus,
            consecutiveNegatives: consecutiveNoDetectionsRef.current
          });
          stableDetectionRef.current = false;
        }
      } else {
        // No teníamos dedo detectado, requiere más evidencia para confirmar
        fingerDetected = detectionConsensus >= 0.6 || consecutiveDetectionsRef.current > 10;
        
        if (fingerDetected && consecutiveDetectionsRef.current > 15 && !stableDetectionRef.current) {
          console.log("Detección estable adquirida", {
            consensus: detectionConsensus,
            consecutivePositives: consecutiveDetectionsRef.current
          });
          stableDetectionRef.current = true;
        }
      }
      
      // Actualizar calidad de señal basada en detección e historial
      let quality = rawQuality || 0;
      
      // Si hay un dedo presente, establecer calidad mínima de 20
      if (fingerDetected && quality < 20) {
        quality = 20;
      }
      
      // Agregar calidad al historial
      qualityHistoryRef.current.push(quality);
      if (qualityHistoryRef.current.length > 10) {
        qualityHistoryRef.current.shift();
      }
      
      // Calcular calidad promedio para estabilidad
      const avgQuality = qualityHistoryRef.current.reduce((sum, q) => sum + q, 0) 
        / Math.max(1, qualityHistoryRef.current.length);
      
      // Actualizar estado solo si hay cambios significativos para evitar renderizados innecesarios
      if (fingerDetected !== isFingerDetected) {
        setIsFingerDetected(fingerDetected);
        // Log cuando cambia el estado
        console.log(`Cambio en detección de dedo: ${fingerDetected ? "DETECTADO" : "PERDIDO"}`, {
          detectionConsensus,
          avgQuality,
          consecutive: fingerDetected ? 
            consecutiveDetectionsRef.current : 
            consecutiveNoDetectionsRef.current,
          stable: stableDetectionRef.current
        });
      }
      
      // Solo actualizar calidad si cambia significativamente
      if (Math.abs(avgQuality - signalQuality) > 2) {
        setSignalQuality(Math.round(avgQuality));
      }
      
      return fingerDetected;
    } catch (error) {
      console.error("Error en detección de dedo:", error);
      return false;
    }
  }, [isMonitoring, isFingerDetected, signalQuality]);
  
  // Efectos para registro periódico si está en modo monitorización
  useEffect(() => {
    if (!isMonitoring) return;
    
    const intervalId = setInterval(() => {
      if (processingActiveRef.current) {
        const now = Date.now();
        const elapsed = now - lastProcessTimeRef.current;
        if (elapsed > 3000) {
          console.log("Advertencia: Detección de dedo inactiva por más de 3 segundos");
        }
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [isMonitoring]);
  
  return {
    isFingerDetected,
    signalQuality,
    isMonitoring,
    processSignal,
    startMonitoring,
    stopMonitoring,
    reset
  };
}
