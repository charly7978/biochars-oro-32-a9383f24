
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 *
 * Funciones para verificar la calidad de señal y detección de presencia de dedo
 */

/**
 * Verifica la calidad de la señal y detecta si es demasiado débil
 */
export function checkSignalQuality(
  value: number,
  consecutiveWeakSignalsCount: number,
  config: {
    lowSignalThreshold: number;
    maxWeakSignalCount: number;
  }
): {
  isWeakSignal: boolean;
  updatedWeakSignalsCount: number;
} {
  // Valor absoluto para comprobar amplitud
  const signalStrength = Math.abs(value);
  
  if (signalStrength < config.lowSignalThreshold) {
    // Si la señal es débil, incrementamos el contador
    const updatedCount = consecutiveWeakSignalsCount + 1;
    
    // Si tenemos muchas señales débiles consecutivas, consideramos que no hay dedo
    return {
      isWeakSignal: updatedCount >= config.maxWeakSignalCount,
      updatedWeakSignalsCount: updatedCount
    };
  } else {
    // Si la señal tiene fuerza suficiente, reseteamos el contador
    return {
      isWeakSignal: false,
      updatedWeakSignalsCount: 0
    };
  }
}

/**
 * Detecta patrones rítmicos en la señal que indican presencia de dedo
 */
export function isFingerDetectedByPattern(
  signalHistory: Array<{time: number, value: number}>,
  currentPatternCount: number
): {
  isFingerDetected: boolean;
  patternCount: number;
} {
  // Necesitamos suficientes puntos para analizar
  if (signalHistory.length < 30) {
    return {
      isFingerDetected: false,
      patternCount: currentPatternCount
    };
  }
  
  try {
    // Analizar las últimas muestras para buscar patrones periódicos
    const samples = signalHistory.slice(-60);
    
    // Detectar cruces por cero
    const zeroCrossings: number[] = [];
    let prevValue = samples[0].value;
    
    for (let i = 1; i < samples.length; i++) {
      const currValue = samples[i].value;
      if ((prevValue <= 0 && currValue > 0) || (prevValue >= 0 && currValue < 0)) {
        zeroCrossings.push(samples[i].time);
      }
      prevValue = currValue;
    }
    
    // Necesitamos suficientes cruces para analizar
    if (zeroCrossings.length < 4) {
      return {
        isFingerDetected: false,
        patternCount: Math.max(0, currentPatternCount - 1)
      };
    }
    
    // Calcular intervalos entre cruces
    const intervals: number[] = [];
    for (let i = 1; i < zeroCrossings.length; i++) {
      intervals.push(zeroCrossings[i] - zeroCrossings[i-1]);
    }
    
    // Verificar que los intervalos tienen una desviación estándar razonable
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Coeficiente de variación (debe ser bajo para patrones regulares)
    const variationCoeff = stdDev / avgInterval;
    
    // Verificar si el intervalo promedio está en un rango fisiológico razonable
    // 300ms-1500ms corresponde aproximadamente a 40-200 BPM
    const isPhysiologicalRange = avgInterval >= 300 && avgInterval <= 1500;
    
    // Verificar si el patrón es lo suficientemente regular
    const isRegularPattern = variationCoeff < 0.5;
    
    if (isPhysiologicalRange && isRegularPattern) {
      // Incrementar contador de detección de patrones
      return {
        isFingerDetected: (currentPatternCount + 1) >= 3,
        patternCount: currentPatternCount + 1
      };
    } else {
      // Decrementar contador gradualmente si no detectamos patrón
      return {
        isFingerDetected: false,
        patternCount: Math.max(0, currentPatternCount - 1)
      };
    }
  } catch (error) {
    // Si hay error en el análisis, mantener contador anterior
    return {
      isFingerDetected: currentPatternCount >= 3,
      patternCount: currentPatternCount
    };
  }
}
