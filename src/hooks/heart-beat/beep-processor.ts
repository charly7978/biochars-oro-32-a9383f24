/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useRef } from 'react';

export function useBeepProcessor() {
  // Make sure React is imported correctly for useRef to work
  const lastBeepTime = useRef<number>(0);
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  
  const playBeep = (frequency: number, duration: number, volume: number) => {
    const now = Date.now();
    if (now - lastBeepTime.current < 250) {
      return;
    }
    
    lastBeepTime.current = now;
    
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }
    
    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume();
    }
    
    oscillator.current = audioContext.current.createOscillator();
    gain.current = audioContext.current.createGain();
    
    oscillator.current.type = 'sine';
    oscillator.current.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
    
    gain.current.gain.setValueAtTime(volume, audioContext.current.currentTime);
    gain.current.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + duration / 1000);
    
    oscillator.current.connect(gain.current);
    gain.current.connect(audioContext.current.destination);
    
    oscillator.current.start(0);
    oscillator.current.stop(audioContext.current.currentTime + duration / 1000);
  };
  
  const reset = () => {
    if (oscillator.current) {
      oscillator.current.stop();
      oscillator.current.disconnect();
      oscillator.current = null;
    }
    if (gain.current) {
      gain.current.disconnect();
      gain.current = null;
    }
    if (audioContext.current && audioContext.current.state === 'running') {
      audioContext.current.close();
      audioContext.current = null;
    }
  };
  
  return {
    playBeep,
    reset
  };
}
