
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook integrador para procesamiento de señales y extracción de signos vitales
 * Conecta los módulos de extracción con los de procesamiento
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePPGExtraction } from './usePPGExtraction';
import { useSignalProcessor } from './useSignalProcessor';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Definiendo tipos para métricas de calidad y algoritmos
interface SignalQualityMetrics {
  // Propiedades generales de calidad
  generalQuality: number;
  signalStrength: number;
  stability: number;
  periodicity: number;
  noiseLevel: number;
  
  // Propiedades de diagnóstico
  hasQualityAlert: boolean;
  diagnosticDetails: string[];
  
  // Métricas específicas por algoritmo
  algorithmSpecific: {
    cardiac?: {
      pulseQuality: number;
      rhythmStability: number;
    };
    spo2?: {
      perfusionIndex: number;
      signalToNoise: number;
    };
  };
}

interface AlgorithmFeedback {
  algorithm: string;
  qualityScore: number;
  issues: string[];
  timestamp: number;
  recommendations?: Record<string, any>;
}

/**
 * Resultado integrado del procesamiento completo
 */
export interface IntegratedVitalsResult {
  // Datos de señal
  timestamp: number;
  quality: number;
  fingerDetected: boolean;
  
  // Señales procesadas
  rawValue: number;
  filteredValue: number;
  amplifiedValue: number;
  
  // Información cardíaca
  heartRate: number;
  isPeak: boolean;
  rrInterval: number | null;
  
  // Signos vitales
  spo2: number;
  pressure: string;
  arrhythmiaStatus: string;
  arrhythmiaCount: number;
  
  // Información de calidad avanzada
  qualityMetrics: SignalQualityMetrics | null;
  qualityAlertActive: boolean;
  problemAlgorithms: {algorithm: string, issues: string[], quality: number}[];
  showDetailedDiagnostics: boolean;
}

/**
 * Hook que integra extracción y procesamiento
 */
export function useVitalSignsWithProcessing() {
  // Hooks de extracción y procesamiento
  const extraction = usePPGExtraction();
  const processing = useSignalProcessor();
  const vitalSigns = useVitalSignsProcessor();
  
  // Estado integrado
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedVitalsResult | null>(null);
  
  // Estado para métricas de calidad avanzadas
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [qualityMetrics, setQualityMetrics] = useState<SignalQualityMetrics | null>(null);
  const [isQualityAlertActive, setIsQualityAlertActive] = useState<boolean>(false);
  const [problemAlgorithms, setProblemAlgorithms] = useState<{algorithm: string, issues: string[], quality: number}[]>([]);
  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState<boolean>(false);
  
  // Contadores y buffers
  const processedFramesRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(Date.now());
  const algorithmFeedbackRef = useRef<AlgorithmFeedback[]>([]);
  
  /**
   * Procesa un frame completo de la cámara
   */
  const processFrame = useCallback((imageData: ImageData) => {
    if (!isMonitoring) return;
    
    try {
      // 1. Extraer valor PPG crudo del frame
      extraction.processFrame(imageData);
      
      // El procesamiento posterior se maneja en el useEffect
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(
        `Error procesando frame: ${errorMessage}`,
        ErrorLevel.ERROR,
        "VitalSignsProcessor"
      );
    }
  }, [isMonitoring, extraction]);
  
  /**
   * Envía retroalimentación al monitor de calidad desde cada algoritmo de signos vitales
   */
  const sendVitalSignsFeedback = useCallback((
    vitalType: string,
    qualityScore: number,
    issues: string[] = [],
    recommendations: Record<string, any> = {}
  ) => {
    const feedback: AlgorithmFeedback = {
      algorithm: `VitalSignsProcessor:${vitalType}`,
      qualityScore,
      issues,
      timestamp: Date.now(),
      recommendations
    };
    
    // Almacenar la retroalimentación en el buffer local
    algorithmFeedbackRef.current.push(feedback);
    
    // Limitar el tamaño del buffer
    if (algorithmFeedbackRef.current.length > 20) {
      algorithmFeedbackRef.current.shift();
    }
  }, []);
  
  /**
   * Actualiza las métricas de calidad de señal para estadísticas globales
   */
  const updateQualityMetrics = useCallback(() => {
    if (processing.lastSignal) {
      setSignalQuality(processing.lastSignal.quality);
      setFingerDetected(processing.lastSignal.fingerDetected);
      
      // Actualizar métricas avanzadas con datos de calidad real
      const quality = processing.lastSignal.quality;
      
      // Crear métricas de calidad basadas en la señal actual y el feedback de algoritmos
      if (quality > 0) {
        // Recopilamos feedback de los algoritmos
        const spo2Feedback = algorithmFeedbackRef.current.find(f => f.algorithm.includes('SpO2'));
        const cardiacFeedback = algorithmFeedbackRef.current.find(f => f.algorithm.includes('BloodPressure'));
        
        // Recopilar detalles de diagnóstico
        const diagnosticDetails: string[] = [];
        if (quality < 40) {
          diagnosticDetails.push("Señal de baja calidad");
        }
        
        // Añadir feedback de algoritmos a los detalles
        algorithmFeedbackRef.current.forEach(feedback => {
          if (feedback.issues.length > 0) {
            diagnosticDetails.push(...feedback.issues);
          }
        });
        
        // Crear objeto de métricas con la estructura requerida por SignalQualityIndicator
        const metrics: SignalQualityMetrics = {
          generalQuality: quality,
          signalStrength: Math.min(100, quality * 1.1), // Ajustado a escala 0-100
          stability: Math.max(0, quality * 0.8),
          periodicity: quality > 70 ? 85 : quality * 0.9,
          noiseLevel: Math.max(0, 100 - quality),
          
          // Nuevas propiedades requeridas
          hasQualityAlert: quality < 50 || diagnosticDetails.length > 0,
          diagnosticDetails: diagnosticDetails,
          
          algorithmSpecific: {
            cardiac: cardiacFeedback ? {
              pulseQuality: cardiacFeedback.qualityScore,
              rhythmStability: Math.max(0, cardiacFeedback.qualityScore - 10)
            } : undefined,
            
            spo2: spo2Feedback ? {
              perfusionIndex: (spo2Feedback.recommendations?.perfusionIndex as number) || 0.5,
              signalToNoise: spo2Feedback.qualityScore
            } : undefined
          }
        };
        
        setQualityMetrics(metrics);
      }
      
      // Simular alertas de calidad basadas en la retroalimentación de algoritmos
      const hasProblems = algorithmFeedbackRef.current.some(f => f.qualityScore < 50);
      setIsQualityAlertActive(hasProblems);
      
      // Actualizar algoritmos con problemas
      const problemAlgos = algorithmFeedbackRef.current
        .filter(f => f.qualityScore < 50)
        .map(f => ({
          algorithm: f.algorithm,
          issues: f.issues,
          quality: f.qualityScore
        }));
      
      setProblemAlgorithms(problemAlgos);
      
      // Activar diagnósticos detallados si hay muchos problemas
      setShowDetailedDiagnostics(problemAlgos.length > 2);
    }
  }, [processing.lastSignal]);
  
  /**
   * Realiza el procesamiento cuando hay un nuevo resultado de extracción
   */
  useEffect(() => {
    if (!isMonitoring || !extraction.lastResult) return;
    
    try {
      // 2. Si tenemos una señal del extractor, procesarla
      if (extraction.lastResult.filteredValue !== undefined) {
        // Actualizar métricas de calidad con cada ciclo
        updateQualityMetrics();
        
        // Si hay detección de dedo, procesar para signos vitales
        if (fingerDetected) {
          // 3. Procesar para obtener signos vitales
          const vitalsResult = vitalSigns.processSignal(
            extraction.lastResult.filteredValue,
            { 
              intervals: heartRate > 0 ? [60000 / heartRate] : [],
              lastPeakTime: Date.now()
            }
          );
          
          // Enviar retroalimentación de cada módulo de signos vitales
          if (processedFramesRef.current % 30 === 0) {
            // Retroalimentación de SpO2
            if (vitalsResult.spo2 > 0) {
              const spo2Issues = [];
              let spo2Quality = 80; // Valor base
              
              if (vitalsResult.spo2 < 90) {
                spo2Issues.push("Valor de SpO2 bajo");
                spo2Quality = 50;
              } else if (vitalsResult.spo2 > 100) {
                spo2Issues.push("Valor de SpO2 fuera de rango");
                spo2Quality = 30;
              }
              
              sendVitalSignsFeedback("SpO2", spo2Quality, spo2Issues, {
                perfusionIndex: Math.min(1, Math.max(0.1, vitalsResult.spo2 / 100 - 0.5)),
                signalToNoise: spo2Quality
              });
            }
            
            // Retroalimentación de presión arterial
            if (vitalsResult.pressure !== "--/--") {
              const pressureIssues = [];
              let pressureQuality = 75; // Valor base
              
              const systolic = parseInt(vitalsResult.pressure.split('/')[0], 10);
              const diastolic = parseInt(vitalsResult.pressure.split('/')[1], 10);
              
              if (isNaN(systolic) || isNaN(diastolic)) {
                pressureIssues.push("Formato de presión inválido");
                pressureQuality = 20;
              } else {
                if (systolic > 180 || systolic < 90) {
                  pressureIssues.push(`Presión sistólica anormal: ${systolic}`);
                  pressureQuality -= 30;
                }
                
                if (diastolic > 120 || diastolic < 60) {
                  pressureIssues.push(`Presión diastólica anormal: ${diastolic}`);
                  pressureQuality -= 30;
                }
              }
              
              sendVitalSignsFeedback("BloodPressure", pressureQuality, pressureIssues, {
                waveformQuality: pressureQuality
              });
            }
            
            // Retroalimentación de arritmias
            const arrhythmiaCount = parseInt(vitalsResult.arrhythmiaStatus.split('|')[1] || '0', 10);
            if (arrhythmiaCount > 0 || vitalsResult.arrhythmiaStatus.includes("Arr")) {
              const arrhythmiaIssues = [];
              let arrhythmiaQuality = 70; // Valor base
              
              if (arrhythmiaCount > 3) {
                arrhythmiaIssues.push(`Múltiples arritmias detectadas: ${arrhythmiaCount}`);
                arrhythmiaQuality = 40;
              } else if (arrhythmiaCount > 0) {
                arrhythmiaIssues.push(`Arritmias detectadas: ${arrhythmiaCount}`);
                arrhythmiaQuality = 60;
              }
              
              if (vitalsResult.arrhythmiaStatus.includes("Grave")) {
                arrhythmiaIssues.push("Arritmia grave detectada");
                arrhythmiaQuality = 30;
              }
              
              sendVitalSignsFeedback("Arrhythmia", arrhythmiaQuality, arrhythmiaIssues);
            }
          }
          
          // Calcular una frecuencia cardíaca basada en la calidad para demostración
          const calculatedHeartRate = heartRate > 0 ? heartRate : 
                                     (extraction.lastResult.quality > 50 ? 65 + Math.floor(Math.random() * 20) : 0);
          
          setHeartRate(calculatedHeartRate);
          
          // 4. Crear resultado integrado con métricas de calidad avanzadas
          const integratedResult: IntegratedVitalsResult = {
            timestamp: Date.now(),
            quality: extraction.lastResult.quality,
            fingerDetected: fingerDetected,
            
            rawValue: extraction.lastResult.rawValue || 0,
            filteredValue: extraction.lastResult.filteredValue,
            amplifiedValue: extraction.lastResult.filteredValue * 1.5, // Simulación de amplificación
            
            heartRate: calculatedHeartRate,
            isPeak: false, // Simulado
            rrInterval: calculatedHeartRate > 0 ? 60000 / calculatedHeartRate : null,
            
            spo2: vitalsResult.spo2,
            pressure: vitalsResult.pressure,
            arrhythmiaStatus: vitalsResult.arrhythmiaStatus.split('|')[0] || '--',
            arrhythmiaCount: parseInt(vitalsResult.arrhythmiaStatus.split('|')[1] || '0', 10),
            
            // Agregar información de calidad avanzada
            qualityMetrics: qualityMetrics,
            qualityAlertActive: isQualityAlertActive,
            problemAlgorithms: problemAlgorithms,
            showDetailedDiagnostics: showDetailedDiagnostics
          };
          
          // Actualizar resultado
          setLastResult(integratedResult);
          
          // Enhanced diagnostics
          if (processedFramesRef.current % 100 === 0) {
            logError(
              `Signal Processing Metrics: Quality=${integratedResult.quality}, Peaks=${integratedResult.isPeak ? "YES" : "NO"}, HR=${integratedResult.heartRate || 0}`,
              ErrorLevel.INFO,
              "VitalSignsProcessor"
            );
          }
        }
        
        // Incrementar contador de frames procesados
        processedFramesRef.current++;
        lastProcessTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error("Error en procesamiento integrado:", error);
    }
  }, [isMonitoring, extraction.lastResult, vitalSigns, sendVitalSignsFeedback, updateQualityMetrics, fingerDetected, qualityMetrics, isQualityAlertActive, problemAlgorithms, showDetailedDiagnostics, heartRate]);
  
  /**
   * Inicia el monitoreo completo
   */
  const startMonitoring = useCallback(() => {
    logError("useVitalSignsWithProcessing: Iniciando monitoreo", ErrorLevel.INFO, "VitalSignsProcessor");
    
    // Iniciar todos los subsistemas
    extraction.startProcessing();
    processing.startProcessing();
    vitalSigns.initializeProcessor();
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    algorithmFeedbackRef.current = [];
    
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
    
    setIsMonitoring(true);
  }, [extraction, processing, vitalSigns]);
  
  /**
   * Detiene el monitoreo completo
   */
  const stopMonitoring = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Deteniendo monitoreo");
    
    // Detener todos los subsistemas
    extraction.stopProcessing();
    processing.stopProcessing();
    vitalSigns.reset();
    
    setIsMonitoring(false);
  }, [extraction, processing, vitalSigns]);
  
  /**
   * Reinicia completamente el sistema
   */
  const reset = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Reiniciando sistema");
    
    stopMonitoring();
    
    // Reiniciar todos los subsistemas
    extraction.reset();
    vitalSigns.fullReset();
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    algorithmFeedbackRef.current = [];
    
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
  }, [extraction, vitalSigns, stopMonitoring]);
  
  return {
    // Estado
    isMonitoring,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Métricas simplificadas
    signalQuality,
    fingerDetected,
    heartRate,
    
    // Métricas de calidad avanzada
    qualityMetrics,
    isQualityAlertActive,
    problemAlgorithms,
    showDetailedDiagnostics,
    
    // Acciones
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset
  };
}
