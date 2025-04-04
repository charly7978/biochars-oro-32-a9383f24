
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
import { 
  SignalQualityMonitor, 
  SignalQualityMetrics,
  AlgorithmFeedback,
  OptimizationResponse
} from '../modules/signal-processing/utils/signal-quality-monitor';
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
  
  // Nueva sección: Métricas detalladas de calidad
  qualityMetrics: SignalQualityMetrics | null;
  qualityAlertActive: boolean;
  detailedDiagnostics: boolean;
  problemAlgorithms: {algorithm: string, issues: string[], quality: number}[];
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
  // Nuevo monitor de calidad de señal
  const qualityMonitorRef = useRef<SignalQualityMonitor | null>(null);
  
  // Estado de procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ProcessedSignalResult | null>(null);
  
  // Nuevos estados para calidad avanzada
  const [qualityMetrics, setQualityMetrics] = useState<SignalQualityMetrics | null>(null);
  const [isQualityAlertActive, setIsQualityAlertActive] = useState<boolean>(false);
  const [problemAlgorithms, setProblemAlgorithms] = useState<{algorithm: string, issues: string[], quality: number}[]>([]);
  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState<boolean>(false);
  
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
    
    if (!qualityMonitorRef.current) {
      console.log("useSignalProcessing: Creando monitor de calidad");
      qualityMonitorRef.current = new SignalQualityMonitor();
      
      // Configurar callbacks del monitor
      qualityMonitorRef.current.onQualityMetricsUpdate(metrics => {
        setQualityMetrics(metrics);
      });
      
      qualityMonitorRef.current.onAlertChange((isActive, details) => {
        setIsQualityAlertActive(isActive);
        setProblemAlgorithms(details.problemAlgorithms || []);
        setShowDetailedDiagnostics(details.detailedDiagnostics || false);
        
        if (isActive) {
          logError(
            `Alerta de calidad de señal: ${details.problemAlgorithms.length} algoritmos afectados`,
            ErrorLevel.WARNING,
            "SignalQualityMonitor"
          );
        }
      });
    }
    
    return () => {
      console.log("useSignalProcessing: Limpiando procesadores");
      ppgProcessorRef.current = null;
      heartbeatProcessorRef.current = null;
      signalAmplifierRef.current = null;
      qualityMonitorRef.current = null;
    };
  }, []);
  
  /**
   * Envía retroalimentación desde un algoritmo al monitor de calidad
   */
  const sendAlgorithmFeedback = useCallback((feedback: AlgorithmFeedback) => {
    if (qualityMonitorRef.current) {
      qualityMonitorRef.current.receiveAlgorithmFeedback(feedback);
      
      // Aplicar recomendaciones al optimizador si es necesario
      if (feedback.qualityScore < 40 && feedback.recommendations) {
        // Generar respuesta del optimizador basada en recomendaciones
        applyOptimizerRecommendations(feedback.recommendations);
      }
    }
  }, []);
  
  /**
   * Aplica recomendaciones al optimizador y genera una respuesta
   */
  const applyOptimizerRecommendations = useCallback((recommendations: any) => {
    if (!signalAmplifierRef.current || !qualityMonitorRef.current) return;
    
    const response: OptimizationResponse = {
      adjustments: {},
      message: "Ajustes aplicados correctamente",
      success: true,
      timestamp: Date.now()
    };
    
    try {
      // Aplicar ajustes al amplificador según recomendaciones
      if (recommendations.filterStrength !== undefined) {
        signalAmplifierRef.current.setFilterStrength(recommendations.filterStrength);
        response.adjustments.filterStrength = recommendations.filterStrength;
      }
      
      if (recommendations.amplificationFactor !== undefined) {
        signalAmplifierRef.current.setAmplificationFactor(recommendations.amplificationFactor);
        response.adjustments.amplificationFactor = recommendations.amplificationFactor;
      }
      
      // Si hay parámetros adaptativos, aplicarlos también
      if (recommendations.adaptiveParams) {
        for (const [key, value] of Object.entries(recommendations.adaptiveParams)) {
          // Para cualquier parámetro adaptativo específico...
          // Este es un ejemplo, adaptar a los métodos reales del amplificador
          if (key === 'adaptationRate' && typeof value === 'number') {
            signalAmplifierRef.current.setAdaptationRate(value);
            if (!response.adjustments.adaptiveParams) {
              response.adjustments.adaptiveParams = {};
            }
            response.adjustments.adaptiveParams[key] = value;
          }
        }
      }
      
      // Enviar respuesta al monitor
      qualityMonitorRef.current.receiveOptimizerResponse(response);
      
      logError(
        `Optimizador de señal: Ajustes aplicados`,
        ErrorLevel.INFO,
        "SignalOptimizer",
        { adjustments: response.adjustments }
      );
    } catch (error) {
      response.success = false;
      response.message = `Error aplicando ajustes: ${error instanceof Error ? error.message : String(error)}`;
      
      qualityMonitorRef.current.receiveOptimizerResponse(response);
      
      logError(
        `Error en optimizador de señal: ${response.message}`,
        ErrorLevel.ERROR,
        "SignalOptimizer"
      );
    }
  }, []);
  
  /**
   * Procesa un valor PPG usando ambos procesadores
   */
  const processValue = useCallback((value: number): ProcessedSignalResult | null => {
    if (!isProcessing || !ppgProcessorRef.current || !heartbeatProcessorRef.current || 
        !signalAmplifierRef.current || !qualityMonitorRef.current) {
      return null;
    }
    
    try {
      // Incrementar contador de frames
      processedFramesRef.current++;
      
      // Procesar con el procesador PPG
      const ppgResult: ProcessedPPGSignal = ppgProcessorRef.current.processSignal(value);
      
      // Amplificar la señal con el amplificador dedicado para mejorar la detección de latidos
      const amplifierResult = signalAmplifierRef.current.processValue(ppgResult.filteredValue);
      
      // NUEVO: Evaluar calidad con el monitor de calidad entre el optimizador y los algoritmos
      const qualityResult = qualityMonitorRef.current.evaluateSignalQuality(
        amplifierResult.amplifiedValue, 
        [...amplifierResult.getRecentValues()]
      );
      
      // Usar el valor amplificado para procesamiento cardíaco
      const heartbeatResult: ProcessedHeartbeatSignal = 
        heartbeatProcessorRef.current.processSignal(amplifierResult.amplifiedValue);
      
      // Enviar retroalimentación del algoritmo cardíaco al monitor de calidad
      if (heartbeatResult.isPeak || processedFramesRef.current % 30 === 0) {
        const cardiacFeedback: AlgorithmFeedback = {
          algorithm: "CardiacProcessor",
          qualityScore: heartbeatResult.peakConfidence * 100,
          issues: [],
          timestamp: Date.now()
        };
        
        // Agregar posibles problemas detectados
        if (heartbeatResult.peakConfidence < 0.5) {
          cardiacFeedback.issues.push("Baja confianza en detección de picos");
        }
        
        if (heartbeatResult.heartRateVariability !== null && heartbeatResult.heartRateVariability > 100) {
          cardiacFeedback.issues.push("Alta variabilidad en ritmo cardíaco");
        }
        
        if (heartbeatResult.instantaneousBPM !== null) {
          if (heartbeatResult.instantaneousBPM < 40) {
            cardiacFeedback.issues.push("Frecuencia cardíaca demasiado baja");
          } else if (heartbeatResult.instantaneousBPM > 180) {
            cardiacFeedback.issues.push("Frecuencia cardíaca demasiado alta");
          }
        }
        
        // Agregar recomendaciones si hay problemas
        if (cardiacFeedback.issues.length > 0) {
          cardiacFeedback.recommendations = {
            // Sugerir ajustes según los problemas detectados
            filterStrength: heartbeatResult.peakConfidence < 0.4 ? 0.3 : undefined,
            amplificationFactor: heartbeatResult.peakConfidence < 0.3 ? 1.5 : undefined,
          };
        }
        
        // También agregar métricas específicas del algoritmo cardíaco
        if (cardiacFeedback.recommendations) {
          cardiacFeedback.recommendations.pulseQuality = heartbeatResult.peakConfidence * 100;
          cardiacFeedback.recommendations.rhythmStability = 
            heartbeatResult.heartRateVariability !== null 
              ? Math.max(0, 100 - heartbeatResult.heartRateVariability / 2) 
              : 50;
        }
        
        sendAlgorithmFeedback(cardiacFeedback);
      }
      
      // NUEVO: Transferencia directa de la calidad desde el monitor de calidad
      // La calidad general ahora viene del monitor de calidad
      const enhancedQuality = qualityResult.generalQuality;
        
      // Actualizar estado con calidad directa del monitor
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
      
      // Generar resultado combinado con las nuevas métricas de calidad
      const result: ProcessedSignalResult = {
        timestamp: ppgResult.timestamp,
        
        // Valores de señal PPG
        rawValue: ppgResult.rawValue,
        filteredValue: ppgResult.filteredValue,
        normalizedValue: ppgResult.normalizedValue,
        amplifiedValue: amplifierResult.amplifiedValue,
        
        // Información de calidad mejorada
        quality: enhancedQuality,
        fingerDetected: improvedFingerDetection,
        signalStrength: ppgResult.signalStrength,
        
        // Información cardíaca
        isPeak: heartbeatResult.isPeak,
        peakConfidence: heartbeatResult.peakConfidence,
        instantaneousBPM: heartbeatResult.instantaneousBPM,
        averageBPM,
        rrInterval: heartbeatResult.rrInterval,
        heartRateVariability: heartbeatResult.heartRateVariability,
        
        // NUEVO: Métricas detalladas de calidad
        qualityMetrics: qualityResult,
        qualityAlertActive: isQualityAlertActive,
        detailedDiagnostics: showDetailedDiagnostics,
        problemAlgorithms: problemAlgorithms
      };
      
      // Output enhanced diagnostic info
      if (processedFramesRef.current % 50 === 0) {
        console.log("Signal Processing Diagnostics:", {
          quality: enhancedQuality,
          amplifierGain: signalAmplifierRef.current.getCurrentGain(),
          peakConfidence: heartbeatResult.peakConfidence,
          recentBpmCount: recentBpmValues.current.length,
          averageBPM: averageBPM,
          instantBPM: heartbeatResult.instantaneousBPM,
          qualityAlertActive: isQualityAlertActive,
          problemAlgorithmsCount: problemAlgorithms.length,
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
  }, [isProcessing, sendAlgorithmFeedback, isQualityAlertActive, showDetailedDiagnostics, problemAlgorithms]);
  
  /**
   * Inicia el procesamiento de señal
   */
  const startProcessing = useCallback(() => {
    if (!ppgProcessorRef.current || !heartbeatProcessorRef.current || 
        !signalAmplifierRef.current || !qualityMonitorRef.current) {
      console.error("No se pueden iniciar los procesadores");
      return;
    }
    
    console.log("useSignalProcessing: Iniciando procesamiento");
    
    // Resetear procesadores
    ppgProcessorRef.current.reset();
    heartbeatProcessorRef.current.reset();
    signalAmplifierRef.current.reset();
    qualityMonitorRef.current.reset();
    resetFingerDetector();
    
    // Limpiar estados
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
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
    
    if (signalAmplifierRef.current) {
      // Configurar también el amplificador
      if (options.amplificationFactor !== undefined) {
        signalAmplifierRef.current.setAmplificationFactor(options.amplificationFactor);
      }
      
      if (options.filterStrength !== undefined) {
        signalAmplifierRef.current.setFilterStrength(options.filterStrength);
      }
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
    
    // Nuevos estados de calidad avanzada
    qualityMetrics,
    isQualityAlertActive,
    problemAlgorithms,
    showDetailedDiagnostics,
    
    // Acciones
    processValue,
    startProcessing,
    stopProcessing,
    configureProcessors,
    sendAlgorithmFeedback,
    
    // Procesadores
    ppgProcessor: ppgProcessorRef.current,
    heartbeatProcessor: heartbeatProcessorRef.current,
    signalAmplifier: signalAmplifierRef.current,
    qualityMonitor: qualityMonitorRef.current
  };
}
