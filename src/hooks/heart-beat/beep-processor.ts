
import { useState, useCallback, useRef } from 'react';
import { playBeep, setAudioEnabled, isAudioEnabled } from '../../services/AudioManager';

export function useBeepProcessor() {
  const pendingBeepsQueue = useRef<{time: number, value: number}[]>([]);
  const beepProcessorTimeoutRef = useRef<number | null>(null);
  const lastBeepTimeRef = useRef<number>(0);
  const audioEnabledRef = useRef<boolean>(true);
  
  const MIN_BEEP_INTERVAL_MS = 500;
  
  // This function is now simplified as AudioManager handles most of the logic
  const processBeepQueue = useCallback((
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastSignalQualityRef: React.MutableRefObject<number>,
    consecutiveWeakSignalsRef: React.MutableRefObject<number>,
    MAX_CONSECUTIVE_WEAK_SIGNALS: number,
    missedBeepsCounter: React.MutableRefObject<number>,
    playBeepCallback: (volume: number) => boolean | Promise<boolean>
  ) => {
    console.log("BeepProcessor: Using AudioManager for centralized audio handling");
    
    // AudioManager now handles the beep timing and generation
    // Just ensure the audio state is synced
    setAudioEnabled(isMonitoringRef.current && audioEnabledRef.current);
    
    // Clear the local queue as it's now managed by AudioManager
    pendingBeepsQueue.current = []; 
  }, []);

  // Simplified to delegate to AudioManager
  const requestImmediateBeep = useCallback((
    value: number,
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastSignalQualityRef: React.MutableRefObject<number>,
    consecutiveWeakSignalsRef: React.MutableRefObject<number>,
    MAX_CONSECUTIVE_WEAK_SIGNALS: number,
    missedBeepsCounter: React.MutableRefObject<number>,
    playBeepCallback: (volume: number) => boolean | Promise<boolean>
  ): boolean => {
    // This function now only forwards the request to AudioManager
    // when not already handled by the OptimizedSignalDistributor
    console.log("BeepProcessor: Beep request delegated to AudioManager");
    
    // Only play if specifically requested and not handled by CardiacChannel
    const now = Date.now();
    if (now - lastBeepTimeRef.current > MIN_BEEP_INTERVAL_MS) {
      lastBeepTimeRef.current = now;
      return playBeep('normal');
    }
    
    return false;
  }, []);

  const setIsAudioEnabled = useCallback((enabled: boolean) => {
    audioEnabledRef.current = enabled;
    setAudioEnabled(enabled);
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
    setIsAudioEnabled,
    cleanup
  };
}
