
/**
 * Hook integrado para procesamiento de latidos cardíacos con redes neuronales
 * SOLO PROCESAMIENTO REAL - NO SIMULACIÓN
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSignalProcessing } from './useSignalProcessing';
import { useNeuralSignalProcessing } from './useNeuralSignalProcessing';

export interface IntegratedHeartbeatResult {
  timestamp: number;
  rawValue: number;
  filteredValue: number;
  neuralValue: number | null;
  heartRate: number | null;
  neuralHeartRate: number | null;
  quality: number;
  confidence: number;
  fingerDetected: boolean;
  isPeak: boolean;
}

export function useHeartbeatWithNeuralProcessing() {
  // Hooks de procesamiento
  const signalProcessing = useSignalProcessing();
  const neuralProcessing = useNeuralSignalProcessing();
  
  // Estado
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedHeartbeatResult | null>(null);
  
  // Referencias
  const processedFrames = useRef<number>(0);
  const rawValueBuffer = useRef<number[]>([]);
  const filteredValueBuffer = useRef<number[]>([]);
  const neuralValueBuffer = useRef<number[]>([]);
  
  // Iniciar ambos procesadores cuando se inicia el monitoreo
  useEffect(() => {
    if (isMonitoring) {
      signalProcessing.startProcessing();
      neuralProcessing.startProcessing();
    } else {
      signalProcessing.stopProcessing();
      neuralProcessing.stopProcessing();
    }
    
    return () => {
      signalProcessing.stopProcessing();
      neuralProcessing.stopProcessing();
    };
  }, [isMonitoring, signalProcessing, neuralProcessing]);
  
  /**
   * Procesa un valor de señal usando ambos procesadores
   */
  const processValue = useCallback(async (value: number): Promise<IntegratedHeartbeatResult | null> => {
    if (!isMonitoring) return null;
    
    try {
      // Incrementar contador
      processedFrames.current++;
      
      // Guardar valor crudo en buffer
      rawValueBuffer.current.push(value);
      if (rawValueBuffer.current.length > 300) rawValueBuffer.current.shift();
      
      // 1. Procesar con el procesador de señal estándar
      const processedSignal = signalProcessing.processValue(value);
      
      // Si hay resultado del procesador estándar
      if (processedSignal) {
        // Guardar valor filtrado en buffer
        filteredValueBuffer.current.push(processedSignal.filteredValue);
        if (filteredValueBuffer.current.length > 300) filteredValueBuffer.current.shift();
        
        // 2. Procesar con el procesador neuronal si tenemos suficientes datos
        let neuralResult = null;
        if (neuralProcessing.isInitialized && filteredValueBuffer.current.length > 30) {
          neuralResult = await neuralProcessing.processValue(processedSignal.filteredValue);
          
          if (neuralResult) {
            // Guardar valor neuronal en buffer
            neuralValueBuffer.current.push(neuralResult.processedValue);
            if (neuralValueBuffer.current.length > 300) neuralValueBuffer.current.shift();
          }
        }
        
        // 3. Integrar resultados
        const combinedResult: IntegratedHeartbeatResult = {
          timestamp: processedSignal.timestamp,
          rawValue: value,
          filteredValue: processedSignal.filteredValue,
          neuralValue: neuralResult?.processedValue || null,
          heartRate: processedSignal.averageBPM,
          neuralHeartRate: neuralResult?.heartRate || null,
          quality: processedSignal.quality,
          confidence: neuralResult?.confidence || processedSignal.quality / 100,
          fingerDetected: processedSignal.fingerDetected,
          isPeak: processedSignal.isPeak
        };
        
        // Actualizar último resultado
        setLastResult(combinedResult);
        
        return combinedResult;
      }
      
      return null;
    } catch (error) {
      console.error("Error procesando valor en integración:", error);
      return null;
    }
  }, [isMonitoring, signalProcessing, neuralProcessing]);
  
  /**
   * Inicia el monitoreo integrado
   */
  const startMonitoring = useCallback(() => {
    // Resetear buffers
    rawValueBuffer.current = [];
    filteredValueBuffer.current = [];
    neuralValueBuffer.current = [];
    processedFrames.current = 0;
    
    // Iniciar monitoreo
    setIsMonitoring(true);
    console.log("Monitoreo integrado iniciado");
  }, []);
  
  /**
   * Detiene el monitoreo integrado
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log("Monitoreo integrado detenido");
  }, []);
  
  /**
   * Obtiene todos los buffers para visualización
   */
  const getVisualBuffers = useCallback(() => {
    return {
      raw: [...rawValueBuffer.current],
      filtered: [...filteredValueBuffer.current],
      neural: [...neuralValueBuffer.current]
    };
  }, []);
  
  /**
   * Obtiene estadísticas combinadas
   */
  const getStatistics = useCallback(() => {
    return {
      processedFrames: processedFrames.current,
      signalQuality: signalProcessing.signalQuality,
      neuralConfidence: neuralProcessing.lastResult?.confidence || 0,
      neuralProcessingTime: neuralProcessing.lastResult?.processingTime || 0,
      standardHeartRate: signalProcessing.heartRate,
      neuralHeartRate: neuralProcessing.lastResult?.heartRate || 0,
      tensorBackend: neuralProcessing.isInitialized ? 'Activo' : 'Inactivo'
    };
  }, [signalProcessing, neuralProcessing]);
  
  return {
    isMonitoring,
    isNeuralInitialized: neuralProcessing.isInitialized,
    lastResult,
    processValue,
    startMonitoring,
    stopMonitoring,
    getVisualBuffers,
    getStatistics,
    rawBuffer: rawValueBuffer.current,
    filteredBuffer: filteredValueBuffer.current,
    neuralBuffer: neuralValueBuffer.current
  };
}
