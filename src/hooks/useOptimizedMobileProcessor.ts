
import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedMobileProcessor } from '../modules/vital-signs/OptimizedMobileProcessor';

// Tipos para la bidirección de datos
interface ProcessorConfiguration {
  enabledChannels: string[];
  sensitivityFactors: Record<string, number>;
  qualityThresholds: Record<string, number>;
  bidirectionalEnabled: boolean;
}

interface ProcessorFeedback {
  signalQuality: number;
  arrhythmiaDetected: boolean;
  processingLatency: number;
  lastUpdateTimestamp: number;
  channelFeedback: Record<string, {
    confidence: number;
    noise: number;
    valid: boolean;
  }>;
}

/**
 * Hook para usar el procesador optimizado para móviles con sistema bidireccional
 */
export function useOptimizedMobileProcessor() {
  const [results, setResults] = useState<any>(null);
  const processorRef = useRef<OptimizedMobileProcessor | null>(null);
  const configurationRef = useRef<ProcessorConfiguration>({
    enabledChannels: ['cardiac', 'blood_pressure', 'spo2', 'glucose', 'hydration'],
    sensitivityFactors: {
      cardiac: 1.0,
      blood_pressure: 1.0,
      spo2: 1.0,
      glucose: 1.0,
      hydration: 1.0
    },
    qualityThresholds: {
      cardiac: 0.6,
      blood_pressure: 0.7,
      spo2: 0.65,
      glucose: 0.75,
      hydration: 0.7
    },
    bidirectionalEnabled: true
  });
  const feedbackRef = useRef<ProcessorFeedback>({
    signalQuality: 0,
    arrhythmiaDetected: false,
    processingLatency: 0,
    lastUpdateTimestamp: 0,
    channelFeedback: {}
  });

  // Inicializar el procesador
  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = new OptimizedMobileProcessor();
      console.log('Procesador móvil optimizado inicializado');
    }
    
    return () => {
      if (processorRef.current) {
        processorRef.current.reset();
        processorRef.current = null;
      }
    };
  }, []);

  /**
   * Procesar un valor de señal PPG
   */
  const processValue = useCallback((value: number, quality: number, timestamp: number) => {
    if (!processorRef.current) return null;
    
    const startTime = performance.now();
    
    // Actualizar configuración en el procesador (bidireccionalidad)
    if (configurationRef.current.bidirectionalEnabled) {
      processorRef.current.updateConfiguration(configurationRef.current);
    }
    
    // Procesar el valor
    const result = processorRef.current.processValue(value, quality);
    
    // Calcular latencia
    const latency = performance.now() - startTime;
    
    // Obtener retroalimentación del procesador (bidireccionalidad)
    const feedback = processorRef.current.getFeedback();
    
    // Actualizar referencias bidireccionales
    feedbackRef.current = {
      signalQuality: feedback.signalQuality || quality,
      arrhythmiaDetected: feedback.arrhythmiaDetected || false,
      processingLatency: latency,
      lastUpdateTimestamp: timestamp,
      channelFeedback: feedback.channelFeedback || {}
    };
    
    // Ajustar configuración basada en retroalimentación (bidireccionalidad adaptativa)
    if (configurationRef.current.bidirectionalEnabled) {
      adjustConfigurationBasedOnFeedback(feedbackRef.current);
    }
    
    // Actualizar resultados
    setResults(result);
    
    return result;
  }, []);

  /**
   * Ajustar configuración basada en retroalimentación del procesador
   */
  const adjustConfigurationBasedOnFeedback = useCallback((feedback: ProcessorFeedback) => {
    // Copiar configuración actual
    const newConfig = {...configurationRef.current};
    
    // Ajustar sensibilidad basado en calidad de señal
    if (feedback.signalQuality < 0.3) {
      // Señal muy débil - aumentar sensibilidad
      Object.keys(newConfig.sensitivityFactors).forEach(channel => {
        newConfig.sensitivityFactors[channel] = Math.min(2.0, newConfig.sensitivityFactors[channel] * 1.05);
      });
    } else if (feedback.signalQuality > 0.8) {
      // Señal muy buena - normalizar sensibilidad
      Object.keys(newConfig.sensitivityFactors).forEach(channel => {
        newConfig.sensitivityFactors[channel] = 1.0 + (newConfig.sensitivityFactors[channel] - 1.0) * 0.95;
      });
    }
    
    // Ajustar umbrales de calidad basados en retroalimentación de canales
    Object.entries(feedback.channelFeedback).forEach(([channel, data]) => {
      if (data.confidence < 0.3 && newConfig.qualityThresholds[channel]) {
        // Reducir umbral para canales con baja confianza
        newConfig.qualityThresholds[channel] = Math.max(
          0.4, 
          newConfig.qualityThresholds[channel] * 0.95
        );
      }
    });
    
    // Actualizar configuración
    configurationRef.current = newConfig;
  }, []);

  /**
   * Obtener configuración actual del procesador
   */
  const getConfiguration = useCallback(() => {
    return {...configurationRef.current};
  }, []);

  /**
   * Actualizar configuración del procesador
   */
  const updateConfiguration = useCallback((config: Partial<ProcessorConfiguration>) => {
    configurationRef.current = {...configurationRef.current, ...config};
    
    // Sincronizar con el procesador inmediatamente
    if (processorRef.current && configurationRef.current.bidirectionalEnabled) {
      processorRef.current.updateConfiguration(configurationRef.current);
    }
  }, []);

  /**
   * Obtener retroalimentación actual del procesador
   */
  const getFeedback = useCallback(() => {
    return {...feedbackRef.current};
  }, []);

  /**
   * Reiniciar procesador
   */
  const reset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.reset();
    }
    setResults(null);
  }, []);

  /**
   * Reinicio completo
   */
  const fullReset = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.fullReset();
    }
    setResults(null);
    
    // Restaurar configuración predeterminada
    configurationRef.current = {
      enabledChannels: ['cardiac', 'blood_pressure', 'spo2', 'glucose', 'hydration'],
      sensitivityFactors: {
        cardiac: 1.0,
        blood_pressure: 1.0,
        spo2: 1.0,
        glucose: 1.0,
        hydration: 1.0
      },
      qualityThresholds: {
        cardiac: 0.6,
        blood_pressure: 0.7,
        spo2: 0.65,
        glucose: 0.75,
        hydration: 0.7
      },
      bidirectionalEnabled: true
    };
    
    feedbackRef.current = {
      signalQuality: 0,
      arrhythmiaDetected: false,
      processingLatency: 0,
      lastUpdateTimestamp: 0,
      channelFeedback: {}
    };
  }, []);

  /**
   * Obtener contador de arritmias
   */
  const getArrhythmiaCounter = useCallback(() => {
    if (!processorRef.current) return 0;
    return processorRef.current.getArrhythmiaCounter();
  }, []);

  return {
    results,
    processValue,
    reset,
    fullReset,
    getArrhythmiaCounter,
    // Bidireccionalidad
    getConfiguration,
    updateConfiguration,
    getFeedback
  };
}
