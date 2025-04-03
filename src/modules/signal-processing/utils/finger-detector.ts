
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Utilidades para detección de presencia de dedo
 * VERSIÓN MEJORADA CON MAYOR SENSIBILIDAD
 */

// Almacenamiento para detección de patrones rítmicos
let rhythmDetectionHistory: Array<{time: number, value: number}> = [];
let confirmedFingerPresence: boolean = false;
let lastPeakTimes: number[] = [];
let consistentPatternsCount: number = 0;

// Constantes para detección de patrones - AJUSTADO PARA MAYOR SENSIBILIDAD
const PATTERN_WINDOW_MS = 3000; // Ventana de 3 segundos
const MIN_PEAKS_FOR_PATTERN = 2; // Mínimo 2 picos para confirmar patrón (reducido de 3)
const PEAK_DETECTION_THRESHOLD = 0.15; // Umbral para detección de picos (reducido de 0.2)
const REQUIRED_CONSISTENT_PATTERNS = 2; // Patrones requeridos para confirmación (reducido de 3)
const MAX_CONSISTENT_PATTERNS = 10; // Máximo contador de patrones para evitar overflow

// Nueva configuración para detección sostenida
const SUSTAINED_DETECTION_COUNT = 5; // Número de detecciones para confirmar presencia sostenida
let sustainedDetectionCount = 0;
let isSustainedDetection = false;

/**
 * Detecta la presencia de un dedo basado en análisis de patrones de la señal PPG
 * VERSIÓN MEJORADA con mayor sensibilidad y tolerancia a señales débiles
 * @param signalBuffer Buffer de señal filtrada
 * @param sensitivity Factor de sensibilidad (0-1)
 * @returns true si se detecta presencia de dedo
 */
export function detectFingerPresence(
  signalBuffer: number[],
  sensitivity: number = 0.6
): boolean {
  // Si ya confirmamos la presencia, mantenerla a menos que se pierda el patrón completamente
  if (confirmedFingerPresence) {
    // Verificar si aún tenemos un patrón válido con criterios más permisivos
    const stillValid = validateOngoingPattern(signalBuffer, sensitivity);
    
    if (!stillValid) {
      // Si se pierde el patrón, reducir contador de consistencia más lentamente
      consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.5);
      
      // Si perdimos demasiados patrones, quitar la confirmación pero con más tolerancia
      if (consistentPatternsCount < 1) {
        // Mantener la detección sostenida por un tiempo adicional
        if (isSustainedDetection) {
          sustainedDetectionCount--;
          if (sustainedDetectionCount <= 0) {
            isSustainedDetection = false;
            confirmedFingerPresence = false;
            console.log("Dedo perdido después de detección sostenida");
          } else {
            // Todavía mantener la detección durante el período de gracia
            return true;
          }
        } else {
          confirmedFingerPresence = false;
        }
      }
    } else {
      // Si la detección sostenida estaba activa pero se recupera, restaurarla
      if (isSustainedDetection && sustainedDetectionCount < SUSTAINED_DETECTION_COUNT) {
        sustainedDetectionCount = SUSTAINED_DETECTION_COUNT;
      }
    }
    
    return confirmedFingerPresence;
  }
  
  // Agregar nuevo valor al historial
  if (signalBuffer.length > 0) {
    const now = Date.now();
    rhythmDetectionHistory.push({
      time: now,
      value: signalBuffer[signalBuffer.length - 1]
    });
    
    // Mantener solo valores recientes
    rhythmDetectionHistory = rhythmDetectionHistory
      .filter(point => now - point.time < PATTERN_WINDOW_MS * 2);
  }
  
  // Aplicar factor de sensibilidad ajustado (más alto = mayor sensibilidad)
  const effectiveSensitivity = sensitivity * 1.4; // Aumentar factor para mayor sensibilidad
  
  // Detectar patrones rítmicos con sensibilidad ajustada
  const hasRhythmicPattern = detectRhythmicPattern(effectiveSensitivity);
  
  // Si detectamos patrón, incrementar contador más rápido
  if (hasRhythmicPattern) {
    consistentPatternsCount = Math.min(
      MAX_CONSISTENT_PATTERNS, 
      consistentPatternsCount + 1.2 // Incremento más rápido
    );
    
    // Si tenemos suficientes patrones consecutivos, confirmar presencia
    if (consistentPatternsCount >= REQUIRED_CONSISTENT_PATTERNS) {
      confirmedFingerPresence = true;
      
      // Iniciar detección sostenida para mayor estabilidad
      sustainedDetectionCount = SUSTAINED_DETECTION_COUNT;
      isSustainedDetection = true;
      
      console.log("Dedo detectado por patrón rítmico consistente (sensibilidad mejorada)");
    }
  } else {
    // Reducir contador si no hay patrón, pero más lentamente
    consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.4);
  }
  
  return confirmedFingerPresence;
}

/**
 * Detecta patrones rítmicos en la señal con sensibilidad mejorada
 */
function detectRhythmicPattern(sensitivity: number): boolean {
  const now = Date.now();
  
  if (rhythmDetectionHistory.length < 12) { // Reducido de 15 para mayor sensibilidad
    return false;
  }
  
  // Ajustar umbral según sensibilidad - umbral más bajo = más sensible
  const adjustedThreshold = PEAK_DETECTION_THRESHOLD * (1.1 - sensitivity);
  
  // Buscar picos en la señal reciente
  const recentSignals = rhythmDetectionHistory
    .filter(point => now - point.time < PATTERN_WINDOW_MS);
  
  if (recentSignals.length < 8) { // Reducido de 10 para mayor sensibilidad
    return false;
  }
  
  // Detectar picos con criterios menos estrictos
  const peaks: number[] = [];
  
  for (let i = 1; i < recentSignals.length - 1; i++) { // Reducido de 2 a 1 para mayor sensibilidad
    const current = recentSignals[i];
    const prev1 = recentSignals[i - 1];
    const next1 = recentSignals[i + 1];
    
    // Verificar si este punto es un pico - criterios menos estrictos
    if (current.value > prev1.value * 1.1 && // Reducido factor de 1.2 a 1.1
        current.value > next1.value * 1.1 &&
        current.value > adjustedThreshold) {
      peaks.push(current.time);
    }
  }
  
  // Verificar si tenemos suficientes picos
  if (peaks.length < MIN_PEAKS_FOR_PATTERN) {
    return false;
  }
  
  // Calcular intervalos entre picos
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  // Filtrar intervalos fisiológicamente plausibles (30-200 BPM, ampliado)
  const validIntervals = intervals.filter(interval => 
    interval >= 300 && interval <= 2000 // Ampliado rango (30-200 BPM)
  );
  
  // Umbral de validez reducido para mayor sensibilidad
  if (validIntervals.length < Math.floor(intervals.length * 0.6)) { // Reducido de 0.7 a 0.6
    // Menos del 60% de intervalos son plausibles
    return false;
  }
  
  // Verificar consistencia en intervalos con mayor tolerancia
  let consistentIntervals = 0;
  const maxDeviation = 250; // ms, aumentado para mayor tolerancia
  
  for (let i = 1; i < validIntervals.length; i++) {
    if (Math.abs(validIntervals[i] - validIntervals[i - 1]) < maxDeviation) {
      consistentIntervals++;
    }
  }
  
  // Si tenemos intervalos consistentes, confirmar patrón con criterios más permisivos
  const hasPattern = consistentIntervals >= Math.max(1, MIN_PEAKS_FOR_PATTERN - 1);
  
  if (hasPattern) {
    lastPeakTimes = peaks;
    console.log("Patrón rítmico detectado (sensibilidad mejorada)", {
      peakCount: peaks.length,
      consistentIntervals,
      validIntervals: validIntervals.length
    });
  }
  
  return hasPattern;
}

/**
 * Valida si el patrón rítmico continúa presente, con mayor tolerancia a señales débiles
 */
function validateOngoingPattern(signalBuffer: number[], sensitivity: number): boolean {
  // Si el buffer es muy pequeño, no podemos validar
  if (signalBuffer.length < 8) { // Reducido de 10 para mayor sensibilidad
    return true; // Asumir que sigue siendo válido por falta de datos
  }
  
  // Verificar que la señal sigue teniendo variaciones 
  // (evitar señales planas que podrían falsamente parecer estables)
  const min = Math.min(...signalBuffer);
  const max = Math.max(...signalBuffer);
  const amplitude = max - min;
  
  // Si la amplitud es muy baja, podría no haber dedo 
  // Umbral reducido para mayor sensibilidad
  if (amplitude < 0.03) { // Reducido de 0.05 para mayor sensibilidad
    return false;
  }
  
  // Si hemos perdido los patrones rítmicos por completo
  const now = Date.now();
  const lastPatternTime = lastPeakTimes.length > 0 ? 
    lastPeakTimes[lastPeakTimes.length - 1] : 0;
  
  // Plazo más largo para mantener detección
  const timeoutLimit = 6000 + sensitivity * 2000; // 6-8s según sensibilidad
  
  // Si ha pasado mucho tiempo desde el último patrón detectado
  if (now - lastPatternTime > timeoutLimit) {
    return false;
  }
  
  // Si llegamos aquí, el patrón sigue siendo válido
  return true;
}

/**
 * Reinicia el detector de dedo
 */
export function resetFingerDetector(): void {
  rhythmDetectionHistory = [];
  confirmedFingerPresence = false;
  lastPeakTimes = [];
  consistentPatternsCount = 0;
  isSustainedDetection = false;
  sustainedDetectionCount = 0;
  console.log("Detector de dedo reseteado completamente");
}
