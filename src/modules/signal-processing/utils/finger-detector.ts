
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Detector de presencia de dedo centralizado y mejorado
 * VERSIÓN OPTIMIZADA con mayor sensibilidad y tolerancia
 */

// Almacenamiento para detección de patrones rítmicos
let rhythmDetectionHistory: Array<{time: number, value: number}> = [];
let confirmedFingerPresence: boolean = false;
let lastPeakTimes: number[] = [];
let consistentPatternsCount: number = 0;

// Constantes para detección de patrones - AJUSTADO PARA MAYOR SENSIBILIDAD
const PATTERN_WINDOW_MS = 3000; // Ventana de 3 segundos
const MIN_PEAKS_FOR_PATTERN = 2; // Mínimo 2 picos para confirmar patrón
const PEAK_DETECTION_THRESHOLD = 0.08; // Umbral aún más bajo para detección de picos
const REQUIRED_CONSISTENT_PATTERNS = 1; // Solo requiere 1 patrón (máxima sensibilidad)
const MAX_CONSISTENT_PATTERNS = 10; // Máximo contador de patrones para evitar overflow

// Nueva configuración para detección sostenida
const SUSTAINED_DETECTION_COUNT = 5; // Número de detecciones para confirmar presencia sostenida
let sustainedDetectionCount = 0;
let isSustainedDetection = false;

// Nuevas métricas para aumentar sensibilidad
let lastSignalTimestamp = 0;
let continuityPenalty = 0;
const MAX_SIGNAL_GAP_MS = 200; // Máxima brecha permitida (200ms)

// Nueva configuración para detección de amplitud mínima (evita falsas detecciones con señal muy débil)
const MIN_AMPLITUDE_THRESHOLD = 0.01; // Umbral mínimo de amplitud considerablemente bajo
let lastAmplitudes: number[] = [];

/**
 * Detecta la presencia de un dedo basado en análisis de patrones de la señal PPG
 * VERSIÓN SUPER SENSIBLE para capturar incluso señales más débiles
 * @param signalBuffer Buffer de señal filtrada
 * @param sensitivity Factor de sensibilidad (0-1)
 * @returns true si se detecta presencia de dedo
 */
export function detectFingerPresence(
  signalBuffer: number[],
  sensitivity: number = 0.9 // Aumentado a 0.9 para máxima sensibilidad
): boolean {
  // Verificar continuidad de la señal
  const now = Date.now();
  if (lastSignalTimestamp > 0) {
    const timeDiff = now - lastSignalTimestamp;
    if (timeDiff > MAX_SIGNAL_GAP_MS) {
      // Penalizar interrupciones, pero menos severamente
      continuityPenalty = Math.min(0.8, continuityPenalty + 0.05);
    } else {
      // Reducir penalización más rápidamente
      continuityPenalty = Math.max(0, continuityPenalty - 0.05);
    }
  }
  lastSignalTimestamp = now;
  
  // Si hay muy pocas muestras, asumimos que no hay dedo todavía
  if (signalBuffer.length < 3) {
    return false;
  }
  
  // Verificar amplitud mínima de la señal (evitar ruido de fondo)
  const currentAmplitude = calculateAmplitude(signalBuffer);
  lastAmplitudes.push(currentAmplitude);
  if (lastAmplitudes.length > 5) {
    lastAmplitudes.shift();
  }
  
  // Calcular amplitud media reciente
  const avgAmplitude = lastAmplitudes.reduce((a, b) => a + b, 0) / lastAmplitudes.length;
  
  // Si la amplitud es extremadamente baja, probablemente no hay dedo
  // Pero usamos un umbral muy bajo para ser más permisivos
  if (avgAmplitude < MIN_AMPLITUDE_THRESHOLD) {
    // Solo resetear si la amplitud es REALMENTE baja y ya no hay confirmación
    if (avgAmplitude < MIN_AMPLITUDE_THRESHOLD / 2 && !confirmedFingerPresence) {
      return false;
    }
  }
  
  // Si ya confirmamos la presencia, mantenerla a menos que se pierda el patrón completamente
  if (confirmedFingerPresence) {
    // Verificar si aún tenemos un patrón válido con criterios muy permisivos
    const stillValid = validateOngoingPattern(signalBuffer, sensitivity);
    
    if (!stillValid) {
      // Si se pierde el patrón, reducir contador de consistencia más lentamente
      consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.2); // Reducción aún más lenta
      
      // Si perdimos demasiados patrones, quitar la confirmación con mucha más tolerancia
      if (consistentPatternsCount < 0.5) { // Reducido a 0.5 para más tolerancia
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
    rhythmDetectionHistory.push({
      time: now,
      value: signalBuffer[signalBuffer.length - 1]
    });
    
    // Mantener solo valores recientes
    rhythmDetectionHistory = rhythmDetectionHistory
      .filter(point => now - point.time < PATTERN_WINDOW_MS * 2);
  }
  
  // Aplicar factor de sensibilidad ajustado (más alto = mayor sensibilidad)
  // Penalizar menos por interrupciones en la señal
  const effectiveSensitivity = sensitivity * (1.2 - continuityPenalty * 0.5);
  
  // Detectar patrones rítmicos con sensibilidad ajustada
  const hasRhythmicPattern = detectRhythmicPattern(effectiveSensitivity);
  
  // Si detectamos patrón, incrementar contador más rápido
  if (hasRhythmicPattern) {
    consistentPatternsCount = Math.min(
      MAX_CONSISTENT_PATTERNS, 
      consistentPatternsCount + 2 // Incremento aún más rápido
    );
    
    // Si tenemos suficientes patrones consecutivos, confirmar presencia
    if (consistentPatternsCount >= REQUIRED_CONSISTENT_PATTERNS) {
      confirmedFingerPresence = true;
      
      // Iniciar detección sostenida para mayor estabilidad
      sustainedDetectionCount = SUSTAINED_DETECTION_COUNT;
      isSustainedDetection = true;
      
      console.log("Dedo detectado por patrón rítmico consistente (super sensible)");
    }
  } else {
    // Reducir contador si no hay patrón, pero mucho más lentamente
    consistentPatternsCount = Math.max(0, consistentPatternsCount - 0.1); // Reducción extremadamente lenta
  }
  
  return confirmedFingerPresence;
}

/**
 * Calcula la amplitud de la señal (diferencia entre máximo y mínimo)
 */
function calculateAmplitude(buffer: number[]): number {
  if (buffer.length < 2) return 0;
  const max = Math.max(...buffer);
  const min = Math.min(...buffer);
  return max - min;
}

/**
 * Detecta patrones rítmicos en la señal con sensibilidad mejorada
 */
function detectRhythmicPattern(sensitivity: number): boolean {
  const now = Date.now();
  
  if (rhythmDetectionHistory.length < 5) { // Reducido aún más para mayor sensibilidad
    return false;
  }
  
  // Ajustar umbral según sensibilidad - umbral más bajo = más sensible
  const adjustedThreshold = PEAK_DETECTION_THRESHOLD * (1.0 - sensitivity);
  
  // Buscar picos en la señal reciente
  const recentSignals = rhythmDetectionHistory
    .filter(point => now - point.time < PATTERN_WINDOW_MS);
  
  if (recentSignals.length < 4) { // Reducido a solo 4 puntos para evaluación
    return false;
  }
  
  // Detectar picos con criterios extremadamente permisivos
  const peaks: number[] = [];
  
  for (let i = 1; i < recentSignals.length - 1; i++) {
    const current = recentSignals[i];
    const prev1 = recentSignals[i - 1];
    const next1 = recentSignals[i + 1];
    
    // Verificar si este punto es un pico - criterios muy permisivos
    if (current.value > prev1.value * 1.01 && // Reducido al mínimo (1%)
        current.value > next1.value * 1.01 &&
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
  
  // Filtrar intervalos fisiológicamente plausibles (20-250 BPM, ampliado aún más)
  const validIntervals = intervals.filter(interval => 
    interval >= 240 && interval <= 3000 // Ampliado rango (20-250 BPM)
  );
  
  // Umbral de validez reducido para máxima sensibilidad
  if (validIntervals.length < Math.floor(intervals.length * 0.3)) { // Reducido a 30%
    // Menos del 30% de intervalos son plausibles
    return false;
  }
  
  // Verificar consistencia en intervalos con máxima tolerancia
  let consistentIntervals = 0;
  const maxDeviation = 400; // ms, aumentado para máxima tolerancia
  
  for (let i = 1; i < validIntervals.length; i++) {
    if (Math.abs(validIntervals[i] - validIntervals[i - 1]) < maxDeviation) {
      consistentIntervals++;
    }
  }
  
  // Si tenemos intervalos consistentes, confirmar patrón con criterios extremadamente permisivos
  const hasPattern = consistentIntervals >= Math.max(1, MIN_PEAKS_FOR_PATTERN - 1);
  
  if (hasPattern) {
    lastPeakTimes = peaks;
    console.log("Patrón rítmico detectado (super sensible)", {
      peakCount: peaks.length,
      consistentIntervals,
      validIntervals: validIntervals.length,
      sensitivity
    });
  }
  
  return hasPattern;
}

/**
 * Valida si el patrón rítmico continúa presente, con máxima tolerancia a señales débiles
 */
function validateOngoingPattern(signalBuffer: number[], sensitivity: number): boolean {
  // Si el buffer es muy pequeño, no podemos validar
  if (signalBuffer.length < 3) { // Reducido para mayor sensibilidad
    return true; // Asumir que sigue siendo válido por falta de datos
  }
  
  // Verificar que la señal sigue teniendo variaciones 
  // (evitar señales planas que podrían falsamente parecer estables)
  const min = Math.min(...signalBuffer);
  const max = Math.max(...signalBuffer);
  const amplitude = max - min;
  
  // Si la amplitud es extremadamente baja, podría no haber dedo 
  if (amplitude < 0.005) { // Reducido a un mínimo absoluto
    return false;
  }
  
  // Si hemos perdido los patrones rítmicos por completo
  const now = Date.now();
  const lastPatternTime = lastPeakTimes.length > 0 ? 
    lastPeakTimes[lastPeakTimes.length - 1] : 0;
  
  // Plazo más largo para mantener detección
  const timeoutLimit = 10000 + sensitivity * 5000; // 10-15s según sensibilidad (muy aumentado)
  
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
  continuityPenalty = 0;
  lastSignalTimestamp = 0;
  lastAmplitudes = [];
  console.log("Detector de dedo reseteado completamente");
}
