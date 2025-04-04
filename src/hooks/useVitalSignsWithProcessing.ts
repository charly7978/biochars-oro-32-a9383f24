
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook integrador para procesamiento de señales y extracción de signos vitales
 * Conecta los módulos de extracción con los de procesamiento
 * Versión mejorada con detección de dedos unificada y diagnóstico
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePPGExtraction } from './usePPGExtraction';
import { useSignalProcessing } from './useSignalProcessing';
import { useVitalSignsProcessor } from './useVitalSignsProcessor';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';
import { fingerDiagnostics } from '@/modules/signal-processing/utils/finger-diagnostics';

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
  const lastErrorTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  
  // Estado de depuración
  const [debugInfo, setDebugInfo] = useState({
    frameRate: 0,
    processingTime: 0,
    extractionQuality: 0,
    unifiedConfidence: 0
  });
  
  /**
   * Actualiza el brillo ambiental para adaptar umbrales
   */
  const updateAmbientBrightness = useCallback((brightness: number) => {
    ambientBrightnessRef.current = brightness;
    
    // Adaptar umbrales de detección basados en brillo y calidad de señal
    if (processing.signalQuality !== undefined) {
      unifiedFingerDetector.adaptThresholds(processing.signalQuality, brightness);
    }
  }, [processing.signalQuality]);
  
  /**
   * Procesa un frame completo de la cámara
   * Versión mejorada con mejor manejo de errores y diagnóstico
   */
  const processFrame = useCallback((imageData: ImageData) => {
    if (!isMonitoring) return;
    
    try {
      const startTime = performance.now();
      
      // 1. Extraer valor PPG crudo del frame
      extraction.processFrame(imageData);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Actualizar métricas de depuración cada 30 frames
      if (processedFramesRef.current % 30 === 0) {
        const now = Date.now();
        const elapsedMs = now - lastProcessTimeRef.current;
        const frameRate = elapsedMs > 0 ? (30 * 1000) / elapsedMs : 0;
        
        setDebugInfo({
          frameRate: Math.round(frameRate * 10) / 10,
          processingTime: Math.round(processingTime * 100) / 100,
          extractionQuality: extraction.lastResult?.quality || 0,
          unifiedConfidence: detectionConfidenceRef.current
        });
        
        lastProcessTimeRef.current = now;
      }
      
      processedFramesRef.current++;
      
      // Resetear contador de errores cuando tenemos procesamiento exitoso
      errorCountRef.current = 0;
      
    } catch (error) {
      const now = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Limitar frecuencia de logging de errores
      if (now - lastErrorTimeRef.current > 5000) {
        logError(
          `Error procesando frame: ${errorMessage}`,
          ErrorLevel.ERROR,
          "VitalSignsProcessor"
        );
        
        lastErrorTimeRef.current = now;
      }
      
      errorCountRef.current++;
      
      // Registrar diagnóstico de error para análisis
      if (errorCountRef.current % 10 === 1) { // Registrar cada 10 errores 
        fingerDiagnostics.logEvent({
          eventType: 'PROCESSING_ERROR',
          source: 'frame-processing',
          isFingerDetected: false,
          confidence: 0,
          details: {
            errorMessage,
            consecutiveErrors: errorCountRef.current,
            totalFrames: processedFramesRef.current
          }
        });
      }
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
          'extraction', 
          extraction.lastResult.fingerDetected, 
          extraction.lastResult.quality / 100
        );
        
        // Actualizar desde el procesador de señal
        unifiedFingerDetector.updateSource(
          'signalProcessor', 
          processedSignal.fingerDetected, 
          processedSignal.quality / 100
        );
        
        // Obtener estado final unificado
        const detectionState = unifiedFingerDetector.getDetectionState();
        setUnifiedFingerDetected(detectionState.isFingerDetected);
        detectionConfidenceRef.current = detectionState.confidence;
        
        // Adaptación de umbrales basada en calidad de señal
        unifiedFingerDetector.adaptThresholds(processedSignal.quality);
        
        // Registrar evento de diagnóstico para analizar calidad de detección
        if (processedFramesRef.current % 30 === 0) {
          fingerDiagnostics.logEvent({
            eventType: 'DETECTION_QUALITY',
            source: 'vital-signs-processor',
            isFingerDetected: detectionState.isFingerDetected,
            confidence: detectionState.confidence,
            signalQuality: processedSignal.quality,
            details: {
              extractionConfidence: extraction.lastResult.quality / 100,
              processingConfidence: processedSignal.quality / 100,
              heartRate: processedSignal.averageBPM || 0,
              consensusLevel: detectionState.consensusLevel
            }
          });
        }
        
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
          if (processedFramesRef.current % 60 === 0) {
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
          if (processedFramesRef.current % 60 === 0) {
            logError(
              `VitalSignsProcessor: Dedo no detectado - Confianza: ${detectionConfidenceRef.current.toFixed(2)}, ` +
              `Calidades: Extracción=${extraction.lastResult.quality.toFixed(0)}, ` +
              `Procesamiento=${processedSignal.quality.toFixed(0)}`,
              ErrorLevel.INFO,
              "VitalSignsProcessor"
            );
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error en procesamiento integrado:", errorMessage);
      
      // Registrar diagnóstico de error
      fingerDiagnostics.logEvent({
        eventType: 'INTEGRATION_ERROR',
        source: 'vital-signs-processor',
        isFingerDetected: false,
        confidence: 0,
        details: {
          errorMessage,
          processingStage: 'signal-processing',
          hasExtractionResult: !!extraction.lastResult
        }
      });
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
    
    // Iniciar sesión de diagnóstico
    fingerDiagnostics.startSession(`vital-signs-${Date.now()}`);
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    errorCountRef.current = 0;
    
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
    
    // Finalizar sesión de diagnóstico
    fingerDiagnostics.endSession();
    
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
    errorCountRef.current = 0;
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
    
    // Información de depuración
    debugInfo,
    
    // Acciones
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset,
    
    // Actualizar brillo ambiental
    updateAmbientBrightness
  };
}
