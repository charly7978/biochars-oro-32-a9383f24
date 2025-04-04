
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook integrador para procesamiento de señales y extracción de signos vitales
 * Conecta los módulos de extracción con los de procesamiento
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePPGExtraction } from './usePPGExtraction';
import { useSignalProcessing } from './useSignalProcessing';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { AlgorithmFeedback, SignalQualityMetrics } from '../modules/signal-processing/utils/signal-quality-monitor';
import { logError, ErrorLevel } from '@/utils/debugUtils';

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
  const processing = useSignalProcessing();
  const vitalSigns = useVitalSignsProcessor();
  
  // Estado integrado
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedVitalsResult | null>(null);
  
  // Contadores y buffers
  const processedFramesRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(Date.now());
  
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
    if (!processing.sendAlgorithmFeedback) return;
    
    const feedback: AlgorithmFeedback = {
      algorithm: `VitalSignsProcessor:${vitalType}`,
      qualityScore,
      issues,
      timestamp: Date.now(),
      recommendations
    };
    
    processing.sendAlgorithmFeedback(feedback);
  }, [processing]);
  
  /**
   * Realiza el procesamiento cuando hay un nuevo resultado de extracción
   */
  useEffect(() => {
    if (!isMonitoring || !extraction.lastResult) return;
    
    try {
      // 2. Procesar el valor PPG extraído con calidad mejorada
      const processedSignal = processing.processValue(extraction.lastResult.filteredValue);
      
      if (processedSignal && processedSignal.fingerDetected) {
        // Enhanced diagnostics
        if (processedFramesRef.current % 100 === 0) {
          logError(
            `Signal Processing Metrics: Quality=${processedSignal.quality}, Peaks=${processedSignal.isPeak ? "YES" : "NO"}, HR=${processedSignal.averageBPM || 0}`,
            ErrorLevel.INFO,
            "VitalSignsProcessor"
          );
        }
        
        // 3. Procesar para obtener signos vitales con calidad mejorada
        const vitalsResult = vitalSigns.processSignal(
          processedSignal.amplifiedValue, // Use amplified value for better results
          { 
            intervals: processedSignal.rrInterval ? [processedSignal.rrInterval] : [],
            lastPeakTime: processedSignal.isPeak ? processedSignal.timestamp : null
          }
        );
        
        // NUEVO: Enviar retroalimentación de cada módulo de signos vitales
        if (processedFramesRef.current % 30 === 0 || processedSignal.isPeak) {
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
        
        // 4. Crear resultado integrado con métricas de calidad avanzadas
        const integratedResult: IntegratedVitalsResult = {
          timestamp: processedSignal.timestamp,
          quality: processedSignal.quality,
          fingerDetected: processedSignal.fingerDetected,
          
          rawValue: processedSignal.rawValue,
          filteredValue: processedSignal.filteredValue,
          amplifiedValue: processedSignal.amplifiedValue,
          
          heartRate: processedSignal.averageBPM || 0,
          isPeak: processedSignal.isPeak,
          rrInterval: processedSignal.rrInterval,
          
          spo2: vitalsResult.spo2,
          pressure: vitalsResult.pressure,
          arrhythmiaStatus: vitalsResult.arrhythmiaStatus.split('|')[0] || '--',
          arrhythmiaCount: parseInt(vitalsResult.arrhythmiaStatus.split('|')[1] || '0', 10),
          
          // Agregar información de calidad avanzada
          qualityMetrics: processedSignal.qualityMetrics,
          qualityAlertActive: processedSignal.qualityAlertActive,
          problemAlgorithms: processedSignal.problemAlgorithms,
          showDetailedDiagnostics: processedSignal.detailedDiagnostics
        };
        
        // Actualizar resultado
        setLastResult(integratedResult);
        
        // Incrementar contador de frames procesados
        processedFramesRef.current++;
        lastProcessTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error("Error en procesamiento integrado:", error);
    }
  }, [isMonitoring, extraction.lastResult, processing, vitalSigns, sendVitalSignsFeedback]);
  
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
  }, [extraction, vitalSigns, stopMonitoring]);
  
  return {
    // Estado
    isMonitoring,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Métricas de extracción
    signalQuality: processing.signalQuality,
    fingerDetected: processing.fingerDetected,
    heartRate: processing.heartRate,
    
    // Nuevas métricas de calidad avanzada
    qualityMetrics: processing.qualityMetrics,
    isQualityAlertActive: processing.isQualityAlertActive,
    problemAlgorithms: processing.problemAlgorithms,
    showDetailedDiagnostics: processing.showDetailedDiagnostics,
    
    // Acciones
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset
  };
}
