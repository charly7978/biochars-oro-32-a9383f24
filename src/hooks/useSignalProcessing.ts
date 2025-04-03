/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para el procesamiento central de señales
 * Integra los procesadores especializados del módulo signal-processing
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  PPGSignalProcessor, 
  HeartbeatProcessor,
  ProcessedPPGSignal,
  ProcessedHeartbeatSignal,
  SignalProcessingOptions,
  resetFingerDetector
} from '../modules/signal-processing';
import { SignalAmplifier } from '../modules/SignalAmplifier';
import { logError, ErrorLevel } from '@/utils/debugUtils';

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
  // Instancias de procesadores
  const ppgProcessorRef = useRef<PPGSignalProcessor | null>(null);
  const heartbeatProcessorRef = useRef<HeartbeatProcessor | null>(null);
  // Nuevo amplificador de señal dedicado
  const signalAmplifierRef = useRef<SignalAmplifier | null>(null);
  
  // Estado de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  
  // Valores calculados
  const [heartRate, setHeartRate] = useState<number>(0);
  const recentBpmValues = useRef<number[]>([]);
  
  // Contador de frames procesados
  const processedFramesRef = useRef<number>(0);
  
  // Crear procesadores si no existen
  useEffect(() => {
    if (!ppgProcessorRef.current) {
      console.log("useSignalProcessing: Creando procesador PPG");
      ppgProcessorRef.current = new PPGSignalProcessor();
    }
    
    if (!heartbeatProcessorRef.current) {
      console.log("useSignalProcessing: Creando procesador de latidos");
      heartbeatProcessorRef.current = new HeartbeatProcessor();
    }
    
    if (!signalAmplifierRef.current) {
      console.log("useSignalProcessing: Creando amplificador de señal");
      signalAmplifierRef.current = new SignalAmplifier();
    }
    
    return () => {
      console.log("useSignalProcessing: Limpiando procesadores");
      ppgProcessorRef.current = null;
      heartbeatProcessorRef.current = null;
      signalAmplifierRef.current = null;
    };
  }, []);
  
  /**
   * Procesa un valor PPG usando ambos procesadores
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing || !ppgProcessorRef.current || !heartbeatProcessorRef.current || !signalAmplifierRef.current) {
      return null;
    }
    
    try {
      // Incrementar contador de frames
      processedFramesRef.current++;
      
      // Procesar con el procesador PPG
      const ppgResult: ProcessedPPGSignal = ppgProcessorRef.current.processSignal(value);
      
      // Amplificar la señal con el amplificador dedicado para mejorar la detección de latidos
      const amplifierResult = signalAmplifierRef.current.processValue(ppgResult.filteredValue);
      
      // Usar el valor amplificado para procesamiento cardíaco
      const heartbeatResult: ProcessedHeartbeatSignal = 
        heartbeatProcessorRef.current.processSignal(amplifierResult.amplifiedValue);
      
      // NUEVO: Transferencia directa de la calidad de señal del amplificador a la salida
      // La calidad del amplificador ya tiene en cuenta factores importantes como periodicity
      const rawQuality = Math.max(ppgResult.quality, amplifierResult.quality * 100);
      
      // Calcular calidad mejorada que incorpora detección de latidos, exactamente como se solicitó
      const enhancedQuality = heartbeatResult.peakConfidence > 0.6 
        ? Math.min(100, rawQuality + 15) // Boost quality when we detect strong peaks
        : rawQuality;
        
      // Actualizar estado con calidad directa del procesador
      setSignalQuality(enhancedQuality);
      
      // Detección de dedo mejorada - usar AMBOS criterios para mayor precisión
      const improvedFingerDetection = 
        ppgResult.fingerDetected || // Criterio original
        (amplifierResult.quality > 0.5 && heartbeatResult.peakConfidence > 0.4); // Criterio del amplificador
      
      setFingerDetected(improvedFingerDetection);
      
      // Calcular BPM promedio con mayor peso a valores recientes
      if (heartbeatResult.instantaneousBPM !== null && heartbeatResult.peakConfidence > 0.4) { // Lowered threshold
        // Prioritize recent values with a weight factor
        const bpmWeight = 1.0 + (heartbeatResult.peakConfidence - 0.4) * 0.5; // 1.0-1.3 based on confidence
        for (let i = 0; i < Math.round(bpmWeight); i++) {
          recentBpmValues.current.push(heartbeatResult.instantaneousBPM);
        }
        
        // Mantener solo los valores más recientes
        if (recentBpmValues.current.length > 12) { // Increased from 10
          recentBpmValues.current.shift();
        }
      }
      
      // Calcular BPM promedio (con filtrado de valores extremos mejorado)
      let averageBPM: number | null = null;
      
      if (recentBpmValues.current.length >= 3) {
        // Filtrado adaptativo basado en la calidad de la señal
        const qualityFactor = Math.min(1, enhancedQuality / 70); // 0-1 based on quality
        const outlierMargin = 0.3 - (qualityFactor * 0.2); // 0.1-0.3 based on signal quality
        
        // Ordenar para eliminar extremos
        const sortedBPMs = [...recentBpmValues.current].sort((a, b) => a - b);
        
        // Usar porcentaje central adaptativo según calidad
        const startIdx = Math.floor(sortedBPMs.length * outlierMargin);
        const endIdx = Math.ceil(sortedBPMs.length * (1 - outlierMargin));
        const centralBPMs = sortedBPMs.slice(startIdx, endIdx);
        
        // Calcular promedio ponderado (más peso a valores más recientes)
        if (centralBPMs.length > 0) {
          let weightedSum = 0;
          let totalWeight = 0;
          
          for (let i = 0; i < centralBPMs.length; i++) {
            // More weight to recent values (later in the array)
            const weight = 1 + (i / centralBPMs.length);
            weightedSum += centralBPMs[i] * weight;
            totalWeight += weight;
          }
          
          averageBPM = Math.round(weightedSum / totalWeight);
          
          // Actualizar estado de BPM si tenemos valor y buena calidad
          if (averageBPM > 0 && enhancedQuality > 30) { // Lowered threshold from 35
            setHeartRate(averageBPM);
          }
        }
      }
      
      // Generar resultado combinado
      const result: ProcessedSignalResult = {
        timestamp: ppgResult.timestamp,
        
        // Valores de señal PPG
        rawValue: ppgResult.rawValue,
        filteredValue: ppgResult.filteredValue,
        normalizedValue: ppgResult.normalizedValue,
        amplifiedValue: amplifierResult.amplifiedValue, // Usar valor del amplificador dedicado
        
        // Información de calidad mejorada - TRANSFERENCIA DIRECTA
        quality: enhancedQuality,
        fingerDetected: improvedFingerDetection,
        signalStrength: ppgResult.signalStrength,
        
        // Información cardíaca
        isPeak: heartbeatResult.isPeak,
        peakConfidence: heartbeatResult.peakConfidence,
        instantaneousBPM: heartbeatResult.instantaneousBPM,
        averageBPM,
        rrInterval: heartbeatResult.rrInterval,
        heartRateVariability: heartbeatResult.heartRateVariability
      };
      
      // Output enhanced diagnostic info
      if (processedFramesRef.current % 50 === 0) {
        console.log("Signal Processing Diagnostics:", {
          quality: enhancedQuality,
          amplifierGain: signalAmplifierRef.current.getCurrentGain(), // FIX: Usar método del amplificador dedicado
          peakConfidence: heartbeatResult.peakConfidence,
          recentBpmCount: recentBpmValues.current.length,
          averageBPM: averageBPM,
          instantBPM: heartbeatResult.instantaneousBPM,
          timestamp: new Date().toISOString()
        });
      }
      
      // Actualizar último resultado
      setLastResult(result);
      
      return result;
    } catch (error) {
      console.error("Error procesando valor:", error);
      return null;
    }
  }, [isProcessing]);
  
  /**
   * Inicia el procesamiento de señal
   */
  const startProcessing = useCallback(() => {
    if (!ppgProcessorRef.current || !heartbeatProcessorRef.current || !signalAmplifierRef.current) {
      console.error("No se pueden iniciar los procesadores");
      return;
    }
    
    console.log("useSignalProcessing: Iniciando procesamiento");
    
    // Resetear procesadores
    ppgProcessorRef.current.reset();
    heartbeatProcessorRef.current.reset();
    signalAmplifierRef.current.reset();
    resetFingerDetector();
    
    // Limpiar estados
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    recentBpmValues.current = [];
    processedFramesRef.current = 0;
    
    // Iniciar procesamiento
    setIsProcessing(true);
  }, []);
  
  /**
   * Detiene el procesamiento de señal
   */
  const stopProcessing = useCallback(() => {
    console.log("useSignalProcessing: Deteniendo procesamiento");
    setIsProcessing(false);
  }, []);
  
  /**
   * Configura los procesadores con opciones personalizadas
   */
  const configureProcessors = useCallback((options: SignalProcessingOptions) => {
    if (ppgProcessorRef.current) {
      ppgProcessorRef.current.configure(options);
    }
    
    if (heartbeatProcessorRef.current) {
      heartbeatProcessorRef.current.configure(options);
    }
  }, []);
  
  return {
    // Estados
    isProcessing,
    signalQuality,
    fingerDetected,
    heartRate,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Acciones
    processValue,
    startProcessing,
    stopProcessing,
    configureProcessors,
    
    // Procesadores
    ppgProcessor: ppgProcessorRef.current,
    heartbeatProcessor: heartbeatProcessorRef.current,
    signalAmplifier: signalAmplifierRef.current  // Exposición del amplificador para diagnóstico
  };
}
