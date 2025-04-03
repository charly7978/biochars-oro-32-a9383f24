
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook mejorado para detección de latidos cardíacos
 * Usa algoritmos adaptativos para mejor detección en señales reales
 */
import { useState, useRef, useCallback } from 'react';
import { resetSignalQualityState } from './signal-processing/signal-quality';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Parámetros optimizados para detección de latidos
const PEAK_DETECTION_THRESHOLD = 0.15;
const MIN_PEAK_DISTANCE_MS = 300; // Mínimo tiempo entre picos (200ms = 300bpm máximo)
const MAX_PEAK_DISTANCE_MS = 1500; // Máximo tiempo entre picos (1500ms = 40bpm mínimo)
const BPM_SMOOTHING_FACTOR = 0.3; // Factor de suavizado para BPM
const MAX_INTERVALS_STORED = 10; // Cantidad de intervalos RR a almacenar

/**
 * Hook para detección precisa de latidos cardíacos
 */
export function useHeartbeatDetector() {
  // Estado interno de detección
  const valuesBuffer = useRef<number[]>([]);
  const peakTimestamps = useRef<number[]>([]);
  const rrIntervals = useRef<number[]>([]);
  const lastPeakTime = useRef<number | null>(null);
  const lastBpm = useRef<number>(0);
  const adaptiveThreshold = useRef<number>(PEAK_DETECTION_THRESHOLD);
  const consecutiveWeakSignals = useRef<number>(0);
  
  /**
   * Procesa un valor de señal y detecta latidos
   */
  const processValue = useCallback((value: number) => {
    try {
      const now = Date.now();
      
      // Almacenar valor en buffer
      valuesBuffer.current.push(value);
      if (valuesBuffer.current.length > 30) {
        valuesBuffer.current.shift();
      }
      
      // Verificar si hay suficientes valores para procesar
      if (valuesBuffer.current.length < 5) {
        return {
          bpm: lastBpm.current,
          confidence: 0,
          isPeak: false,
          rrIntervals: rrIntervals.current,
          peaks: peakTimestamps.current.map(t => ({ time: t, value: 0 }))
        };
      }
      
      // Ajustar umbral adaptativo basado en amplitud reciente
      updateAdaptiveThreshold(valuesBuffer.current);
      
      // Detectar pico con umbral adaptativo
      const isPeak = detectPeak(value, valuesBuffer.current, adaptiveThreshold.current);
      let currentBpm = lastBpm.current;
      let confidence = 0;
      
      // Si es un pico, actualizar intervalo RR y BPM
      if (isPeak) {
        const lastPeakTimeValue = lastPeakTime.current;
        
        // Verificar que el tiempo entre picos sea fisiológicamente plausible
        if (lastPeakTimeValue && 
            now - lastPeakTimeValue >= MIN_PEAK_DISTANCE_MS && 
            now - lastPeakTimeValue <= MAX_PEAK_DISTANCE_MS) {
          // Calcular intervalo RR en ms
          const rrInterval = now - lastPeakTimeValue;
          
          // Almacenar intervalo
          rrIntervals.current.push(rrInterval);
          if (rrIntervals.current.length > MAX_INTERVALS_STORED) {
            rrIntervals.current.shift();
          }
          
          // Calcular BPM a partir de intervalo RR
          const instantBpm = 60000 / rrInterval;
          
          // Suavizar BPM para evitar fluctuaciones bruscas
          if (lastBpm.current > 0) {
            currentBpm = (1 - BPM_SMOOTHING_FACTOR) * lastBpm.current + 
                         BPM_SMOOTHING_FACTOR * instantBpm;
          } else {
            currentBpm = instantBpm;
          }
          
          // Validar rango fisiológico
          if (currentBpm >= 40 && currentBpm <= 180) {
            lastBpm.current = currentBpm;
            
            // Calcular consistencia de intervalos para confianza
            confidence = calculateConfidence(rrIntervals.current);
          }
        }
        
        // Almacenar tiempo del pico actual
        lastPeakTime.current = now;
        peakTimestamps.current.push(now);
        
        // Mantener solo timestamps recientes
        const maxAge = 10000; // 10 segundos
        peakTimestamps.current = peakTimestamps.current.filter(
          t => now - t < maxAge
        );
        
        // Reiniciar contador de señales débiles
        consecutiveWeakSignals.current = 0;
      } else {
        // Incrementar contador de señales débiles
        const signalStrength = Math.abs(value);
        if (signalStrength < adaptiveThreshold.current * 0.5) {
          consecutiveWeakSignals.current++;
        } else {
          // Reducir contador gradualmente con señales buenas
          consecutiveWeakSignals.current = Math.max(0, consecutiveWeakSignals.current - 0.5);
        }
        
        // Si hay demasiadas señales débiles consecutivas, reducir confianza
        if (consecutiveWeakSignals.current > 20) {
          confidence = Math.max(0, confidence - 0.1);
        }
      }
      
      // Calcular confianza si no hay BPM todavía pero hay picos
      if (confidence === 0 && peakTimestamps.current.length >= 3) {
        confidence = 0.3; // Confianza mínima con algunos picos
      }
      
      // Log para debugging
      if (isPeak || (valuesBuffer.current.length % 100 === 0)) {
        logError(
          `HeartbeatDetector: ${isPeak ? 'PICO DETECTADO' : 'procesando'}, BPM=${Math.round(currentBpm)}, confianza=${confidence.toFixed(2)}`,
          isPeak ? ErrorLevel.INFO : ErrorLevel.DEBUG,
          "HeartbeatDetector"
        );
      }
      
      return {
        bpm: currentBpm,
        confidence,
        isPeak,
        rrIntervals: rrIntervals.current,
        peaks: peakTimestamps.current.map(t => ({ time: t, value: 0 }))
      };
    } catch (error) {
      logError(
        `Error en HeartbeatDetector: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        "HeartbeatDetector"
      );
      
      return {
        bpm: lastBpm.current,
        confidence: 0,
        isPeak: false,
        rrIntervals: [],
        peaks: []
      };
    }
  }, []);
  
  /**
   * Reinicia el detector de latidos
   */
  const reset = useCallback(() => {
    valuesBuffer.current = [];
    peakTimestamps.current = [];
    rrIntervals.current = [];
    lastPeakTime.current = null;
    lastBpm.current = 0;
    adaptiveThreshold.current = PEAK_DETECTION_THRESHOLD;
    consecutiveWeakSignals.current = 0;
    
    // Resetear también estado de calidad de señal
    resetSignalQualityState();
    
    logError(
      "HeartbeatDetector: Reset completo",
      ErrorLevel.INFO,
      "HeartbeatDetector"
    );
  }, []);
  
  /**
   * Actualiza el umbral adaptativo basado en la amplitud reciente
   */
  const updateAdaptiveThreshold = (values: number[]) => {
    if (values.length < 5) return;
    
    try {
      // Calcular amplitud del buffer reciente
      const recentValues = values.slice(-10);
      const min = Math.min(...recentValues);
      const max = Math.max(...recentValues);
      const amplitude = max - min;
      
      // Ajustar umbral basado en amplitud (15-30% de la amplitud)
      const baseThreshold = PEAK_DETECTION_THRESHOLD;
      const newThreshold = Math.max(
        baseThreshold,
        Math.min(amplitude * 0.3, baseThreshold * 3)
      );
      
      // Suavizado para evitar cambios bruscos
      adaptiveThreshold.current = adaptiveThreshold.current * 0.8 + newThreshold * 0.2;
    } catch (error) {
      // Mantener umbral actual en caso de error
    }
  };
  
  /**
   * Detecta si el valor actual es un pico en la señal
   */
  const detectPeak = (value: number, values: number[], threshold: number): boolean => {
    if (values.length < 5) return false;
    
    // Verificar si es mayor que el umbral
    if (value < threshold) return false;
    
    // Verificar si es mayor que los valores anterior y posterior
    const prev1 = values[values.length - 2] || 0;
    const prev2 = values[values.length - 3] || 0;
    
    // El valor debe ser mayor que los anteriores
    if (value <= prev1 || value <= prev2) return false;
    
    // Verificar que haya pasado suficiente tiempo desde el último pico
    const now = Date.now();
    if (lastPeakTime.current && now - lastPeakTime.current < MIN_PEAK_DISTANCE_MS) {
      return false;
    }
    
    return true;
  };
  
  /**
   * Calcula la confianza en la detección basada en la consistencia de intervalos
   */
  const calculateConfidence = (intervals: number[]): number => {
    if (intervals.length < 3) return 0.3;
    
    try {
      // Calcular media y desviación estándar de intervalos
      const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const squaredDiffs = intervals.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      
      // Calcular coeficiente de variación (menor = más consistente)
      const cv = stdDev / mean;
      
      // Convertir a confianza (0-1)
      // CV < 0.05 es excelente (confianza > 0.9)
      // CV > 0.2 es pobre (confianza < 0.5)
      const confidence = Math.max(0, Math.min(1, 1 - cv * 5));
      
      return confidence;
    } catch (error) {
      return 0.3; // Valor por defecto en caso de error
    }
  };
  
  return {
    processValue,
    reset
  };
}
