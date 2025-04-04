
/**
 * HOOK PARA PROCESAMIENTO DE SEÑALES CON REDES NEURONALES
 * SOLO PROCESAMIENTO REAL - NO SIMULACIONES
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { 
  createNeuralProcessor, 
  processTensorSignal, 
  getNeuralNetworkState,
  resetNeuralNetwork
} from '../modules/signal-processing/neural/tensor-processor';
import { useLocalStorage } from './useLocalStorage';

// Resultados del procesamiento neuronal
export interface NeuralProcessingResult {
  timestamp: number;
  value: number;
  processedValue: number;
  confidence: number;
  quality: number;
  features: number[];
  prediction: any;
  heartRate: number | null;
  processingTime: number;
}

// Opciones para el procesador neuronal
export interface NeuralProcessingOptions {
  windowSize?: number;
  sampleRate?: number;
  useWebGL?: boolean;
  useQuantization?: boolean;
  sensibility?: number;
}

/**
 * Hook para procesamiento de señales con redes neuronales
 * Permite procesamiento optimizado en tiempo real
 */
export function useNeuralSignalProcessing() {
  // Opciones guardadas en localStorage
  const [savedOptions, setSavedOptions] = useLocalStorage<NeuralProcessingOptions>(
    'neural-processing-options', 
    { windowSize: 128, sampleRate: 30, useWebGL: true, useQuantization: true, sensibility: 0.5 }
  );
  
  // Estados del hook
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<NeuralProcessingResult | null>(null);
  
  // Referencias
  const signalBuffer = useRef<number[]>([]);
  const processedFrames = useRef<number>(0);
  const heartRateValues = useRef<number[]>([]);
  
  // Inicializar modelo de TensorFlow
  useEffect(() => {
    const initializeNeuralProcessor = async () => {
      try {
        // Asegurar que TensorFlow está disponible
        await tf.ready();
        
        // Crear procesador neuronal
        const success = await createNeuralProcessor({
          windowSize: savedOptions.windowSize,
          sampleRate: savedOptions.sampleRate,
          useWebGL: savedOptions.useWebGL,
          useQuantization: savedOptions.useQuantization
        });
        
        if (success) {
          console.log("Procesador neuronal inicializado correctamente");
          setIsInitialized(true);
        } else {
          console.error("Error inicializando procesador neuronal");
        }
      } catch (error) {
        console.error("Error durante inicialización del modelo neuronal:", error);
      }
    };
    
    if (!isInitialized) {
      initializeNeuralProcessor();
    }
    
    return () => {
      // Limpiar recursos al desmontar
      if (isInitialized) {
        resetNeuralNetwork();
      }
    };
  }, [isInitialized, savedOptions]);
  
  /**
   * Procesa un valor de señal usando el modelo neuronal
   */
  const processValue = useCallback(async (value: number): Promise<NeuralProcessingResult | null> => {
    if (!isInitialized || !isProcessing) {
      return null;
    }
    
    try {
      // Añadir valor al buffer
      signalBuffer.current.push(value);
      
      // Mantener tamaño del buffer
      if (signalBuffer.current.length > savedOptions.windowSize!) {
        signalBuffer.current.shift();
      }
      
      // Incrementar contador de frames
      processedFrames.current++;
      
      // Procesar solo si tenemos suficientes muestras
      if (signalBuffer.current.length < Math.min(10, savedOptions.windowSize! / 10)) {
        return null;
      }
      
      // Timestamp para mediciones
      const timestamp = Date.now();
      
      // Procesar con el modelo neuronal
      const result = await processTensorSignal(
        signalBuffer.current,
        timestamp
      );
      
      // Calcular calidad de señal basada en confianza
      const quality = Math.round(result.confidence * 100);
      
      // Estimar frecuencia cardíaca de manera simple si tenemos suficientes datos
      let heartRate: number | null = null;
      
      if (result.confidence > 0.6 && result.processedValue > 0.1) {
        // Aproximación básica usando cruces por cero
        let zeroCrossings = 0;
        const mean = signalBuffer.current.reduce((sum, val) => sum + val, 0) / signalBuffer.current.length;
        
        for (let i = 1; i < signalBuffer.current.length; i++) {
          if ((signalBuffer.current[i] > mean && signalBuffer.current[i-1] <= mean) ||
              (signalBuffer.current[i] <= mean && signalBuffer.current[i-1] > mean)) {
            zeroCrossings++;
          }
        }
        
        // Estimar BPM basado en cruces por cero y tasa de muestreo
        const timeWindowSeconds = signalBuffer.current.length / savedOptions.sampleRate!;
        const estimatedBPM = (zeroCrossings / 2) * (60 / timeWindowSeconds);
        
        // Validar BPM dentro de rangos fisiológicos
        if (estimatedBPM >= 40 && estimatedBPM <= 200) {
          heartRateValues.current.push(estimatedBPM);
          
          // Mantener histórico de valores recientes
          if (heartRateValues.current.length > 10) {
            heartRateValues.current.shift();
          }
          
          // Calcular promedio de BPM recientes
          if (heartRateValues.current.length >= 3) {
            // Ordenar valores para eliminar outliers
            const sortedValues = [...heartRateValues.current].sort((a, b) => a - b);
            // Usar valores centrales (eliminar extremos)
            const centralValues = sortedValues.slice(1, -1);
            // Calcular promedio
            heartRate = centralValues.reduce((sum, val) => sum + val, 0) / centralValues.length;
            heartRate = Math.round(heartRate);
          } else {
            heartRate = Math.round(estimatedBPM);
          }
        }
      }
      
      // Crear resultado del procesamiento
      const processingResult: NeuralProcessingResult = {
        timestamp,
        value,
        processedValue: result.processedValue,
        confidence: result.confidence,
        quality,
        features: result.features,
        prediction: result.prediction,
        heartRate,
        processingTime: result.processingTime
      };
      
      // Actualizar último resultado
      setLastResult(processingResult);
      
      return processingResult;
    } catch (error) {
      console.error("Error procesando valor con modelo neuronal:", error);
      return null;
    }
  }, [isInitialized, isProcessing, savedOptions]);
  
  /**
   * Inicia el procesamiento neuronal
   */
  const startProcessing = useCallback(() => {
    if (!isInitialized) {
      console.warn("No se puede iniciar procesamiento: modelo no inicializado");
      return false;
    }
    
    // Limpiar buffer y contadores
    signalBuffer.current = [];
    processedFrames.current = 0;
    heartRateValues.current = [];
    
    // Iniciar procesamiento
    setIsProcessing(true);
    console.log("Procesamiento neuronal iniciado");
    return true;
  }, [isInitialized]);
  
  /**
   * Detiene el procesamiento neuronal
   */
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    console.log("Procesamiento neuronal detenido");
  }, []);
  
  /**
   * Configura el procesador neuronal
   */
  const configureProcessor = useCallback((options: NeuralProcessingOptions) => {
    // Guardar opciones en localStorage
    setSavedOptions(prevOptions => ({
      ...prevOptions,
      ...options
    }));
    
    console.log("Configuración del procesador neuronal actualizada", options);
  }, [setSavedOptions]);
  
  /**
   * Obtiene estadísticas del procesador neuronal
   */
  const getStatistics = useCallback(() => {
    return {
      processedFrames: processedFrames.current,
      bufferSize: signalBuffer.current.length,
      neuralState: getNeuralNetworkState(),
      confidence: lastResult?.confidence || 0,
      lastProcessingTime: lastResult?.processingTime || 0,
      averageHeartRate: heartRateValues.current.length > 0
        ? heartRateValues.current.reduce((sum, val) => sum + val, 0) / heartRateValues.current.length
        : null
    };
  }, [lastResult]);
  
  return {
    isInitialized,
    isProcessing,
    lastResult,
    processValue,
    startProcessing,
    stopProcessing,
    configureProcessor,
    getStatistics,
    options: savedOptions
  };
}
