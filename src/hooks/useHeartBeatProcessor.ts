
import { useState, useEffect, useCallback, useRef } from 'react';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';
import { toast } from 'sonner';
import { useBeepProcessor } from './heart-beat/beep-processor';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';
import { 
  getAverageDiagnostics, 
  getDetailedQualityStats, 
  getDiagnosticsData 
} from './heart-beat/signal-processing/peak-detection';

export const useHeartBeatProcessor = (): UseHeartBeatReturn => {
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const sessionId = useRef<string>(Math.random().toString(36).substring(2, 9));
  
  const isMonitoringRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const lastValidBpmTimestampRef = useRef<number>(0);
  const bpmHistoryRef = useRef<number[]>([]);
  
  const { 
    requestImmediateBeep, 
    processBeepQueue, 
    pendingBeepsQueue, 
    lastBeepTimeRef, 
    beepProcessorTimeoutRef, 
    cleanup: cleanupBeepProcessor 
  } = useBeepProcessor();
  
  const {
    processRRIntervals,
    reset: resetArrhythmiaDetector,
    getArrhythmiaState,
    lastRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef,
    heartRateVariabilityRef,
    stabilityCounterRef
  } = useArrhythmiaDetector();
  
  const {
    processSignal: processSignalInternal,
    reset: resetSignalProcessor,
    lastPeakTimeRef,
    lastValidBpmRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    visualizationBuffer,
    amplificationFactor,
    MAX_CONSECUTIVE_WEAK_SIGNALS
  } = useSignalProcessor();

  // Inicialización del procesador principal
  useEffect(() => {
    console.log('useHeartBeatProcessor: Inicializando procesador principal ÚNICO', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!processorRef.current) {
        processorRef.current = new HeartBeatProcessor();
        console.log('HeartBeatProcessor: Instancia ÚNICA creada - medición REAL únicamente');
        initializedRef.current = true;
        
        if (typeof window !== 'undefined') {
          (window as any).heartBeatProcessor = processorRef.current;
        }
      }
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(true);
        console.log('HeartBeatProcessor: Monitoreo activado - audio ELIMINADO de aquí');
        isMonitoringRef.current = true;
      }
    } catch (error) {
      console.error('Error inicializando HeartBeatProcessor:', error);
      toast.error('Error al inicializar el procesador de latidos');
    }

    return () => {
      console.log('useHeartBeatProcessor: Limpiando procesador', {
        sessionId: sessionId.current,
        timestamp: new Date().toISOString()
      });
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(false);
        processorRef.current = null;
      }
      
      if (typeof window !== 'undefined') {
        (window as any).heartBeatProcessor = undefined;
      }
    };
  }, []);

  // Procesamiento de señal PRINCIPAL
  const processSignal = useCallback((value: number): HeartBeatResult => {
    if (!processorRef.current) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        isArrhythmia: false,
        rrData: {
          intervals: [],
          lastPeakTime: null
        },
        diagnosticData: {
          signalQuality: 'weak',
          detectionStatus: 'processor_not_initialized',
          lastProcessedTime: Date.now()
        }
      };
    }

    // Procesar señal REAL con el procesador principal
    const result = processorRef.current.processSignal(value);
    
    // Actualizar estado si el resultado es válido
    if (result.bpm > 0 && result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.3) {
      const newBPM = currentBPM === 0 ? result.bpm : (0.8 * currentBPM + 0.2 * result.bpm);
      setCurrentBPM(Math.round(newBPM));
      setConfidence(result.confidence);
      
      lastValidBpmTimestampRef.current = Date.now();
      
      bpmHistoryRef.current.push(Math.round(newBPM));
      if (bpmHistoryRef.current.length > 10) {
        bpmHistoryRef.current.shift();
      }
    }

    return result;
  }, [currentBPM, confidence]);

  const reset = useCallback(() => {
    console.log('useHeartBeatProcessor: Reset del procesador principal', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    if (processorRef.current) {
      processorRef.current.setMonitoring(false);
      isMonitoringRef.current = false;
      processorRef.current.reset();
    }
    
    setCurrentBPM(0);
    setConfidence(0);
    
    resetArrhythmiaDetector();
    resetSignalProcessor();
    
    lastValidBpmTimestampRef.current = 0;
    bpmHistoryRef.current = [];
    
    cleanupBeepProcessor();
  }, [resetArrhythmiaDetector, resetSignalProcessor, cleanupBeepProcessor]);

  const startMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Iniciando monitoreo ÚNICO');
    if (processorRef.current) {
      isMonitoringRef.current = true;
      processorRef.current.setMonitoring(true);
      console.log('HeartBeatProcessor: Estado de monitoreo activado');
      
      lastValidBpmTimestampRef.current = Date.now();
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Deteniendo monitoreo ÚNICO');
    if (processorRef.current) {
      isMonitoringRef.current = false;
      processorRef.current.setMonitoring(false);
      console.log('HeartBeatProcessor: Estado de monitoreo desactivado');
    }
    
    cleanupBeepProcessor();
    setCurrentBPM(0);
    setConfidence(0);
  }, [cleanupBeepProcessor]);

  const getDiagnostics = useCallback(() => {
    return {
      processingMetrics: getAverageDiagnostics(),
      qualityStats: getDetailedQualityStats(),
      detailedData: getDiagnosticsData().slice(-20)
    };
  }, []);

  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia: currentBeatIsArrhythmiaRef?.current || false,
    requestBeep: () => false, // Eliminado - audio solo en PPGSignalMeter
    startMonitoring,
    stopMonitoring,
    getDiagnostics
  };
};
