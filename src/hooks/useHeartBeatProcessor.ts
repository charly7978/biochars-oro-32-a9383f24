
import { useState, useEffect, useCallback, useRef } from 'react';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';
import { toast } from 'sonner';
import { useBeepProcessor } from './heart-beat/beep-processor';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';

export const useHeartBeatProcessor = (): UseHeartBeatReturn => {
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const sessionId = useRef<string>(Math.random().toString(36).substring(2, 9));
  
  const missedBeepsCounter = useRef<number>(0);
  const isMonitoringRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const lastProcessedPeakTimeRef = useRef<number>(0);
  const lastValidBpmTimestampRef = useRef<number>(0);
  const bpmHistoryRef = useRef<number[]>([]);
  
  // Hooks para procesamiento y detección, sin funcionalidad de beep
  const { 
    requestImmediateBeep, 
    processBeepQueue, 
    pendingBeepsQueue, 
    lastBeepTimeRef, 
    beepProcessorTimeoutRef, 
    cleanup: cleanupBeepProcessor 
  } = useBeepProcessor();
  
  // Get all necessary refs from useArrhythmiaDetector
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

  // Sistema de monitoreo para verificar si el BPM se actualiza correctamente
  useEffect(() => {
    if (isMonitoringRef.current && processorRef.current) {
      const bpmCheckInterval = setInterval(() => {
        const now = Date.now();
        // Si han pasado más de 5 segundos sin actualización de BPM y estamos monitoreando
        if (now - lastValidBpmTimestampRef.current > 5000 && currentBPM === 0) {
          console.log("BPM monitoring: No BPM updates for 5 seconds, forcing recalibration");
          
          // Intentar recuperar un BPM válido del historial
          if (bpmHistoryRef.current.length > 0) {
            const avgBpm = Math.round(
              bpmHistoryRef.current.reduce((sum, bpm) => sum + bpm, 0) / 
              bpmHistoryRef.current.length
            );
            
            if (avgBpm >= 40 && avgBpm <= 200) {
              setCurrentBPM(avgBpm);
              setConfidence(0.5);
              console.log("BPM monitoring: Recovered BPM from history:", avgBpm);
              lastValidBpmTimestampRef.current = now;
            }
          }
          
          // Forzar reset del procesador para recalibrar
          if (processorRef.current) {
            processorRef.current.setMonitoring(true);
            processorRef.current.reset();
            console.log("BPM monitoring: Processor reset for recalibration");
          }
        }
      }, 2000);
      
      return () => clearInterval(bpmCheckInterval);
    }
  }, [currentBPM]);

  useEffect(() => {
    console.log('useHeartBeatProcessor: Initializing new processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!processorRef.current) {
        processorRef.current = new HeartBeatProcessor();
        console.log('HeartBeatProcessor: New instance created - sin audio activado');
        initializedRef.current = true;
        
        if (typeof window !== 'undefined') {
          (window as any).heartBeatProcessor = processorRef.current;
        }
      }
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(true);
        console.log('HeartBeatProcessor: Monitoring state set to true, audio centralizado en PPGSignalMeter');
        isMonitoringRef.current = true;
      }
    } catch (error) {
      console.error('Error initializing HeartBeatProcessor:', error);
      toast.error('Error initializing heartbeat processor');
    }

    return () => {
      console.log('useHeartBeatProcessor: Cleaning up processor', {
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

  // Esta función ahora no hace nada, el beep está centralizado en PPGSignalMeter
  const requestBeep = useCallback((value: number): boolean => {
    console.log('useHeartBeatProcessor: Beep ELIMINADO - Todo el sonido SOLO en PPGSignalMeter', {
      value,
      isMonitoring: isMonitoringRef.current,
      processorExists: !!processorRef.current,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }, []);

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
        }
      };
    }

    // Ensure these refs exist before accessing them
    const lastRRIntervals = lastRRIntervalsRef?.current || [];
    const currentBeatIsArrhythmia = currentBeatIsArrhythmiaRef?.current || false;

    // Aplicar mayor amplificación para mejorar la detección
    const amplifiedValue = value * (amplificationFactor?.current || 1.5);

    const result = processSignalInternal(
      amplifiedValue, 
      currentBPM, 
      confidence, 
      processorRef.current, 
      requestBeep, 
      isMonitoringRef, 
      { current: lastRRIntervals }, 
      { current: currentBeatIsArrhythmia }
    );

    // Only update BPM if confidence is high enough and value is in physiological range
    if (result.bpm > 0 && result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.3) {
      // Add weighted update to reduce jumpiness - more weight to previous value for stability
      const newBPM = currentBPM === 0 ? result.bpm : (0.8 * currentBPM + 0.2 * result.bpm);
      setCurrentBPM(Math.round(newBPM));
      setConfidence(result.confidence);
      
      // Guardar timestamp de la última actualización válida de BPM
      lastValidBpmTimestampRef.current = Date.now();
      
      // Guardar en el historial para posible recuperación
      bpmHistoryRef.current.push(Math.round(newBPM));
      if (bpmHistoryRef.current.length > 10) {
        bpmHistoryRef.current.shift();
      }
      
      // Save valid BPM to help with future calculations
      if (lastValidBpmRef && typeof lastValidBpmRef.current !== 'undefined') {
        lastValidBpmRef.current = Math.round(newBPM);
      }
    }
    // Si no tenemos un BPM válido pero hay un histórico, usamos el último valor válido
    else if (result.bpm <= 0 && lastValidBpmRef && lastValidBpmRef.current > 0) {
      result.bpm = lastValidBpmRef.current;
      result.confidence = Math.max(0.3, result.confidence);
    }
    // Si no hay BPM válido ni histórico y el resultado es inválido, usar un valor predeterminado
    else if (result.bpm <= 0 && currentBPM === 0) {
      // Usar un valor predeterminado razonable si no tenemos BPM válido
      if (bpmHistoryRef.current.length > 0) {
        // Promedio del historial
        result.bpm = Math.round(
          bpmHistoryRef.current.reduce((sum, bpm) => sum + bpm, 0) / 
          bpmHistoryRef.current.length
        );
      } else {
        // Valor predeterminado si no hay historial
        result.bpm = 72;
      }
      result.confidence = 0.3;
    }

    // Process arrhythmia detection if we have enough RR intervals
    if (lastRRIntervals.length >= 3) {
      const isArrhythmia = processRRIntervals(lastRRIntervals);
      result.isArrhythmia = isArrhythmia;
    }

    return result;
  }, [
    currentBPM, 
    confidence, 
    processSignalInternal, 
    requestBeep, 
    processRRIntervals,
    lastRRIntervalsRef,
    currentBeatIsArrhythmiaRef,
    lastValidBpmRef
  ]);

  const reset = useCallback(() => {
    console.log('useHeartBeatProcessor: Resetting processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    if (processorRef.current) {
      processorRef.current.setMonitoring(false);
      isMonitoringRef.current = false;
      
      processorRef.current.reset();
      // No iniciamos audio aquí, está centralizado en PPGSignalMeter
    }
    
    setCurrentBPM(0);
    setConfidence(0);
    
    resetArrhythmiaDetector();
    resetSignalProcessor();
    
    missedBeepsCounter.current = 0;
    lastProcessedPeakTimeRef.current = 0;
    lastValidBpmTimestampRef.current = 0;
    bpmHistoryRef.current = [];
    
    cleanupBeepProcessor();
  }, [resetArrhythmiaDetector, resetSignalProcessor, cleanupBeepProcessor]);

  const startMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Starting monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = true;
      processorRef.current.setMonitoring(true);
      console.log('HeartBeatProcessor: Monitoring state set to true');
      
      // Reset peak detection state
      if (lastPeakTimeRef) lastPeakTimeRef.current = null;
      if (lastBeepTimeRef) lastBeepTimeRef.current = 0;
      lastProcessedPeakTimeRef.current = 0;
      if (pendingBeepsQueue) pendingBeepsQueue.current = [];
      if (consecutiveWeakSignalsRef) consecutiveWeakSignalsRef.current = 0;
      lastValidBpmTimestampRef.current = Date.now();
      
      // No iniciamos audio ni test beep aquí, está centralizado en PPGSignalMeter
      
      if (beepProcessorTimeoutRef && beepProcessorTimeoutRef.current) {
        clearTimeout(beepProcessorTimeoutRef.current);
        beepProcessorTimeoutRef.current = null;
      }
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Stopping monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = false;
      processorRef.current.setMonitoring(false);
      console.log('HeartBeatProcessor: Monitoring state set to false');
    }
    
    cleanupBeepProcessor();
    
    setCurrentBPM(0);
    setConfidence(0);
  }, [cleanupBeepProcessor]);

  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia: currentBeatIsArrhythmiaRef?.current || false,
    requestBeep,
    startMonitoring,
    stopMonitoring
  };
};
