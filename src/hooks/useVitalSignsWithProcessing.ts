
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook integrador para procesamiento de señales y extracción de signos vitales
 * Conecta los módulos de extracción con los de procesamiento
 * Versión mejorada con detección de dedos unificada
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePPGExtraction } from './usePPGExtraction';
import { useSignalProcessing } from './useSignalProcessing';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';

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
}

/**
 * Hook que integra extracción y procesamiento con detección de dedos mejorada
 */
export function useVitalSignsWithProcessing() {
  // Hooks de extracción y procesamiento
  const extraction = usePPGExtraction();
  const processing = useSignalProcessing();
  const vitalSigns = useVitalSignsProcessor();
  
  // Estado integrado
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedVitalsResult | null>(null);
  
  // Estado de detección de dedos mejorado
  const [unifiedFingerDetected, setUnifiedFingerDetected] = useState<boolean>(false);
  const detectionConfidenceRef = useRef<number>(0);
  
  // Contadores y buffers
  const processedFramesRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(Date.now());
  const ambientBrightnessRef = useRef<number | undefined>(undefined);
  
  /**
   * Actualiza el brillo ambiental para adaptar umbrales
   */
  const updateAmbientBrightness = useCallback((brightness: number) => {
    ambientBrightnessRef.current = brightness;
    
    // Set thresholds directly instead of using adaptThresholds
    if (processing.signalQuality !== undefined) {
      // Update the finger detection source
      unifiedFingerDetector.updateSource(
        'brightness', 
        brightness > 50, // Detect finger if brightness is reasonable
        brightness / 255  // Normalized confidence
      );
    }
  }, [processing.signalQuality]);
  
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
   * Realiza el procesamiento cuando hay un nuevo resultado de extracción
   */
  useEffect(() => {
    if (!isMonitoring || !extraction.lastResult) return;
    
    try {
      // 2. Procesar el valor PPG extraído
      const processedSignal = processing.processValue(extraction.lastResult.filteredValue);
      
      if (processedSignal) {
        // Actualizar sistema unificado de detección con datos de diferentes fuentes
        
        // Actualizar desde el extractor PPG
        unifiedFingerDetector.updateSource(
          'ppg-extractor', 
          extraction.lastResult.fingerDetected, 
          extraction.lastResult.quality / 100
        );
        
        // Actualizar desde el procesador de señal
        unifiedFingerDetector.updateSource(
          'signal-quality-amplitude', 
          processedSignal.fingerDetected, 
          processedSignal.quality / 100
        );
        
        // Obtener estado final unificado
        const detectionState = unifiedFingerDetector.getDetectionState();
        setUnifiedFingerDetected(detectionState.isFingerDetected);
        detectionConfidenceRef.current = detectionState.confidence;
        
        // Set thresholds directly instead of using adaptThresholds
        unifiedFingerDetector.updateSource(
          'signal-quality-state',
          processedSignal.quality > 50,
          processedSignal.quality / 100
        );
        
        // Solo procesar para signos vitales si el dedo está detectado según sistema unificado
        if (detectionState.isFingerDetected) {
          // 3. Procesar para obtener signos vitales
          const vitalsResult = vitalSigns.processSignal(
            processedSignal.filteredValue, 
            { 
              intervals: processedSignal.rrInterval ? [processedSignal.rrInterval] : [],
              lastPeakTime: processedSignal.isPeak ? processedSignal.timestamp : null
            }
          );
          
          // 4. Crear resultado integrado
          const integratedResult: IntegratedVitalsResult = {
            timestamp: processedSignal.timestamp,
            quality: processedSignal.quality,
            fingerDetected: detectionState.isFingerDetected,
            
            rawValue: processedSignal.rawValue,
            filteredValue: processedSignal.filteredValue,
            amplifiedValue: processedSignal.amplifiedValue,
            
            heartRate: processedSignal.averageBPM || 0,
            isPeak: processedSignal.isPeak,
            rrInterval: processedSignal.rrInterval,
            
            spo2: vitalsResult.spo2,
            pressure: vitalsResult.pressure,
            arrhythmiaStatus: vitalsResult.arrhythmiaStatus.split('|')[0] || '--',
            arrhythmiaCount: parseInt(vitalsResult.arrhythmiaStatus.split('|')[1] || '0', 10)
          };
          
          // Actualizar resultado
          setLastResult(integratedResult);
          
          // Logging detallado para diagnóstico
          if (processedFramesRef.current % 30 === 0) {
            logError(
              `VitalSignsProcessor: Procesamiento exitoso - Calidad: ${processedSignal.quality}, ` +
              `Confianza detección: ${detectionConfidenceRef.current.toFixed(2)}, ` +
              `HR: ${processedSignal.averageBPM || 0}`,
              ErrorLevel.INFO,
              "VitalSignsProcessor"
            );
          }
        } else {
          // Logging para diagnóstico cuando no se detecta dedo
          if (processedFramesRef.current % 30 === 0) {
            logError(
              `VitalSignsProcessor: Dedo no detectado - Confianza: ${detectionConfidenceRef.current.toFixed(2)}, ` +
              `Calidades: Extracción=${extraction.lastResult.quality.toFixed(0)}, ` +
              `Procesamiento=${processedSignal.quality.toFixed(0)}`,
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
  }, [isMonitoring, extraction.lastResult, processing, vitalSigns]);
  
  /**
   * Inicia el monitoreo completo
   */
  const startMonitoring = useCallback(() => {
    logError("useVitalSignsWithProcessing: Iniciando monitoreo", ErrorLevel.INFO, "VitalSignsProcessor");
    
    // Iniciar todos los subsistemas
    extraction.startProcessing();
    processing.startProcessing();
    vitalSigns.initializeProcessor();
    
    // Resetear el detector unificado
    unifiedFingerDetector.reset();
    
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
    
    // Resetear el detector unificado
    unifiedFingerDetector.reset();
    
    setIsMonitoring(false);
    setUnifiedFingerDetected(false);
    setLastResult(null);
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
    
    // Reiniciar detector unificado
    unifiedFingerDetector.reset();
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
  }, [extraction, vitalSigns, stopMonitoring]);
  
  return {
    // Estado
    isMonitoring,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Detección de dedos mejorada
    fingerDetected: unifiedFingerDetected,
    
    // Métricas de extracción
    signalQuality: processing.signalQuality,
    heartRate: processing.heartRate,
    
    // Acciones
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset,
    
    // Nuevo método para actualizar brillo ambiental
    updateAmbientBrightness
  };
}
