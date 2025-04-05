
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Sistema unificado de detección de dedos mejorado
 * Hook para usar el sistema de detección de dedos en componentes React
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { DetectionSource } from '@/modules/signal-processing/utils/unified-finger-detector';
import { ErrorLevel, logError } from '@/utils/debugUtils';

/**
 * Estado de detección de dedos
 */
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  consensusLevel: number;
  qualityScore: number;
  sources: Record<string, { value: number, weight: number, age: number }>;
  calibrationParams: {
    sensitivityLevel: number;
    qualityFactor: number;
    environmentFactor: number;
    adaptationRate: number;
  };
  diagnostics: {
    falsePositives: number;
    falseNegatives: number;
    detectionEvents: number;
    lossEvents: number;
    lastCalibrationTime: number;
    averageDetectionConfidence: number;
  };
}

/**
 * Hook para usar el sistema de detección de dedos unificado
 */
export function useFingerDetectionSystem() {
  // Estado de detección
  const [detectionState, setDetectionState] = useState<DetectionState>({
    isFingerDetected: false,
    confidence: 0,
    consensusLevel: 0,
    qualityScore: 0,
    sources: {},
    calibrationParams: {
      sensitivityLevel: 0.5,
      qualityFactor: 1.0,
      environmentFactor: 1.0,
      adaptationRate: 0.2
    },
    diagnostics: {
      falsePositives: 0,
      falseNegatives: 0,
      detectionEvents: 0,
      lossEvents: 0,
      lastCalibrationTime: Date.now(),
      averageDetectionConfidence: 0
    }
  });
  
  // Referencias para evitar ciclos de actualización
  const stateRef = useRef<DetectionState>(detectionState);
  stateRef.current = detectionState;
  
  /**
   * Actualiza una fuente de información en el sistema
   */
  const updateSource = useCallback((source: DetectionSource, value: number, threshold: number = 0.5) => {
    // Actualizar el estado con la nueva fuente
    setDetectionState(prevState => {
      // Copiar fuentes actuales
      const sources = { ...prevState.sources };
      
      // Actualizar o añadir fuente
      sources[source] = {
        value,
        weight: prevState.sources[source]?.weight || 1.0,
        age: 0
      };
      
      // Calcular nivel de consenso
      let totalWeight = 0;
      let weightedSum = 0;
      
      Object.entries(sources).forEach(([_, data]) => {
        const sourceWeight = data.weight * Math.max(0, 1 - data.age / 10);
        weightedSum += data.value * sourceWeight;
        totalWeight += sourceWeight;
      });
      
      const consensusLevel = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Determinar si el dedo está detectado basado en umbral
      const sensitivityAdjustedThreshold = threshold * (2 - prevState.calibrationParams.sensitivityLevel);
      const isFingerDetected = consensusLevel >= sensitivityAdjustedThreshold;
      
      // Calcular confianza
      const confidence = Math.min(1, consensusLevel * 1.2);
      
      // Actualizar diagnósticos
      const diagnostics = { ...prevState.diagnostics };
      
      if (isFingerDetected && !prevState.isFingerDetected) {
        diagnostics.detectionEvents++;
      } else if (!isFingerDetected && prevState.isFingerDetected) {
        diagnostics.lossEvents++;
      }
      
      // Actualizar confianza promedio
      diagnostics.averageDetectionConfidence = 
        0.9 * diagnostics.averageDetectionConfidence + 0.1 * confidence;
      
      return {
        ...prevState,
        isFingerDetected,
        confidence,
        consensusLevel,
        sources,
        diagnostics
      };
    });
  }, []);
  
  /**
   * Restablece el sistema de detección
   */
  const reset = useCallback(() => {
    setDetectionState({
      isFingerDetected: false,
      confidence: 0,
      consensusLevel: 0,
      qualityScore: 0,
      sources: {},
      calibrationParams: {
        sensitivityLevel: 0.5,
        qualityFactor: 1.0,
        environmentFactor: 1.0,
        adaptationRate: 0.2
      },
      diagnostics: {
        falsePositives: 0,
        falseNegatives: 0,
        detectionEvents: 0,
        lossEvents: 0,
        lastCalibrationTime: Date.now(),
        averageDetectionConfidence: 0
      }
    });
  }, []);
  
  /**
   * Obtiene estadísticas detalladas
   */
  const getDetailedStats = useCallback(() => {
    return {
      detection: {
        isFingerDetected: stateRef.current.isFingerDetected,
        confidence: stateRef.current.confidence,
        consensusLevel: stateRef.current.consensusLevel,
        qualityScore: stateRef.current.qualityScore
      },
      sources: stateRef.current.sources,
      calibration: stateRef.current.calibrationParams,
      diagnostics: stateRef.current.diagnostics
    };
  }, []);
  
  /**
   * Adapta los pesos basados en factores de calidad y movimiento
   */
  const adaptWeights = useCallback((qualityFactor: number, movementFactor: number) => {
    setDetectionState(prevState => {
      // Ajustar nivel de sensibilidad basado en factores
      const newSensitivity = Math.max(0.3, Math.min(0.9, 
        prevState.calibrationParams.sensitivityLevel * (1 + (qualityFactor - 0.5) * 0.2)
      ));
      
      return {
        ...prevState,
        calibrationParams: {
          ...prevState.calibrationParams,
          sensitivityLevel: newSensitivity,
          qualityFactor: Math.max(0.5, Math.min(1.5, qualityFactor)),
          environmentFactor: Math.max(0.5, Math.min(1.5, 
            prevState.calibrationParams.environmentFactor * (1 + (movementFactor - 0.5) * 0.1)
          ))
        }
      };
    });
  }, []);
  
  /**
   * Actualiza los parámetros de calibración
   */
  const updateCalibration = useCallback((params: Partial<DetectionState['calibrationParams']>) => {
    setDetectionState(prevState => ({
      ...prevState,
      calibrationParams: {
        ...prevState.calibrationParams,
        ...params
      },
      diagnostics: {
        ...prevState.diagnostics,
        lastCalibrationTime: Date.now()
      }
    }));
  }, []);
  
  /**
   * Establece el modo de override manual
   */
  const setManualOverride = useCallback((override: boolean) => {
    if (override) {
      logError("Activando override manual de detección de dedo", ErrorLevel.INFO, "FingerDetectionSystem");
    } else {
      logError("Desactivando override manual de detección de dedo", ErrorLevel.INFO, "FingerDetectionSystem");
    }
    
    setDetectionState(prevState => ({
      ...prevState,
      isFingerDetected: override ? true : prevState.isFingerDetected,
      confidence: override ? 1.0 : prevState.confidence
    }));
  }, []);
  
  /**
   * Actualiza los factores ambientales
   */
  const updateEnvironment = useCallback((brightness: number, movement: number) => {
    const normalizedBrightness = Math.max(0, Math.min(1, brightness / 255));
    const normalizedMovement = Math.max(0, Math.min(1, movement));
    
    // Ajustar factores ambientales
    setDetectionState(prevState => ({
      ...prevState,
      calibrationParams: {
        ...prevState.calibrationParams,
        environmentFactor: 
          prevState.calibrationParams.environmentFactor * 0.8 + 
          (normalizedBrightness > 0.1 ? 1.0 : 0.7) * 0.2,
        sensitivityLevel: 
          prevState.calibrationParams.sensitivityLevel * 0.9 + 
          (normalizedMovement < 0.3 ? 0.6 : 0.4) * 0.1
      }
    }));
  }, []);
  
  /**
   * Resetea completamente el sistema
   */
  const resetSystem = useCallback(() => {
    logError("Reseteando sistema de detección de dedo", ErrorLevel.INFO, "FingerDetectionSystem");
    reset();
  }, [reset]);
  
  /**
   * Exporta datos de diagnóstico
   */
  const exportDiagnostics = useCallback(() => {
    return {
      timestamp: Date.now(),
      state: stateRef.current,
      performance: {
        detectionRate: stateRef.current.diagnostics.detectionEvents > 0 
          ? stateRef.current.diagnostics.lossEvents / stateRef.current.diagnostics.detectionEvents 
          : 0,
        averageConfidence: stateRef.current.diagnostics.averageDetectionConfidence
      }
    };
  }, []);
  
  // Actualizar la edad de las fuentes periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setDetectionState(prevState => {
        const updatedSources = { ...prevState.sources };
        
        // Incrementar edad de cada fuente
        Object.keys(updatedSources).forEach(key => {
          updatedSources[key] = {
            ...updatedSources[key],
            age: updatedSources[key].age + 1
          };
        });
        
        return {
          ...prevState,
          sources: updatedSources
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    detectionState,
    updateSource,
    reset,
    getDetailedStats,
    adaptWeights,
    updateCalibration,
    setManualOverride,
    updateEnvironment,
    resetSystem,
    exportDiagnostics,
    isFingerDetected: detectionState.isFingerDetected,
    confidence: detectionState.confidence,
    consensusLevel: detectionState.consensusLevel,
    calibrationParams: detectionState.calibrationParams,
    diagnostics: detectionState.diagnostics
  };
}
