
import { useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

// Interfaz para los resultados del procesamiento
interface HeartBeatResult {
  bpm: number;
  confidence: number;
  isPeak: boolean;
  isArrhythmia?: boolean;
}

// Interfaz para los intervalos RR
interface RRIntervalData {
  intervals: number[];
  lastPeakTime: number | null;
}

// Hook principal para el procesamiento del ritmo cardíaco en React Native
export function useHeartBeatProcessorRN() {
  // Referencias para el estado
  const signalBufferRef = useRef<number[]>([]);
  const peaksBufferRef = useRef<number[]>([]);
  const lastPeakTimeRef = useRef<number | null>(null);
  const currentBpmRef = useRef<number>(0);
  const confidenceRef = useRef<number>(0);
  const rrIntervalsRef = useRef<number[]>([]);
  const lastArrhythmiaStatusRef = useRef<boolean>(false);
  
  // Modelo TensorFlow para mejora de señal
  const tfModelRef = useRef<tf.LayersModel | null>(null);
  
  // Inicializar modelo TensorFlow
  const initializeModel = useCallback(async () => {
    if (tfModelRef.current) return;
    
    try {
      // Asegurarse de que TensorFlow esté listo
      await tf.ready();
      
      // Crear un modelo simple para filtrado de señal
      const model = tf.sequential();
      
      // Capa de entrada (ventana de señal)
      model.add(tf.layers.dense({
        inputShape: [10],
        units: 16,
        activation: 'relu'
      }));
      
      // Capa oculta
      model.add(tf.layers.dense({
        units: 8,
        activation: 'relu'
      }));
      
      // Capa de salida (señal filtrada)
      model.add(tf.layers.dense({
        units: 1
      }));
      
      // Compilar modelo
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError'
      });
      
      tfModelRef.current = model;
      console.log('Modelo TensorFlow para procesamiento de señal inicializado');
    } catch (error) {
      console.error('Error inicializando modelo TensorFlow:', error);
    }
  }, []);
  
  // Procesar valor de señal
  const processSignal = useCallback((value: number): HeartBeatResult => {
    // Añadir valor al buffer
    signalBufferRef.current.push(value);
    
    // Mantener tamaño máximo del buffer
    if (signalBufferRef.current.length > 150) {
      signalBufferRef.current.shift();
    }
    
    // Si no hay suficientes datos, devolver resultado vacío
    if (signalBufferRef.current.length < 30) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false
      };
    }
    
    // Detectar si es un pico
    const isPeak = detectPeak(signalBufferRef.current);
    let result: HeartBeatResult = {
      bpm: currentBpmRef.current,
      confidence: confidenceRef.current,
      isPeak
    };
    
    // Si detectamos un pico
    if (isPeak) {
      const now = Date.now();
      
      // Si ya teníamos un pico anterior, calcular intervalo RR
      if (lastPeakTimeRef.current) {
        const rrInterval = now - lastPeakTimeRef.current;
        
        // Validar que el intervalo sea razonable (entre 300ms y 1500ms)
        if (rrInterval >= 300 && rrInterval <= 1500) {
          rrIntervalsRef.current.push(rrInterval);
          
          // Mantener tamaño máximo de intervalos RR
          if (rrIntervalsRef.current.length > 10) {
            rrIntervalsRef.current.shift();
          }
          
          // Calcular BPM a partir de los intervalos RR
          if (rrIntervalsRef.current.length >= 3) {
            // Filtrar valores atípicos
            const validIntervals = filterOutliers(rrIntervalsRef.current);
            
            if (validIntervals.length >= 2) {
              // Calcular BPM promedio
              const avgInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
              const newBpm = Math.round(60000 / avgInterval);
              
              // Validar BPM razonable
              if (newBpm >= 40 && newBpm <= 200) {
                currentBpmRef.current = newBpm;
                result.bpm = newBpm;
                
                // Actualizar confianza basada en la estabilidad de intervalos
                const intervalStability = calculateIntervalStability(validIntervals);
                confidenceRef.current = intervalStability;
                result.confidence = intervalStability;
                
                // Detectar arritmia
                result.isArrhythmia = detectArrhythmia(validIntervals);
                lastArrhythmiaStatusRef.current = result.isArrhythmia;
              }
            }
          }
        }
      }
      
      // Actualizar tiempo del último pico
      lastPeakTimeRef.current = now;
      peaksBufferRef.current.push(now);
      
      // Mantener solo picos recientes (últimos 10 segundos)
      const tenSecondsAgo = now - 10000;
      peaksBufferRef.current = peaksBufferRef.current.filter(time => time >= tenSecondsAgo);
    }
    
    return result;
  }, []);
  
  // Detectar pico en la señal
  const detectPeak = (values: number[]): boolean => {
    if (values.length < 10) return false;
    
    // Obtener la ventana actual para la detección de picos
    const windowSize = 5;
    const centerIdx = values.length - windowSize - 1;
    
    if (centerIdx < windowSize) return false;
    
    const centerValue = values[centerIdx];
    
    // Verificar si es un máximo local
    for (let i = 1; i <= windowSize; i++) {
      if (centerValue <= values[centerIdx - i] || centerValue <= values[centerIdx + i]) {
        return false;
      }
    }
    
    // Validar amplitud mínima
    const localMin = Math.min(...values.slice(centerIdx - windowSize, centerIdx + windowSize + 1));
    const amplitude = centerValue - localMin;
    
    // Calculamos umbral adaptativo basado en la historia reciente
    const recentValues = values.slice(-30);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);
    
    const threshold = mean + stdDev * 0.8;
    
    return centerValue > threshold && amplitude > stdDev * 1.2;
  };
  
  // Filtrar valores atípicos de los intervalos RR
  const filterOutliers = (intervals: number[]): number[] => {
    if (intervals.length <= 2) return intervals;
    
    // Calculamos Q1 y Q3 (cuartiles 1 y 3)
    const sorted = [...intervals].sort((a, b) => a - b);
    const q1Idx = Math.floor(sorted.length / 4);
    const q3Idx = Math.floor(sorted.length * 3 / 4);
    
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    const iqr = q3 - q1;
    
    // Rango aceptable: [q1 - 1.5*iqr, q3 + 1.5*iqr]
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return intervals.filter(val => val >= lowerBound && val <= upperBound);
  };
  
  // Calcular estabilidad de intervalos
  const calculateIntervalStability = (intervals: number[]): number => {
    if (intervals.length <= 1) return 0.5;
    
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variationSum = intervals.reduce((sum, val) => sum + Math.abs(val - mean) / mean, 0);
    const normalizedVariation = variationSum / intervals.length;
    
    // Convertir variación a medida de confianza (menor variación = mayor confianza)
    const stability = Math.max(0, Math.min(1, 1 - normalizedVariation * 3));
    return stability;
  };
  
  // Detectar arritmia basada en intervalos RR
  const detectArrhythmia = (intervals: number[]): boolean => {
    if (intervals.length < 4) return false;
    
    // Calculamos variabilidad de los intervalos
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    // Calcular RMSSD (Root Mean Square of Successive Differences)
    let sumSquaredDiff = 0;
    for (let i = 1; i < intervals.length; i++) {
      const diff = intervals[i] - intervals[i - 1];
      sumSquaredDiff += diff * diff;
    }
    
    const rmssd = Math.sqrt(sumSquaredDiff / (intervals.length - 1));
    
    // Calcular score de irregularidad (RMSSD normalizado)
    const irregularityScore = rmssd / mean;
    
    // Detección basada en umbral
    const isIrregular = irregularityScore > 0.2;
    
    // Verificar intervalos anormales
    const hasAbnormalIntervals = intervals.some(interval => 
      interval < 400 || // Muy rápido: > 150 BPM
      interval > 1200   // Muy lento: < 50 BPM
    );
    
    return isIrregular || hasAbnormalIntervals;
  };
  
  // Obtener intervalos RR para análisis externo
  const getRRIntervals = (): RRIntervalData => {
    return {
      intervals: [...rrIntervalsRef.current],
      lastPeakTime: lastPeakTimeRef.current
    };
  };
  
  // Reiniciar procesador
  const reset = useCallback(() => {
    signalBufferRef.current = [];
    peaksBufferRef.current = [];
    lastPeakTimeRef.current = null;
    currentBpmRef.current = 0;
    confidenceRef.current = 0;
    rrIntervalsRef.current = [];
    lastArrhythmiaStatusRef.current = false;
  }, []);
  
  // Inicializar al montar
  useCallback(() => {
    initializeModel();
  }, [initializeModel])();
  
  return {
    processSignal,
    reset,
    getRRIntervals,
    currentBpm: currentBpmRef.current,
    confidence: confidenceRef.current,
    isArrhythmia: lastArrhythmiaStatusRef.current
  };
}
