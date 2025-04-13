
import { useCallback } from 'react';

export function useBeepProcessor() {
  const pendingBeepsQueue = { current: [] };
  const beepProcessorTimeoutRef = { current: null };
  const lastBeepTimeRef = { current: 0 };
  
  const MIN_BEEP_INTERVAL_MS = 500;
  
  const processBeepQueue = useCallback((
    isMonitoringRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    MAX_CONSECUTIVE_WEAK_SIGNALS,
    missedBeepsCounter,
    playBeep
  ) => {
    // Todo el procesamiento de beeps ha sido eliminado
    // El sonido es manejado exclusivamente por PPGSignalMeter
    console.log("BeepProcessor: Completamente eliminado - sonido manejado exclusivamente por PPGSignalMeter");
    pendingBeepsQueue.current = []; // Vaciar cola
    return;
  }, []);

  const requestImmediateBeep = useCallback((
    value,
    isMonitoringRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    MAX_CONSECUTIVE_WEAK_SIGNALS,
    missedBeepsCounter,
    playBeep
  ) => {
    // Todo el código de beep ha sido eliminado
    // El sonido es manejado exclusivamente por PPGSignalMeter
    console.log("BeepProcessor: Beep completamente eliminado - sonido manejado exclusivamente por PPGSignalMeter");
    return false;
  }, []);

  const cleanup = useCallback(() => {
    pendingBeepsQueue.current = [];
    
    if (beepProcessorTimeoutRef.current) {
      clearTimeout(beepProcessorTimeoutRef.current);
      beepProcessorTimeoutRef.current = null;
    }
  }, []);

  return {
    requestImmediateBeep,
    processBeepQueue,
    pendingBeepsQueue,
    lastBeepTimeRef,
    beepProcessorTimeoutRef,
    cleanup
  };
}
