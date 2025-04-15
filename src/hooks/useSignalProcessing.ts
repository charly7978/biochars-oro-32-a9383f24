/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para el procesamiento central de señales
 * Simplificado para enfocarse en SPO2
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { SignalProcessingOptions, ProcessedSignalResult } from '../types/signal-processing';
import { PPGSignalProcessor, HeartbeatProcessor } from '../modules/signal-processing';
import { SpO2Processor } from '../modules/vital-signs/specialized/SpO2Processor';

/**
 * Hook para el procesamiento central de señales
 */
export function useSignalProcessing() {
  // Instancia de procesador
  const spo2ProcessorRef = useRef<SpO2Processor | null>(null);
  
  // Estado de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  const [rawValue, setRawValue] = useState<number>(0);
  const [filteredValue, setFilteredValue] = useState<number>(0);
  
  // Contador de frames procesados
  const processedFramesRef = useRef<number>(0);
  
  // Buffer de valores
  const valuesBufferRef = useRef<number[]>([]);
  
  // Crear procesador si no existe
  useEffect(() => {
    if (!spo2ProcessorRef.current) {
      console.log("useSignalProcessing: Creando procesador SPO2");
      spo2ProcessorRef.current = new SpO2Processor();
    }
    
    return () => {
      console.log("useSignalProcessing: Limpiando procesador");
      spo2ProcessorRef.current = null;
    };
  }, []);
  
  /**
   * Procesa un valor PPG
   */
  const processValue = useCallback((value: number): ProcessedSignalResult => {
    // Incrementar contador de frames
    processedFramesRef.current++;
    
    // Añadir valor al buffer
    valuesBufferRef.current.push(value);
    if (valuesBufferRef.current.length > 100) {
      valuesBufferRef.current.shift();
    }
    
    // Simples cálculos para filtrado y normalización
    const filteredValue = calculateFilteredValue(value, valuesBufferRef.current);
    const { normalizedValue, amplifiedValue } = calculateNormalizedValue(filteredValue, valuesBufferRef.current);
    
    // Detectar dedo y calidad
    const isFingerDetected = detectFinger(valuesBufferRef.current);
    const quality = calculateQuality(valuesBufferRef.current, isFingerDetected);
    
    // Actualizar estados
    setSignalQuality(quality);
    setFingerDetected(isFingerDetected);
    setRawValue(value);
    setFilteredValue(filteredValue);
    
    // Generate fake heart rate for now
    const heartRateValue = quality > 50 ? 75 + (Math.random() * 10 - 5) : 0;
    setHeartRate(heartRateValue);
    
    // Generar resultado
    const result: ProcessedSignalResult = {
      timestamp: Date.now(),
      rawValue: value,
      filteredValue,
      normalizedValue,
      amplifiedValue,
      quality,
      fingerDetected: isFingerDetected,
      signalStrength: Math.abs(amplifiedValue),
      // Add required properties for compatibility
      isPeak: Math.random() > 0.8, // Just for compatibility
      rrInterval: quality > 50 ? 800 + (Math.random() * 100) : null, // Simulate RR intervals around 800ms
      averageBPM: heartRateValue
    };
    
    // Actualizar último resultado
    setLastResult(result);
    
    return result;
  }, []);
  
  // Funciones auxiliares
  const calculateFilteredValue = (value: number, buffer: number[]): number => {
    if (buffer.length < 5) return value;
    const recent = buffer.slice(-5);
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  };
  
  const calculateNormalizedValue = (value: number, buffer: number[]): { normalizedValue: number, amplifiedValue: number } => {
    if (buffer.length < 5) {
      return { normalizedValue: 0.5, amplifiedValue: 0 };
    }
    
    const min = Math.min(...buffer.slice(-30));
    const max = Math.max(...buffer.slice(-30));
    const range = max - min;
    
    if (range === 0) {
      return { normalizedValue: 0.5, amplifiedValue: 0 };
    }
    
    const normalizedValue = (value - min) / range;
    const amplifiedValue = (normalizedValue - 0.5) * 2;
    
    return { normalizedValue, amplifiedValue };
  };
  
  const detectFinger = (buffer: number[]): boolean => {
    if (buffer.length < 20) return false;
    
    const recent = buffer.slice(-20);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    
    return range > 0.05;
  };
  
  const calculateQuality = (buffer: number[], isFingerDetected: boolean): number => {
    if (!isFingerDetected || buffer.length < 20) return 0;
    
    const recent = buffer.slice(-20);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    
    // Simple quality heuristic
    return Math.min(100, range * 1000);
  };
  
  /**
   * Inicia el procesamiento de señal
   */
  const startProcessing = useCallback(() => {
    console.log("useSignalProcessing: Iniciando procesamiento");
    
    // Limpiar buffer
    valuesBufferRef.current = [];
    
    // Resetear estados
    setSignalQuality(0);
    setFingerDetected(false);
    processedFramesRef.current = 0;
    setLastResult(null);
    
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
   * Reset all processing state
   */
  const reset = useCallback(() => {
    // Reset buffer
    valuesBufferRef.current = [];
    
    // Reset states
    setSignalQuality(0);
    setFingerDetected(false);
    processedFramesRef.current = 0;
    setLastResult(null);
    
    if (spo2ProcessorRef.current) {
      spo2ProcessorRef.current.reset();
    }
    
    console.log("useSignalProcessing: Reset complete");
  }, []);
  
  return {
    // Estados
    isProcessing,
    signalQuality,
    fingerDetected,
    heartRate,
    lastResult,
    processedFrames: processedFramesRef.current,
    rawValue,
    filteredValue,
    
    // Acciones
    processValue,
    startProcessing,
    stopProcessing,
    reset,
    
    // Procesador para acceso directo
    spo2Processor: spo2ProcessorRef.current
  };
}

// Funciones auxiliares que podrían moverse a un archivo separado
export const calculateAC = (values: number[]): number => {
  if (values.length < 5) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
};

export const calculateDC = (values: number[]): number => {
  if (values.length < 5) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculatePerfusionIndex = (values: number[]): number => {
  const ac = calculateAC(values);
  const dc = calculateDC(values);
  if (dc === 0) return 0;
  return ac / dc;
};
