
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook mejorado para procesamiento de señales con monitoreo de calidad
 * Conecta el extractor con los procesadores y monitorea calidad en tiempo real
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPPGSignalProcessor } from '../modules/signal-processing/ppg-processor';
import { ProcessedPPGSignal } from '../modules/signal-processing/types';
import { resetFingerDetector } from '../modules/signal-processing/utils/finger-detector';
import { SignalQualityMonitor, AlgorithmFeedback, SignalQualityMetrics } from '../modules/signal-processing/utils/signal-quality-monitor';
import { useHeartbeatDetector } from './heart-beat/useHeartbeatDetector';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Configuración por defecto del procesador
const DEFAULT_CONFIG = {
  filterStrength: 0.25,
  amplificationFactor: 1.2,
  bufferSize: 30,
  adaptationRate: 0.1,
  sampleRate: 30
};

// Interfaz de resultado del procesamiento
export interface ProcessedSignalResult {
  // Metadatos de procesamiento
  timestamp: number;
  fingerDetected: boolean;
  quality: number;
  
  // Valores de señal
  rawValue: number;
  filteredValue: number;
  amplifiedValue: number;
  
  // Análisis cardíaco
  averageBPM: number | null;
  isPeak: boolean;
  rrInterval: number | null;
  
  // Métricas avanzadas de calidad
  qualityMetrics: SignalQualityMetrics | null;
  qualityAlertActive: boolean;
  problemAlgorithms: {algorithm: string, issues: string[], quality: number}[];
  detailedDiagnostics: boolean;
}

/**
 * Hook para procesamiento avanzado de señales con diagnóstico de calidad
 */
export function useSignalProcessor() {
  // Procesador PPG y detector de latidos
  const processorRef = useRef(createPPGSignalProcessor());
  const heartbeatDetector = useHeartbeatDetector();
  
  // Estado de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastProcessedValue, setLastProcessedValue] = useState<number | null>(null);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<number>(0);
  
  // Contador de frames procesados
  const processedFramesRef = useRef<number>(0);
  const framesWithFingerRef = useRef<number>(0);
  
  // Buffer de valores procesados
  const processedValuesRef = useRef<number[]>([]);
  const bufferedPeaksRef = useRef<{time: number, value: number}[]>([]);
  
  // Monitor de calidad de señal
  const qualityMonitorRef = useRef(new SignalQualityMonitor());
  
  // Estado avanzado de calidad
  const [qualityMetrics, setQualityMetrics] = useState<SignalQualityMetrics | null>(null);
  const [isQualityAlertActive, setIsQualityAlertActive] = useState<boolean>(false);
  const [problemAlgorithms, setProblemAlgorithms] = useState<{algorithm: string, issues: string[], quality: number}[]>([]);
  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState<boolean>(false);
  
  /**
   * Inicializa el monitor de calidad
   */
  const initializeQualityMonitor = useCallback(() => {
    qualityMonitorRef.current.initialize({
      generalThreshold: 40,
      stabilityThreshold: 60,
      periodicityThreshold: 65,
      noiseLevelThreshold: 30,
      minAlgorithmQuality: 40
    });
    
    // Resetear estados de calidad
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
  }, []);
  
  /**
   * Configura el procesador de señales
   */
  const configureProcessor = useCallback((config: {
    filterStrength?: number;
    amplificationFactor?: number;
    bufferSize?: number;
    adaptationRate?: number;
  }) => {
    try {
      // Actualizar configuración de procesador
      processorRef.current.configure({
        filterStrength: config.filterStrength,
        qualityThreshold: 30,
        fingerDetectionSensitivity: 0.7,
        amplificationFactor: config.amplificationFactor
      });
      
      // Configurar el monitor de calidad
      if (config.adaptationRate) {
        qualityMonitorRef.current.setAdaptationRate(config.adaptationRate);
      }
      
      // Resetear buffers por seguridad
      processedValuesRef.current = [];
      bufferedPeaksRef.current = [];
      
      logError(
        `Procesador configurado: ${JSON.stringify(config)}`,
        ErrorLevel.INFO,
        "SignalProcessor"
      );
    } catch (error) {
      logError(
        `Error configurando procesador: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        "SignalProcessor"
      );
    }
  }, []);
  
  /**
   * Recibe retroalimentación de algoritmos para mejorar calidad
   */
  const sendAlgorithmFeedback = useCallback((feedback: AlgorithmFeedback) => {
    try {
      // Enviar feedback al monitor de calidad
      const result = qualityMonitorRef.current.receiveFeedback(feedback);
      
      // Actualizar métricas de calidad
      setQualityMetrics(result.metrics);
      
      // Si hay alerta de calidad, mostrar diagnóstico detallado
      if (result.isAlertActive && !isQualityAlertActive) {
        setIsQualityAlertActive(true);
        setShowDetailedDiagnostics(true);
        
        // Registrar problema en log
        logError(
          `Alerta de calidad activa: ${result.problemAlgorithms.length} algoritmos con problemas`,
          ErrorLevel.WARNING,
          "QualityMonitor"
        );
      } else if (!result.isAlertActive && isQualityAlertActive) {
        setIsQualityAlertActive(false);
        
        // Si no hay más problemas, ocultar diagnóstico después de un tiempo
        setTimeout(() => {
          if (!isQualityAlertActive) {
            setShowDetailedDiagnostics(false);
          }
        }, 5000);
      }
      
      // Actualizar lista de algoritmos con problemas
      setProblemAlgorithms(result.problemAlgorithms);
      
      // Si hay recomendaciones para el procesador, aplicarlas
      if (feedback.recommendations && Object.keys(feedback.recommendations).length > 0) {
        const { filterStrength, amplificationFactor } = feedback.recommendations;
        
        if (filterStrength) {
          configureProcessor({ filterStrength });
        }
        
        if (amplificationFactor) {
          configureProcessor({ amplificationFactor });
        }
      }
      
      return result;
    } catch (error) {
      logError(
        `Error procesando feedback de algoritmo: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        "QualityMonitor"
      );
      return null;
    }
  }, [configureProcessor, isQualityAlertActive]);
  
  /**
   * Actualiza métricas cardíacas desde los latidos detectados
   */
  const updateCardiacMetrics = useCallback((
    peaks: {time: number, value: number}[],
    heartRate: number,
    intervals: number[]
  ) => {
    try {
      // Si no hay suficientes datos, no enviar feedback
      if (peaks.length < 3 || heartRate <= 0) return;
      
      // Calcular estabilidad del ritmo
      let rhythmStability = 0;
      if (intervals.length >= 3) {
        // Calcular varianza de los intervalos
        const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
        
        // Normalizar a un valor de 0-100 (menos varianza = mayor estabilidad)
        rhythmStability = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / mean) * 100));
      }
      
      // Determinar calidad del pulso basada en recencia y fuerza de picos
      const recentPeaks = peaks.filter(p => Date.now() - p.time < 5000);
      const pulseQuality = recentPeaks.length < 3 ? 
        40 : // Calidad baja si hay pocos picos
        Math.min(100, 60 + recentPeaks.length * 5); // Aumenta con más picos
      
      // Enviar retroalimentación al monitor de calidad
      sendAlgorithmFeedback({
        algorithm: "CardiacAnalyzer",
        qualityScore: (rhythmStability + pulseQuality) / 2,
        timestamp: Date.now(),
        issues: rhythmStability < 60 ? ["Ritmo cardíaco irregular"] : [],
        recommendations: {
          cardiac: {
            pulseQuality,
            rhythmStability
          }
        }
      });
    } catch (error) {
      logError(
        `Error actualizando métricas cardíacas: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        "CardiacMetrics"
      );
    }
  }, [sendAlgorithmFeedback]);
  
  /**
   * Procesa un valor de señal PPG
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing) return null;
    
    try {
      processedFramesRef.current++;
      
      // Procesar con el procesador PPG
      const processed = processorRef.current.processSignal(value);
      
      // Almacenar valor procesado
      processedValuesRef.current.push(processed.filteredValue);
      if (processedValuesRef.current.length > 30) {
        processedValuesRef.current.shift();
      }
      
      // Actualizar estado interno
      setLastProcessedValue(processed.filteredValue);
      setFingerDetected(processed.fingerDetected);
      setSignalQuality(processed.quality);
      
      // Procesar solo si se detecta dedo
      let heartbeatResult = {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        rrIntervals: [] as number[],
        peaks: [] as {time: number, value: number}[]
      };
      
      if (processed.fingerDetected) {
        framesWithFingerRef.current++;
        
        // Procesar para detección de latidos
        heartbeatResult = heartbeatDetector.processValue(processed.amplifiedValue);
        
        // Si hay un pico, almacenarlo
        if (heartbeatResult.isPeak) {
          bufferedPeaksRef.current.push({
            time: Date.now(),
            value: processed.amplifiedValue
          });
          
          // Mantener solo picos recientes
          const now = Date.now();
          bufferedPeaksRef.current = bufferedPeaksRef.current.filter(
            peak => now - peak.time < 10000
          );
        }
        
        // Actualizar frecuencia cardíaca
        if (heartbeatResult.bpm > 0) {
          setHeartRate(heartbeatResult.bpm);
        }
        
        // Actualizar métricas cardíacas cada 10 frames o cuando hay pico
        if (processedFramesRef.current % 10 === 0 || heartbeatResult.isPeak) {
          updateCardiacMetrics(
            bufferedPeaksRef.current,
            heartbeatResult.bpm,
            heartbeatResult.rrIntervals
          );
        }
      }
      
      // Actualizar monitor de calidad global cada 5 frames
      if (processedFramesRef.current % 5 === 0) {
        const qualityData = {
          signalStrength: processed.signalStrength,
          stability: calculateSignalStability(processedValuesRef.current),
          periodicity: heartbeatResult.confidence * 100,
          noiseLevel: 100 - processed.quality
        };
        
        const qualityResult = qualityMonitorRef.current.updateMetrics(qualityData);
        setQualityMetrics(qualityResult.metrics);
        setIsQualityAlertActive(qualityResult.isAlertActive);
        setProblemAlgorithms(qualityResult.problemAlgorithms);
      }
      
      // Resultado final del procesamiento
      return {
        timestamp: processed.timestamp,
        fingerDetected: processed.fingerDetected,
        quality: processed.quality,
        
        rawValue: processed.rawValue,
        filteredValue: processed.filteredValue,
        amplifiedValue: processed.amplifiedValue,
        
        averageBPM: heartbeatResult.bpm > 0 ? heartbeatResult.bpm : null,
        isPeak: heartbeatResult.isPeak,
        rrInterval: heartbeatResult.rrIntervals.length > 0 ? 
          heartbeatResult.rrIntervals[heartbeatResult.rrIntervals.length - 1] : null,
        
        qualityMetrics: qualityMetrics,
        qualityAlertActive: isQualityAlertActive,
        problemAlgorithms: problemAlgorithms,
        detailedDiagnostics: showDetailedDiagnostics
      };
    } catch (error) {
      logError(
        `Error procesando valor: ${error instanceof Error ? error.message : String(error)}`,
        ErrorLevel.ERROR,
        "SignalProcessor"
      );
      
      return {
        timestamp: Date.now(),
        fingerDetected: false,
        quality: 0,
        
        rawValue: value,
        filteredValue: value,
        amplifiedValue: value,
        
        averageBPM: null,
        isPeak: false,
        rrInterval: null,
        
        qualityMetrics: null,
        qualityAlertActive: false,
        problemAlgorithms: [],
        detailedDiagnostics: false
      };
    }
  }, [isProcessing, heartbeatDetector, qualityMetrics, isQualityAlertActive, problemAlgorithms, showDetailedDiagnostics, updateCardiacMetrics]);
  
  /**
   * Calcula la estabilidad de la señal (0-100)
   */
  const calculateSignalStability = (values: number[]): number => {
    if (values.length < 5) return 0;
    
    try {
      // Calcular varianza de los valores recientes
      const recentValues = values.slice(-10);
      const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
      
      // Normalizar a un valor de 0-100 (menos varianza = mayor estabilidad)
      // Pero evitar valores extremos (varianza cero también es sospechosa)
      if (variance < 0.0001) return 30; // Varianza muy baja es sospechosa
      
      return Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 100));
    } catch (error) {
      return 0;
    }
  };
  
  /**
   * Inicia el procesamiento de señales
   */
  const startProcessing = useCallback(() => {
    if (isProcessing) return;
    
    // Inicializar componentes
    processorRef.current.reset();
    heartbeatDetector.reset();
    processedValuesRef.current = [];
    bufferedPeaksRef.current = [];
    processedFramesRef.current = 0;
    framesWithFingerRef.current = 0;
    
    // Configuración inicial
    configureProcessor(DEFAULT_CONFIG);
    
    // Inicializar monitor de calidad
    initializeQualityMonitor();
    
    // Activar procesamiento
    setIsProcessing(true);
    setLastProcessedValue(null);
    setFingerDetected(false);
    setSignalQuality(0);
    setHeartRate(0);
    
    logError(
      "Procesamiento de señal iniciado",
      ErrorLevel.INFO,
      "SignalProcessor"
    );
  }, [isProcessing, configureProcessor, heartbeatDetector, initializeQualityMonitor]);
  
  /**
   * Detiene el procesamiento de señales
   */
  const stopProcessing = useCallback(() => {
    if (!isProcessing) return;
    
    setIsProcessing(false);
    
    // Resetear componentes
    processorRef.current.reset();
    heartbeatDetector.reset();
    resetFingerDetector();
    
    logError(
      `Procesamiento detenido: ${processedFramesRef.current} frames procesados, ${framesWithFingerRef.current} con dedo detectado`,
      ErrorLevel.INFO,
      "SignalProcessor"
    );
  }, [isProcessing, heartbeatDetector]);
  
  /**
   * Reinicia completamente el procesador
   */
  const reset = useCallback(() => {
    // Detener procesamiento si está activo
    if (isProcessing) {
      stopProcessing();
    }
    
    // Resetear todos los componentes
    processorRef.current.reset();
    heartbeatDetector.reset();
    resetFingerDetector();
    qualityMonitorRef.current.reset();
    
    // Resetear buffers
    processedValuesRef.current = [];
    bufferedPeaksRef.current = [];
    processedFramesRef.current = 0;
    framesWithFingerRef.current = 0;
    
    // Resetear estado
    setLastProcessedValue(null);
    setFingerDetected(false);
    setSignalQuality(0);
    setHeartRate(0);
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
    
    logError(
      "Procesador de señal reseteado completamente",
      ErrorLevel.INFO,
      "SignalProcessor"
    );
  }, [isProcessing, stopProcessing, heartbeatDetector]);
  
  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      // Detener procesamiento si está activo
      if (isProcessing) {
        stopProcessing();
      }
    };
  }, [isProcessing, stopProcessing]);
  
  return {
    // Estado
    isProcessing,
    lastProcessedValue,
    fingerDetected,
    signalQuality,
    heartRate,
    
    // Métricas de calidad avanzada
    qualityMetrics,
    isQualityAlertActive,
    problemAlgorithms,
    showDetailedDiagnostics,
    
    // Acciones
    processValue,
    startProcessing,
    stopProcessing,
    reset,
    configureProcessor,
    sendAlgorithmFeedback,
    
    // Acceso a referencias (para debug)
    processorRef,
    qualityMonitorRef,
    processedFramesRef
  };
}
