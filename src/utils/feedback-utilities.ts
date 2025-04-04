
/**
 * Utility functions for providing user feedback via audio, vibration, etc.
 */

export interface VibrationOptions {
  duration?: number;
  pattern?: number[];
  strong?: boolean;
}

/**
 * Vibrate the device with configurable pattern
 * Silently fails if vibration is not supported
 */
export function vibrate(options: VibrationOptions = {}): boolean {
  try {
    if (!window.navigator.vibrate) {
      return false; // Vibration not supported
    }
    
    const { duration = 100, pattern, strong = false } = options;
    
    if (pattern) {
      // Use pattern for more complex vibrations
      window.navigator.vibrate(pattern);
    } else {
      // For arrhythmia, use a stronger, distinctive pattern
      if (strong) {
        window.navigator.vibrate([100, 50, 200, 50, 100]);
      } else {
        window.navigator.vibrate(duration);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Vibration failed:", error);
    return false;
  }
}

/**
 * Check if vibration is supported by the device
 */
export function isVibrationSupported(): boolean {
  return 'vibrate' in window.navigator;
}

/**
 * Play arrhythmia alert sound with configurable options
 */
export function playArrhythmiaAlert(
  audioContext: AudioContext | null,
  options: { 
    frequency?: number; 
    duration?: number; 
    volume?: number;
    distinctive?: boolean;
  } = {}
): void {
  try {
    if (!audioContext || audioContext.state !== 'running') {
      return;
    }
    
    const { 
      frequency = 880, 
      duration = 150, 
      volume = 0.6,
      distinctive = true
    } = options;
    
    // Primary tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = distinctive ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration / 1000));
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + (duration / 1000) + 0.02);
    
    // Secondary tone for distinctive arrhythmia alert
    if (distinctive) {
      const secondaryOsc = audioContext.createOscillator();
      const secondaryGain = audioContext.createGain();
      
      secondaryOsc.type = 'sawtooth';
      secondaryOsc.frequency.setValueAtTime(frequency * 1.5, audioContext.currentTime);
      
      secondaryGain.gain.setValueAtTime(0, audioContext.currentTime);
      secondaryGain.gain.linearRampToValueAtTime(volume * 0.4, audioContext.currentTime + 0.01);
      secondaryGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration / 1000));
      
      secondaryOsc.connect(secondaryGain);
      secondaryGain.connect(audioContext.destination);
      
      secondaryOsc.start(audioContext.currentTime);
      secondaryOsc.stop(audioContext.currentTime + (duration / 1000) + 0.02);
    }
  } catch (error) {
    console.error("Audio playback error:", error);
  }
}

/**
 * Initialize device sensors and request permissions
 */
export async function initializeSensors(): Promise<{ vibration: boolean }> {
  const result = {
    vibration: isVibrationSupported()
  };
  
  // Request permission for vibration by trying a tiny vibration
  if (result.vibration) {
    try {
      window.navigator.vibrate(1);
    } catch (e) {
      result.vibration = false;
    }
  }
  
  return result;
}
