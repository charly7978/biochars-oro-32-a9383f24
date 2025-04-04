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
import { 
  updateDetectionSource, 
  adaptDetectionThresholds,
  isFingerDetected 
} from '@/modules/signal-processing';
import { useFingerDetection } from './useFingerDetection';

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
  const fingerDetection = useFingerDetection();
  
  // Estado integrado
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IntegratedVitalsResult | null>(null);
  
  // Contadores y buffers
  const processedFramesRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(Date.now());
  const ambientBrightnessRef = useRef<number | undefined>(undefined);
  
  /**
   * Actualiza el brillo ambiental para adaptar umbrales
   */
  const updateAmbientBrightness = useCallback((brightness: number) => {
    ambientBrightnessRef.current = brightness;
    
    // Actualizar brillo en sistema unificado
    fingerDetection.updateEnvironment({ brightness });
  }, [fingerDetection]);
  
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
        // Actualizar sistema unificado con datos de diferentes fuentes
        
        // Actualizar desde el extractor PPG
        updateDetectionSource(
          DetectionSource.PPG_EXTRACTOR, 
          extraction.lastResult.fingerDetected, 
          extraction.lastResult.quality / 100
        );
        
        // Actualizar desde el procesador de señal
        updateDetectionSource(
          DetectionSource.SIGNAL_QUALITY_AMPLITUDE, 
          processedSignal.fingerDetected, 
          processedSignal.quality / 100
        );
        
        // Adaptar umbrales basados en calidad
        adaptDetectionThresholds(processedSignal.quality, ambientBrightnessRef.current);
        
        // Obtener estado final unificado
        const fingerDetected = isFingerDetected();
        
        // Solo procesar para signos vitales si el dedo está detectado según sistema unificado
        if (fingerDetected) {
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
            fingerDetected: fingerDetected,
            
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
              `Confianza detección: ${fingerDetection.confidence.toFixed(2)}, ` +
              `HR: ${processedSignal.averageBPM || 0}`,
              ErrorLevel.INFO,
              "VitalSignsProcessor"
            );
          }
        } else {
          // Logging para diagnóstico cuando no se detecta dedo
          if (processedFramesRef.current % 30 === 0) {
            logError(
              `VitalSignsProcessor: Dedo no detectado - Confianza: ${fingerDetection.confidence.toFixed(2)}, ` +
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
  }, [isMonitoring, extraction.lastResult, processing, vitalSigns, fingerDetection]);
  
  /**
   * Inicia el monitoreo completo
   */
  const startMonitoring = useCallback(() => {
    logError("useVitalSignsWithProcessing: Iniciando monitoreo", ErrorLevel.INFO, "VitalSignsProcessor");
    
    // Iniciar todos los subsistemas
    extraction.startProcessing();
    processing.startProcessing();
    vitalSigns.initializeProcessor();
    
    // Resetear detector unificado
    fingerDetection.reset();
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
    
    setIsMonitoring(true);
  }, [extraction, processing, vitalSigns, fingerDetection]);
  
  /**
   * Detiene el monitoreo completo
   */
  const stopMonitoring = useCallback(() => {
    console.log("useVitalSignsWithProcessing: Deteniendo monitoreo");
    
    // Detener todos los subsistemas
    extraction.stopProcessing();
    processing.stopProcessing();
    vitalSigns.reset();
    
    // Resetear detector unificado
    fingerDetection.reset();
    
    setIsMonitoring(false);
    setLastResult(null);
  }, [extraction, processing, vitalSigns, fingerDetection]);
  
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
    fingerDetection.reset();
    
    processedFramesRef.current = 0;
    lastProcessTimeRef.current = Date.now();
  }, [extraction, vitalSigns, fingerDetection, stopMonitoring]);
  
  return {
    // Estado
    isMonitoring,
    lastResult,
    processedFrames: processedFramesRef.current,
    
    // Detección de dedos unificada
    fingerDetected: fingerDetection.isFingerDetected,
    
    // Métricas de extracción
    signalQuality: processing.signalQuality,
    heartRate: processing.heartRate,
    
    // Acciones
    processFrame,
    startMonitoring,
    stopMonitoring,
    reset,
    
    // Método para actualizar brillo ambiental
    updateAmbientBrightness
  };
}
