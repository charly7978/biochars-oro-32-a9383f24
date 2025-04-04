
/**
 * useCardiacSignal hook
 * Custom hook for components to interact with the CardiacSignalService
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import CardiacSignalService from '../services/CardiacSignalService';

interface CardiacPeak {
  time: number;
  value: number;
  isArrhythmia: boolean;
  confidence: number;
  enhancedValue?: number;
}

interface UseCardiacSignalOptions {
  onPeak?: (peak: CardiacPeak) => void;
  playSound?: boolean;
}

interface UseCardiacSignalReturn {
  processSignal: (value: number, quality?: number, arrhythmiaData?: { isArrhythmia: boolean }) => boolean;
  lastPeak: CardiacPeak | null;
  reset: () => void;
  peakCount: number;
  arrhythmiaCount: number;
}

export function useCardiacSignal({ 
  onPeak, 
  playSound = false 
}: UseCardiacSignalOptions = {}): UseCardiacSignalReturn {
  const [lastPeak, setLastPeak] = useState<CardiacPeak | null>(null);
  const [peakCount, setPeakCount] = useState(0);
  const [arrhythmiaCount, setArrhythmiaCount] = useState(0);
  
  const serviceRef = useRef<CardiacSignalService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const MIN_SOUND_INTERVAL = 250; // ms
  
  // Initialize the service and audio context
  useEffect(() => {
    serviceRef.current = CardiacSignalService.getInstance();
    serviceRef.current.initialize();
    
    if (playSound && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
      } catch (err) {
        console.error("useCardiacSignal: Failed to create AudioContext", err);
      }
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("useCardiacSignal: Error closing AudioContext", err);
        });
        audioContextRef.current = null;
      }
    };
  }, [playSound]);
  
  // Handle peak events from the service
  useEffect(() => {
    if (!serviceRef.current) return;
    
    const handlePeak = (peak: CardiacPeak) => {
      setLastPeak(peak);
      setPeakCount(prev => prev + 1);
      
      if (peak.isArrhythmia) {
        setArrhythmiaCount(prev => prev + 1);
      }
      
      if (onPeak) {
        onPeak(peak);
      }
      
      if (playSound && audioContextRef.current) {
        playBeepSound(peak.isArrhythmia);
      }
    };
    
    // Subscribe to peak events
    const unsubscribe = serviceRef.current.onPeak(handlePeak);
    
    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [onPeak, playSound]);
  
  // Play a beep sound when a peak is detected
  const playBeepSound = useCallback((isArrhythmia: boolean = false) => {
    if (!audioContextRef.current) return;
    
    const now = Date.now();
    if (now - lastSoundTimeRef.current < MIN_SOUND_INTERVAL) {
      return;
    }
    
    try {
      const ctx = audioContextRef.current;
      
      // Resume context if suspended
      if (ctx.state !== 'running') {
        ctx.resume().catch(err => {
          console.error("useCardiacSignal: Failed to resume AudioContext", err);
        });
      }
      
      // Create oscillators for primary and secondary tones
      const primaryOsc = ctx.createOscillator();
      const primaryGain = ctx.createGain();
      
      primaryOsc.type = "sine";
      primaryOsc.frequency.setValueAtTime(
        isArrhythmia ? 880 : 700, 
        ctx.currentTime
      );
      
      primaryGain.gain.setValueAtTime(0, ctx.currentTime);
      primaryGain.gain.linearRampToValueAtTime(
        isArrhythmia ? 0.9 : 0.7,
        ctx.currentTime + 0.005
      );
      primaryGain.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + (isArrhythmia ? 0.08 : 0.06)
      );
      
      primaryOsc.connect(primaryGain);
      primaryGain.connect(ctx.destination);
      
      primaryOsc.start(ctx.currentTime);
      primaryOsc.stop(ctx.currentTime + (isArrhythmia ? 0.09 : 0.07));
      
      lastSoundTimeRef.current = now;
    } catch (err) {
      console.error("useCardiacSignal: Error playing beep sound", err);
    }
  }, []);
  
  // Process a signal value
  const processSignal = useCallback((
    value: number, 
    quality: number = 0, 
    arrhythmiaData?: { isArrhythmia: boolean }
  ): boolean => {
    if (!serviceRef.current) {
      serviceRef.current = CardiacSignalService.getInstance();
      serviceRef.current.initialize();
    }
    
    return serviceRef.current.processSignal(value, quality, arrhythmiaData);
  }, []);
  
  // Reset counters and service
  const reset = useCallback(() => {
    setPeakCount(0);
    setArrhythmiaCount(0);
    setLastPeak(null);
    
    if (serviceRef.current) {
      serviceRef.current.reset();
    }
  }, []);
  
  return {
    processSignal,
    lastPeak,
    reset,
    peakCount,
    arrhythmiaCount
  };
}
