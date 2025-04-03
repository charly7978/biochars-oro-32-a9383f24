
import { useState, useRef, useCallback, useEffect } from 'react';
import { resetFingerDetector, detectFingerPresence } from '@/modules/signal-processing/utils/finger-detector';
import { logError, ErrorLevel } from '@/utils/debugUtils';

/**
 * Hook centralizado para la detección de dedos
 * Unifica toda la lógica de detección para evitar duplicaciones
 */
export function useFingerDetection() {
  // Estado principal
  const [isFingerDetected, setIsFingerDetected] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  
  // Historial y buffers para detección robusta
  const fingerDetectionBufferRef = useRef<boolean[]>([]);
  const qualityHistoryRef = useRef<number[]>([]);
  const consecutiveDetectionsRef = useRef<number>(0);
  const consecutiveNoDetectionsRef = useRef<number>(0);
  const stableDetectionRef = useRef<boolean>(false);
  
  // Configuración
  const detectionConfig = useRef({
    minQualityThreshold: 20,
    detectionRatioThreshold: 0.6,
    stableDetectionThreshold: 15,
    lossDetectionThreshold: 10,
    maxBufferSize: 10,
    maxQualityHistorySize: 20,
    sensitivity: 0.75, // Mayor sensibilidad por defecto
  });
  
  /**
   * Reinicia el detector de dedos completamente
   */
  const reset = useCallback(() => {
    setIsFingerDetected(false);
    setSignalQuality(0);
    setIsMonitoring(false);
    
    fingerDetectionBufferRef.current = [];
    qualityHistoryRef.current = [];
    consecutiveDetectionsRef.current = 0;
    consecutiveNoDetectionsRef.current = 0;
    stableDetectionRef.current = false;
    
    // Resetear el detector subyacente
    resetFingerDetector();
    
    logError("Detector de dedos reiniciado completamente", ErrorLevel.INFO, "FingerDetector");
  }, []);
  
  /**
   * Inicia el monitoreo
   */
  const startMonitoring = useCallback(() => {
    reset();
    setIsMonitoring(true);
    logError("Detector de dedos iniciado", ErrorLevel.INFO, "FingerDetector");
  }, [reset]);
  
  /**
   * Detiene el monitoreo
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    logError("Detector de dedos detenido", ErrorLevel.INFO, "FingerDetector");
  }, []);
  
  /**
   * Procesa una señal para detección de dedos
   * @param signalValue Valor de la señal a procesar
   * @param quality Calidad de la señal (0-100)
   * @param rawDetection Detección básica inicial (opcional)
   */
  const processSignal = useCallback((
    signalValue: number,
    quality: number,
    rawDetection?: boolean
  ): boolean => {
    if (!isMonitoring) return false;
    
    // Usar detector subyacente para evaluación inicial
    const initialDetection = rawDetection !== undefined ? 
      rawDetection : 
      detectFingerPresence([signalValue], detectionConfig.current.sensitivity);
    
    // Actualizar buffers
    fingerDetectionBufferRef.current.push(initialDetection);
    if (fingerDetectionBufferRef.current.length > detectionConfig.current.maxBufferSize) {
      fingerDetectionBufferRef.current.shift();
    }
    
    qualityHistoryRef.current.push(quality);
    if (qualityHistoryRef.current.length > detectionConfig.current.maxQualityHistorySize) {
      qualityHistoryRef.current.shift();
    }
    
    // Calcular calidad promedio reciente
    const recentQualityAvg = qualityHistoryRef.current.length > 0 
      ? qualityHistoryRef.current.reduce((sum, val) => sum + val, 0) / 
        qualityHistoryRef.current.length
      : 0;
    
    // Actualizar señal de calidad
    setSignalQuality(quality);
    
    // Contar detecciones positivas recientes
    const recentDetections = fingerDetectionBufferRef.current.filter(Boolean).length;
    const detectionRatio = recentDetections / Math.max(1, fingerDetectionBufferRef.current.length);
    
    // Actualizar contadores consecutivos
    if (initialDetection) {
      consecutiveDetectionsRef.current++;
      consecutiveNoDetectionsRef.current = 0;
    } else {
      consecutiveNoDetectionsRef.current++;
      consecutiveDetectionsRef.current = 0;
    }
    
    // Lógica unificada para determinar presencia de dedo
    let finalDetection = false;
    
    // Primera condición: consenso de detecciones recientes
    if (detectionRatio > detectionConfig.current.detectionRatioThreshold && 
        recentQualityAvg > detectionConfig.current.minQualityThreshold) {
      finalDetection = true;
      
      // Si tenemos suficientes detecciones consecutivas, marcar como estable
      if (consecutiveDetectionsRef.current > detectionConfig.current.stableDetectionThreshold && 
          !stableDetectionRef.current) {
        stableDetectionRef.current = true;
        console.log("Detector central: Detección de dedo estable confirmada", {
          detectionRatio,
          recentQualityAvg,
          consecutive: consecutiveDetectionsRef.current
        });
      }
    } 
    // Segunda condición: mantener detección estable a menos que haya suficientes negativas
    else if (stableDetectionRef.current && 
             consecutiveNoDetectionsRef.current < detectionConfig.current.lossDetectionThreshold) {
      finalDetection = true;
    } 
    // Caso contrario: no hay dedo
    else {
      finalDetection = false;
      
      // Si había detección estable y ya no, resetear estado
      if (stableDetectionRef.current) {
        stableDetectionRef.current = false;
        console.log("Detector central: Detección de dedo estable perdida", {
          detectionRatio,
          recentQualityAvg,
          consecutiveNegatives: consecutiveNoDetectionsRef.current
        });
      }
    }
    
    // Actualizar estado solo si hay cambio (reduce re-renders)
    if (finalDetection !== isFingerDetected) {
      console.log(`Detector central: Cambio en detección de dedo: ${finalDetection ? "DETECTADO" : "PERDIDO"}`, {
        detectionRatio,
        recentQualityAvg,
        initialDetection,
        bufferSize: fingerDetectionBufferRef.current.length,
        consecutiveDetections: consecutiveDetectionsRef.current,
        consecutiveNoDetections: consecutiveNoDetectionsRef.current,
        stable: stableDetectionRef.current
      });
      
      setIsFingerDetected(finalDetection);
    }
    
    return finalDetection;
  }, [isMonitoring, isFingerDetected]);
  
  /**
   * Configura el detector
   */
  const configure = useCallback((config: Partial<typeof detectionConfig.current>) => {
    detectionConfig.current = {
      ...detectionConfig.current,
      ...config
    };
    
    console.log("Detector central: Configuración actualizada", detectionConfig.current);
  }, []);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      console.log("Detector central: Limpieza por desmontaje");
      resetFingerDetector();
    };
  }, []);
  
  return {
    isFingerDetected,
    signalQuality,
    isMonitoring,
    processSignal,
    startMonitoring,
    stopMonitoring,
    reset,
    configure
  };
}
