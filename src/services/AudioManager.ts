
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * AudioManager Service
 * Centralizes all audio generation for the cardiac system
 * Listens for events from the OptimizedSignalDistributor
 */

// Audio context for all sound generation
let audioContext: AudioContext | null = null;

// State
let isAudioEnabled: boolean = true;
let beepVolume: number = 0.3; // Default volume
let lastBeepTime: number = 0;
const MIN_BEEP_INTERVAL_MS = 500; // Minimum time between beeps

// Beep types
type BeepType = 'normal' | 'arrhythmia' | 'alert';

/**
 * Initialize the audio system and start listening for cardiac events
 */
export function initializeAudioSystem(): void {
  // Create audio context on user interaction (browser policy)
  document.addEventListener('click', initializeAudioContextOnUserInteraction, { once: true });
  
  // Listen for cardiac peak events from the OptimizedSignalDistributor
  window.addEventListener('cardiac-peak-detected', handleCardiacPeakEvent);
  
  console.log("AudioManager: Initialized and listening for cardiac events");
}

/**
 * Initialize AudioContext on user interaction to comply with browser policies
 */
function initializeAudioContextOnUserInteraction(): void {
  if (audioContext === null) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log("AudioManager: AudioContext initialized on user interaction");
    } catch (error) {
      console.error("AudioManager: Failed to create AudioContext", error);
    }
  }
}

/**
 * Handle cardiac peak events from the OptimizedSignalDistributor
 */
function handleCardiacPeakEvent(event: CustomEvent): void {
  if (!isAudioEnabled || !audioContext) return;
  
  const now = Date.now();
  
  // Enforce minimum interval between beeps
  if (now - lastBeepTime < MIN_BEEP_INTERVAL_MS) {
    return;
  }
  
  // Extract heart rate and determine if it's an arrhythmia
  const { heartRate, source } = event.detail;
  
  // Choose beep type based on heart rate
  let beepType: BeepType = 'normal';
  
  if (heartRate > 100) {
    beepType = 'alert';
  } else if (event.detail.isArrhythmia) {
    beepType = 'arrhythmia';
  }
  
  // Play appropriate beep
  playBeep(beepType);
  
  // Update last beep time
  lastBeepTime = now;
  
  console.log("AudioManager: Handled cardiac peak event", { 
    heartRate, 
    source,
    beepType
  });
}

/**
 * Play a beep sound with the specified type
 */
export function playBeep(type: BeepType = 'normal'): boolean {
  if (!isAudioEnabled || !audioContext) {
    return false;
  }
  
  try {
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure based on type
    switch(type) {
      case 'normal':
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = beepVolume;
        break;
      case 'arrhythmia':
        oscillator.type = 'triangle';
        oscillator.frequency.value = 660;
        gainNode.gain.value = beepVolume * 1.2;
        break;
      case 'alert':
        oscillator.type = 'square';
        oscillator.frequency.value = 1100;
        gainNode.gain.value = beepVolume * 1.5;
        break;
    }
    
    // Schedule envelope
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
    
    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + 0.1);
    
    return true;
  } catch (error) {
    console.error("AudioManager: Error playing beep", error);
    return false;
  }
}

/**
 * Set audio enabled state
 */
export function setAudioEnabled(enabled: boolean): void {
  isAudioEnabled = enabled;
  console.log(`AudioManager: Audio ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Set beep volume (0-1)
 */
export function setBeepVolume(volume: number): void {
  beepVolume = Math.max(0, Math.min(1, volume));
  console.log(`AudioManager: Volume set to ${beepVolume}`);
}

/**
 * Check if audio is enabled
 */
export function isAudioEnabled(): boolean {
  return isAudioEnabled;
}

/**
 * Test the audio system with each beep type
 */
export function testAudioSystem(): void {
  if (!audioContext) {
    initializeAudioContextOnUserInteraction();
  }
  
  setTimeout(() => playBeep('normal'), 0);
  setTimeout(() => playBeep('arrhythmia'), 700);
  setTimeout(() => playBeep('alert'), 1400);
  
  console.log("AudioManager: Running audio test sequence");
}

/**
 * Clean up audio resources
 */
export function cleanupAudioSystem(): void {
  window.removeEventListener('cardiac-peak-detected', handleCardiacPeakEvent);
  
  if (audioContext) {
    audioContext.close().catch(console.error);
    audioContext = null;
  }
  
  console.log("AudioManager: Cleaned up audio resources");
}
