
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para el procesamiento central de señales
 * Integra los procesadores especializados del módulo signal-processing
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  createPPGSignalProcessor, 
  createHeartbeatProcessor,
  ProcessedPPGSignal,
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  resetFingerDetector
} from '../modules/signal-processing';

// Resultado combinado del procesamiento
export interface ProcessedSignalResult {
  timestamp: number;
  
  // Valores de señal PPG
  rawValue: number;
  filteredValue: number;
  normalizedValue: number;
  amplifiedValue: number;
  
  // Información de calidad
  quality: number;
  fingerDetected: boolean;
  signalStrength: number;
  
  // Información cardíaca
  isPeak: boolean;
  peakConfidence: number;
  instantaneousBPM: number | null;
  averageBPM: number | null;
  rrInterval: number | null;
  heartRateVariability: number | null;
}

/**
 * Hook para el procesamiento central de señales
 */
export function useSignalProcessing() {
  // State de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  
  // Valores calculados
  const [heartRate, setHeartRate] = useState<number>(0);
  const recentBpmValues = useRef<number[]>([]);
  
  // Contador de frames procesados
  const processedFramesRef = useRef<number>(0);
  
  // Refs para procesadores
  const ppgProcessorRef = useRef<any>(null);
  const heartbeatProcessorRef = useRef<any>(null);

  // Crear procesadores si no existen
  useEffect(() => {
    if (!ppgProcessorRef.current) {
      console.log("useSignalProcessing: Creando procesador PPG");
      ppgProcessorRef.current = createPPGSignalProcessor();
    }
    
    if (!heartbeatProcessorRef.current) {
      console.log("useSignalProcessing: Creando procesador de latidos");
      heartbeatProcessorRef.current = createHeartbeatProcessor();
    }
    
    return () => {
      console.log("useSignalProcessing: Limpiando procesadores");
      ppgProcessorRef.current = null;
      heartbeatProcessorRef.current = null;
    };
  }, []);
  
  /**
   * Procesa un valor PPG usando ambos procesadores
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing || !ppgProcessorRef.current || !heartbeatProcessorRef.current) {
      return null;
    }
    
    try {
      // Incrementar contador de frames
      processedFramesRef.current++;
      
      // Procesar con el procesador PPG
      const ppgResult: ProcessedPPGSignal = ppgProcessorRef.current.processSignal(value);
      
      // Usar el valor amplificado para procesamiento cardíaco
      const heartbeatResult: ProcessedHeartbeatSignal = 
        heartbeatProcessorRef.current.processSignal(ppgResult.amplifiedValue);
      
      // Actualizar estado de calidad y detección de dedo
      setSignalQuality(ppgResult.quality);
      setFingerDetected(ppgResult.fingerDetected);
      
      // Calcular BPM promedio
      if (heartbeatResult.instantaneousBPM !== null && heartbeatResult.peakConfidence > 0.5) {
        recentBpmValues.current.push(heartbeatResult.instantaneousBPM);
        
        // Mantener solo los valores más recientes
        if (recentBpmValues.current.length > 10) {
          recentBpmValues.current.shift();
        }
        
        // Calcular promedio de BPM
        if (recentBpmValues.current.length > 0) {
          const sum = recentBpmValues.current.reduce((acc, val) => acc + val, 0);
          const avgBpm = sum / recentBpmValues.current.length;
          
          // Actualizar estado de heartRate
          setHeartRate(avgBpm);
        }
      }
      
      // Crear resultado integrado
      const result: ProcessedSignalResult = {
        timestamp: ppgResult.timestamp,
        
        // Valores de PPG
        rawValue: ppgResult.rawValue,
        filteredValue: ppgResult.filteredValue,
        normalizedValue: ppgResult.normalizedValue,
        amplifiedValue: ppgResult.amplifiedValue,
        
        // Información de calidad
        quality: ppgResult.quality,
        fingerDetected: ppgResult.fingerDetected,
        signalStrength: ppgResult.signalStrength,
        
        // Información cardíaca
        isPeak: heartbeatResult.isPeak,
        peakConfidence: heartbeatResult.peakConfidence,
        instantaneousBPM: heartbeatResult.instantaneousBPM,
        averageBPM: heartbeatResult.averageBPM,
        rrInterval: heartbeatResult.rrInterval,
        heartRateVariability: heartbeatResult.heartRateVariability
      };
      
      // Actualizar último resultado
      setLastResult(result);
      
      return result;
    } catch (error) {
      console.error("Error en procesamiento de señal:", error);
      return null;
    }
  }, [isProcessing]);
  
  /**
   * Inicia el procesamiento de señales
   */
  const startProcessing = useCallback(() => {
    console.log("useSignalProcessing: Iniciando procesamiento");
    
    // Resetear detectores y procesadores
    resetFingerDetector();
    if (ppgProcessorRef.current) {
      ppgProcessorRef.current.reset();
    }
    if (heartbeatProcessorRef.current) {
      heartbeatProcessorRef.current.reset();
    }
    
    // Resetear estado
    recentBpmValues.current = [];
    processedFramesRef.current = 0;
    
    setIsProcessing(true);
    setSignalQuality(0);
    setHeartRate(0);
  }, []);
  
  /**
   * Detiene el procesamiento de señales
   */
  const stopProcessing = useCallback(() => {
    console.log("useSignalProcessing: Deteniendo procesamiento");
    setIsProcessing(false);
  }, []);
  
  return {
    isProcessing,
    lastResult,
    signalQuality,
    heartRate,
    fingerDetected,
    processedFrames: processedFramesRef.current,
    
    // Métodos
    processValue,
    startProcessing,
    stopProcessing
  };
}

export default useSignalProcessing;
