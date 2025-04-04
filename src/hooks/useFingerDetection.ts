
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para sistema unificado de detección de dedos
 * 
 * IMPORTANTE: Este hook debe usarse en todos los componentes React que necesiten
 * acceder al estado de detección de dedos. Proporciona una interfaz sencilla
 * para interactuar con el sistema unificado.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { 
  DetectionState,
  DetectionSource
} from '@/modules/signal-processing/finger-detection/finger-detection-types';
import {
  unifiedFingerDetector,
  getFingerDetectionState,
  updateDetectionSource,
  resetFingerDetector,
  adaptDetectionThresholds
} from '@/modules/signal-processing/finger-detection/unified-finger-detector';
import { getDiagnosticStats } from '@/modules/signal-processing/finger-detection/finger-diagnostics';
import { updateEnvironmentalState } from '@/modules/signal-processing/finger-detection/adaptive-calibration';

/**
 * Resultado del hook de detección de dedos
 */
export interface FingerDetectionResult {
  // Estado de detección
  isFingerDetected: boolean;
  confidence: number;
  
  // Métricas y estadísticas
  qualityScore: number;
  sourcesActive: number;
  totalSources: number;
  lastDetectionTime: number;
  diagnostics: Record<string, any>;
  
  // Acciones
  updateSource: (source: DetectionSource, detected: boolean, confidence?: number) => void;
  updateQualityAndBrightness: (quality: number, brightness?: number) => void;
  updateEnvironment: (data: Partial<{ brightness: number, movement: number }>) => void;
  reset: () => void;
  
  // Estado completo
  detectionState: DetectionState;
}

/**
 * Hook para usar el sistema unificado de detección de dedos
 */
export function useFingerDetection(): FingerDetectionResult {
  // Estado local que refleja el estado del detector unificado
  const [detectionState, setDetectionState] = useState<DetectionState>(getFingerDetectionState());
  const lastUpdateTime = useRef<number>(Date.now());
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Actualiza el estado local con el estado actual del detector
   */
  const updateLocalState = useCallback(() => {
    setDetectionState(getFingerDetectionState());
    lastUpdateTime.current = Date.now();
  }, []);
  
  /**
   * Actualiza una fuente de detección
   */
  const updateSource = useCallback((
    source: DetectionSource, 
    detected: boolean, 
    confidence: number = 1.0
  ): void => {
    updateDetectionSource(source, detected, confidence);
    updateLocalState();
  }, [updateLocalState]);
  
  /**
   * Actualiza calidad y brillo para adaptación de umbrales
   */
  const updateQualityAndBrightness = useCallback((
    quality: number,
    brightness?: number
  ): void => {
    adaptDetectionThresholds(quality, brightness);
    updateLocalState();
  }, [updateLocalState]);
  
  /**
   * Actualiza factores ambientales
   */
  const updateEnvironment = useCallback((
    data: Partial<{ brightness: number, movement: number }>
  ): void => {
    // Actualizar brillo si se proporciona
    if (data.brightness !== undefined) {
      updateEnvironmentalState({
        lighting: data.brightness
      });
      
      // Actualizar fuente de detección basada en brillo
      const normalizedBrightness = Math.min(1, Math.max(0, data.brightness / 255));
      updateDetectionSource(
        'brightness',
        normalizedBrightness > 0.2, // Detectar dedo si brillo razonable
        normalizedBrightness // Confianza normalizada
      );
    }
    
    // Actualizar movimiento si se proporciona
    if (data.movement !== undefined) {
      updateEnvironmentalState({
        motion: data.movement
      });
    }
    
    updateLocalState();
  }, [updateLocalState]);
  
  /**
   * Reinicia el sistema de detección
   */
  const reset = useCallback((): void => {
    resetFingerDetector();
    updateLocalState();
    
    logError(
      "FingerDetection: Sistema de detección reiniciado desde hook",
      ErrorLevel.INFO,
      "FingerDetection"
    );
  }, [updateLocalState]);
  
  // Calcular métricas adicionales
  const qualityScore = useCallback((): number => {
    // Obtener fuentes activas
    const { sources } = detectionState;
    let activeCount = 0;
    let totalConfidence = 0;
    
    Object.entries(sources).forEach(([_, data]) => {
      if (data.detected) {
        activeCount++;
        totalConfidence += data.confidence;
      }
    });
    
    // Calcular puntuación de calidad basada en consenso y confianza
    const sourceCount = Object.keys(sources).length;
    const consensusScore = sourceCount > 0 ? (activeCount / sourceCount) * 100 : 0;
    const confidenceScore = activeCount > 0 ? (totalConfidence / activeCount) * 100 : 0;
    
    // Combinar métricas para puntuación final
    return Math.round((consensusScore * 0.6) + (confidenceScore * 0.4));
  }, [detectionState]);
  
  // Contar fuentes activas
  const countActiveSources = useCallback((): number => {
    const { sources } = detectionState;
    return Object.values(sources).filter(data => data.detected).length;
  }, [detectionState]);
  
  // Configurar actualización periódica del estado
  useEffect(() => {
    // Actualizar estado inmediatamente
    updateLocalState();
    
    // Configurar intervalo de actualización (cada 100ms)
    updateInterval.current = setInterval(() => {
      updateLocalState();
    }, 100);
    
    // Limpiar intervalo al desmontar
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [updateLocalState]);
  
  // Construir resultado
  return {
    isFingerDetected: detectionState.isFingerDetected,
    confidence: detectionState.confidence,
    qualityScore: qualityScore(),
    sourcesActive: countActiveSources(),
    totalSources: Object.keys(detectionState.sources).length,
    lastDetectionTime: lastUpdateTime.current,
    diagnostics: getDiagnosticStats(),
    updateSource,
    updateQualityAndBrightness,
    updateEnvironment,
    reset,
    detectionState
  };
}
