
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { BaseProcessor } from './processors/base-processor';
import { SignalQuality } from './processors/signal-quality';

/**
 * Procesador para calcular el nivel de hidratación basado en características de la señal PPG
 * Utiliza solo medición directa, sin simulación
 */
export class HydrationProcessor extends BaseProcessor {
  private quality: SignalQuality;
  private confidenceLevel: number = 0;
  private readonly MIN_DATA_POINTS = 60;
  
  constructor() {
    super();
    this.quality = new SignalQuality();
  }
  
  /**
   * Calcula el nivel de hidratación basado en las características de la señal PPG
   * La hidratación afecta la conductividad de la piel y las características de reflectancia óptica
   * que pueden detectarse en variaciones específicas de la señal PPG
   * 
   * @param ppgValues Valores de señal PPG para analizar
   * @returns Nivel de hidratación estimado (0-100%)
   */
  public calculateHydration(ppgValues: number[]): number {
    // Verificar que tenemos suficientes datos
    if (ppgValues.length < this.MIN_DATA_POINTS) {
      this.confidenceLevel = 0;
      return 0;
    }
    
    // Calcular la calidad de la señal
    const signalQuality = this.quality.calculateSignalQuality(ppgValues);
    
    // Si la calidad es demasiado baja, no calcular
    if (signalQuality < 40) {
      this.confidenceLevel = 0;
      return 0;
    }
    
    // Analizar características de la señal relacionadas con la hidratación
    
    // 1. Variabilidad de amplitud - relacionada con la conductividad de la piel
    const amplitudes = this.calculatePeakAmplitudes(ppgValues);
    
    // 2. Características de la pendiente de la señal - afectada por la hidratación
    const slopeFeatures = this.calculateSlopeFeatures(ppgValues);
    
    // 3. Área bajo la curva diastólica - correlacionada con la hidratación
    const diastolicArea = this.calculateDiastolicArea(ppgValues);
    
    // Combinar características para estimar hidratación
    let hydrationScore = this.combineFeatures(amplitudes, slopeFeatures, diastolicArea);
    
    // Ajustar basado en la calidad de la señal
    hydrationScore = hydrationScore * (signalQuality / 100);
    
    // Calcular nivel de confianza basado en la calidad y estabilidad
    this.confidenceLevel = Math.min(100, signalQuality * 0.8);
    
    // Limitamos el resultado al rango 0-100%
    return Math.min(100, Math.max(0, hydrationScore));
  }
  
  /**
   * Calcula las amplitudes de los picos en la señal PPG
   */
  private calculatePeakAmplitudes(ppgValues: number[]): number {
    // Encontrar picos y valles
    const peaks = [];
    const valleys = [];
    
    for (let i = 1; i < ppgValues.length - 1; i++) {
      if (ppgValues[i] > ppgValues[i-1] && ppgValues[i] > ppgValues[i+1]) {
        peaks.push(ppgValues[i]);
      } else if (ppgValues[i] < ppgValues[i-1] && ppgValues[i] < ppgValues[i+1]) {
        valleys.push(ppgValues[i]);
      }
    }
    
    // Calcular amplitud promedio
    if (peaks.length === 0 || valleys.length === 0) {
      return 0;
    }
    
    const avgPeak = peaks.reduce((sum, val) => sum + val, 0) / peaks.length;
    const avgValley = valleys.reduce((sum, val) => sum + val, 0) / valleys.length;
    
    return avgPeak - avgValley;
  }
  
  /**
   * Calcula características de la pendiente de la señal PPG
   */
  private calculateSlopeFeatures(ppgValues: number[]): number {
    const slopes = [];
    
    for (let i = 1; i < ppgValues.length; i++) {
      slopes.push(ppgValues[i] - ppgValues[i-1]);
    }
    
    // Calcular estadísticas de pendiente
    const avgSlope = slopes.reduce((sum, val) => sum + val, 0) / slopes.length;
    const maxSlope = Math.max(...slopes);
    
    // La relación entre pendiente promedio y máxima es relevante para la hidratación
    return maxSlope > 0 ? (avgSlope / maxSlope) * 100 : 0;
  }
  
  /**
   * Calcula el área bajo la curva diastólica
   */
  private calculateDiastolicArea(ppgValues: number[]): number {
    // Simplificación: usar el área bajo los valores más bajos como aproximación
    const sortedValues = [...ppgValues].sort((a, b) => a - b);
    const lowerQuartile = sortedValues.slice(0, Math.floor(sortedValues.length * 0.25));
    
    return lowerQuartile.reduce((sum, val) => sum + val, 0) / lowerQuartile.length;
  }
  
  /**
   * Combina las diferentes características para obtener una estimación de hidratación
   */
  private combineFeatures(amplitude: number, slopeFeature: number, diastolicArea: number): number {
    // Pesos para cada característica
    const w1 = 0.4; // Amplitud
    const w2 = 0.3; // Pendiente
    const w3 = 0.3; // Área diastólica
    
    // Normalizar valores (asumiendo rangos típicos)
    const normalizedAmplitude = Math.min(100, amplitude * 10);
    const normalizedSlope = slopeFeature; // Ya está en escala 0-100
    const normalizedArea = Math.min(100, diastolicArea * 5);
    
    // Combinar características ponderadas
    return (w1 * normalizedAmplitude + w2 * normalizedSlope + w3 * normalizedArea);
  }
  
  /**
   * Obtiene el nivel de confianza de la última medición
   */
  public getConfidence(): number {
    return this.confidenceLevel;
  }
  
  /**
   * Reinicia el procesador
   */
  public reset(): void {
    super.reset();
    this.confidenceLevel = 0;
  }
}
