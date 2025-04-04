
import { useState, useEffect, useCallback } from 'react';
import { unifiedFingerDetector, DetectionSource } from '@/modules/signal-processing/utils/unified-finger-detector';
import { logError, ErrorLevel } from '@/utils/debugUtils';

export function useFingerDetectionSystem(options: {
  enabled?: boolean;
  debounceMs?: number;
  requireConsensus?: boolean;
  minimumConfidence?: number;
} = {}) {
  const {
    enabled = true,
    debounceMs = 300,
    requireConsensus = true,
    minimumConfidence = 0.6
  } = options;
  
  const [isFingerDetected, setIsFingerDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [detectionSource, setDetectionSource] = useState('none');
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [detectionStats, setDetectionStats] = useState<any>({});

  // Función para actualizar una fuente de detección
  const updateDetection = useCallback((
    source: DetectionSource,
    detected: boolean,
    confidence: number = 0.5
  ) => {
    if (!enabled) return;
    
    try {
      unifiedFingerDetector.updateSource(source, detected, confidence);
      
      // Obtener estado actualizado
      const state = unifiedFingerDetector.getState();
      
      setIsFingerDetected(state.isFingerDetected);
      setDetectionConfidence(state.confidence);
      setDetectionSource(state.detectionSource);
      setLastDetectionTime(state.lastUpdated);
      
      // Actualizar estadísticas detalladas
      setDetectionStats(unifiedFingerDetector.getDetailedStats());
    } catch (error) {
      logError(
        `Error al actualizar detección de dedo: ${error}`,
        ErrorLevel.ERROR,
        'useFingerDetectionSystem'
      );
    }
  }, [enabled]);

  // Actualización periódica del estado
  useEffect(() => {
    if (!enabled) return;
    
    const updateDetectionState = () => {
      try {
        const state = unifiedFingerDetector.getState();
        const stats = unifiedFingerDetector.getDetailedStats();
        const primarySource = stats.primarySource;
        
        setIsFingerDetected(state.isFingerDetected);
        setDetectionConfidence(state.confidence);
        setDetectionSource(state.detectionSource);
        setLastDetectionTime(state.lastUpdated);
        setDetectionStats(stats);
        
        if (state.isFingerDetected && primarySource) {
          logError(
            `Dedo detectado (${Math.round(state.confidence * 100)}% confianza) - Fuente principal: ${primarySource}`,
            ErrorLevel.DEBUG,
            'FingerDetection'
          );
        }
      } catch (error) {
        logError(
          `Error al obtener estado de detección: ${error}`,
          ErrorLevel.ERROR,
          'useFingerDetectionSystem'
        );
      }
    };
    
    // Actualizar inmediatamente
    updateDetectionState();
    
    // Configurar intervalo
    const interval = setInterval(updateDetectionState, debounceMs);
    
    return () => clearInterval(interval);
  }, [enabled, debounceMs]);

  // Función para actualizar manualmente el estado de ambiente
  const updateEnvironmentInfo = useCallback((
    info: { 
      lightLevel?: number; 
      isMoving?: boolean;
      proximityValue?: number;
    }
  ) => {
    if (!enabled) return;
    
    try {
      // Determinar si hay un dedo basado en el ambiente
      const isFingerLikely = 
        (info.lightLevel !== undefined && info.lightLevel < 10) || // Oscuridad sugiere dedo
        (info.proximityValue !== undefined && info.proximityValue < 2); // Proximidad sugiere dedo
      
      // Calcular confianza basada en múltiples factores
      let confidence = 0.5; // Base neutral
      
      if (info.lightLevel !== undefined) {
        // Más oscuro = mayor confianza
        confidence += Math.max(0, Math.min(0.3, (20 - info.lightLevel) / 60));
      }
      
      if (info.proximityValue !== undefined) {
        // Más cercano = mayor confianza
        confidence += Math.max(0, Math.min(0.3, (5 - info.proximityValue) / 10));
      }
      
      if (info.isMoving) {
        // El movimiento reduce la confianza
        confidence -= 0.2;
      }
      
      // Asegurar rango válido
      confidence = Math.max(0.1, Math.min(0.9, confidence));
      
      // Actualizar fuente de detección
      unifiedFingerDetector.updateSource('environment' as DetectionSource, isFingerLikely, confidence);
    } catch (error) {
      logError(
        `Error al actualizar información de ambiente: ${error}`,
        ErrorLevel.ERROR,
        'useFingerDetectionSystem'
      );
    }
  }, [enabled]);

  // Función para obtener estadísticas detalladas
  const getDetailedStats = useCallback(() => {
    try {
      return unifiedFingerDetector.getDetailedStats();
    } catch (error) {
      logError(
        `Error al obtener estadísticas detalladas: ${error}`,
        ErrorLevel.ERROR,
        'useFingerDetectionSystem'
      );
      return null;
    }
  }, []);

  return {
    isFingerDetected,
    confidence: detectionConfidence,
    source: detectionSource,
    lastUpdate: lastDetectionTime,
    updateDetection,
    updateEnvironmentInfo,
    getDetailedStats,
    stats: detectionStats
  };
}
