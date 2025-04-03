
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

/**
 * Calcula el componente AC (amplitud pico a pico) de una señal real
 */
export function calculateAC(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Calcula el componente DC (valor promedio) de una señal real
 */
export function calculateDC(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calcula la desviación estándar de un conjunto de valores reales
 */
export function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sqDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(avgSqDiff);
}

/**
 * Calcula la Media Móvil Exponencial (EMA) para suavizar señales reales
 * No se utiliza ninguna simulación
 */
export function calculateEMA(prevEMA: number, currentValue: number, alpha: number): number {
  return alpha * currentValue + (1 - alpha) * prevEMA;
}

/**
 * Normaliza un valor real dentro de un rango específico
 * No se utiliza simulación
 */
export function normalizeValue(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/**
 * Aplica un filtro de Butterworth de paso bajo a una señal real
 * Implementación optimizada para datos PPG
 */
export function applyLowPassFilter(values: number[], cutoffFrequency: number = 5, samplingRate: number = 30): number[] {
  if (values.length < 3) return [...values];
  
  // Coeficientes para filtro Butterworth de segundo orden
  const omega = 2 * Math.PI * cutoffFrequency / samplingRate;
  const alpha = Math.sin(omega) / (2 * 0.7071); // 0.7071 = 1/sqrt(2)
  
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(omega);
  const a2 = 1 - alpha;
  const b0 = (1 - Math.cos(omega)) / 2;
  const b1 = 1 - Math.cos(omega);
  const b2 = (1 - Math.cos(omega)) / 2;
  
  const filtered = new Array(values.length).fill(0);
  filtered[0] = values[0];
  filtered[1] = values[1];
  
  for (let i = 2; i < values.length; i++) {
    filtered[i] = (b0 * values[i] + b1 * values[i-1] + b2 * values[i-2] - a1 * filtered[i-1] - a2 * filtered[i-2]) / a0;
  }
  
  return filtered;
}

/**
 * Aplica filtro mediana para eliminar valores atípicos extremos
 * Ideal para señales PPG con artefactos ocasionales
 */
export function applyMedianFilter(values: number[], windowSize: number = 5): number[] {
  if (values.length < windowSize) return [...values];
  
  const halfWindow = Math.floor(windowSize / 2);
  const filtered = new Array(values.length).fill(0);
  
  for (let i = 0; i < values.length; i++) {
    const window = [];
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(values.length - 1, i + halfWindow); j++) {
      window.push(values[j]);
    }
    window.sort((a, b) => a - b);
    filtered[i] = window[Math.floor(window.length / 2)];
  }
  
  return filtered;
}

/**
 * Calcula el índice de perfusión para señales PPG
 * PI = (AC/DC) * 100 - valor crítico para evaluar calidad de la señal
 */
export function calculatePerfusionIndex(values: number[]): number {
  if (values.length < 5) return 0;
  
  const ac = calculateAC(values);
  const dc = calculateDC(values);
  
  if (dc === 0) return 0;
  return (ac / dc) * 100;
}

/**
 * Detección avanzada de picos fisiológicamente válidos
 * Usado para señales PPG para detectar latidos cardíacos reales
 */
export function detectPeaks(values: number[], sensitivity: number = 0.6): number[] {
  if (values.length < 5) return [];
  
  const peaks: number[] = [];
  const thresholdMultiplier = 1.0 - sensitivity; // 0.4 para sensitivity=0.6
  
  // Calcular umbral adaptativo
  const mean = calculateDC(values);
  const std = calculateStandardDeviation(values);
  const threshold = mean + (thresholdMultiplier * std);
  
  // Detectar picos que superan el umbral y son máximos locales
  for (let i = 2; i < values.length - 2; i++) {
    if (values[i] > threshold && 
        values[i] > values[i-1] && 
        values[i] > values[i-2] && 
        values[i] > values[i+1] && 
        values[i] > values[i+2]) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Evalúa la calidad de una señal PPG en escala 0-100
 * Basado en múltiples factores de calidad de señal real
 */
export function evaluateSignalQuality(values: number[]): number {
  if (values.length < 10) return 0;
  
  // Calcular métricas de calidad
  const perfusionIndex = calculatePerfusionIndex(values);
  const std = calculateStandardDeviation(values);
  const mean = calculateDC(values);
  const cv = mean !== 0 ? std / mean : 0; // Coeficiente de variación
  
  // Estimar relación señal/ruido
  const filtered = applyLowPassFilter(values);
  const signalPower = filtered.reduce((sum, val) => sum + val * val, 0) / filtered.length;
  const noise = values.map((val, i) => val - (filtered[i] || 0));
  const noisePower = noise.reduce((sum, val) => sum + val * val, 0) / noise.length;
  const snr = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
  
  // Evaluar estabilidad de intervalos entre picos
  const peaks = detectPeaks(values);
  let intervalStability = 0;
  if (peaks.length >= 3) {
    const intervals = peaks.slice(1).map((peak, i) => peak - peaks[i]);
    const intervalMean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const intervalVariation = intervals.reduce((sum, val) => sum + Math.abs(val - intervalMean), 0) / intervals.length;
    intervalStability = intervalMean > 0 ? 1 - Math.min(1, intervalVariation / intervalMean) : 0;
  }
  
  // Ponderación de factores de calidad
  const perfusionScore = Math.min(100, perfusionIndex * 10); // 0-100
  const variationScore = Math.max(0, 100 - (cv * 200)); // 0-100, menor variación = mejor
  const snrScore = Math.min(100, Math.max(0, snr * 5)); // 0-100
  const stabilityScore = intervalStability * 100; // 0-100
  
  // Calidad ponderada final
  const quality = 
    (perfusionScore * 0.4) + 
    (variationScore * 0.2) + 
    (snrScore * 0.2) + 
    (stabilityScore * 0.2);
  
  return Math.round(Math.max(0, Math.min(100, quality)));
}
