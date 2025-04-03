
import { useState, useRef, useCallback } from 'react';
import { HeartBeatProcessor } from '@/modules/heart-beat/heart-beat-processor';
import { HeartBeatResult, RRIntervalData } from '@/types/heart-rate';

export function useHeartBeatProcessor() {
  const [processor] = useState(() => new HeartBeatProcessor());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBpm, setLastBpm] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [beatsCount, setBeatsCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepScheduledRef = useRef(false);
  const lastBeepTimeRef = useRef(0);
  
  // Inicializar el procesador
  const initialize = useCallback(() => {
    console.log("useHeartBeatProcessor: Inicializando");
    processor.reset();
    setIsProcessing(true);
    setBeatsCount(0);
  }, [processor]);
  
  // Procesar una señal y obtener resultado de pulso
  const processSignal = useCallback(
    (value: number, quality?: number): HeartBeatResult => {
      if (!isProcessing) {
        return {
          bpm: 0,
          confidence: 0,
          isPeak: false,
          arrhythmiaCount: 0,
          rrData: {
            intervals: [],
            lastPeakTime: null
          }
        };
      }
      
      try {
        // Procesar señal en el procesador
        const result = processor.processSignal(value);
        
        // Actualizar estado
        if (result.bpm > 0) {
          setLastBpm(result.bpm);
          setConfidence(result.confidence);
        }
        
        if (result.isPeak) {
          setBeatsCount(prev => prev + 1);
        }
        
        return result;
      } catch (err) {
        console.error("Error procesando señal para pulso cardíaco:", err);
        return {
          bpm: lastBpm,
          confidence: 0,
          isPeak: false,
          arrhythmiaCount: 0,
          rrData: {
            intervals: [],
            lastPeakTime: null
          }
        };
      }
    },
    [isProcessing, processor, lastBpm]
  );
  
  // Reiniciar el procesador
  const reset = useCallback(() => {
    console.log("useHeartBeatProcessor: Reset");
    processor.reset();
    setIsProcessing(false);
    setLastBpm(0);
    setConfidence(0);
    setBeatsCount(0);
  }, [processor]);
  
  // Para compatibilidad con el sistema antiguo
  const playBeep = useCallback((volume = 0.1) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const now = Date.now();
      
      // Limitar frecuencia de beeps
      if (now - lastBeepTimeRef.current < 300) {
        return false;
      }
      
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = volume;
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.05);
      
      lastBeepTimeRef.current = now;
      return true;
    } catch (err) {
      console.error("Error reproduciendo beep:", err);
      return false;
    }
  }, []);
  
  // Obtener ritmo actual
  const getCurrentBPM = useCallback(() => {
    return lastBpm;
  }, [lastBpm]);
  
  return {
    isProcessing,
    lastBpm,
    confidence,
    beatsCount,
    processSignal,
    reset,
    initialize,
    playBeep,
    getCurrentBPM
  };
}
