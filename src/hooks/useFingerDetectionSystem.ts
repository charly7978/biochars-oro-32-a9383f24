/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { logError, ErrorLevel } from '@/utils/debugUtils';

// Finger detection sources
type DetectionSource = 'ppg-amplitude' | 'quality-metric' | 'rhythm-detection' | 'movement';

// Finger detection state
export interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  consensusLevel: number;
}

// Diagnostic event for tracking
interface DiagnosticEvent {
  timestamp: number;
  source: DetectionSource;
  value: number;
  threshold: number;
  isDetected: boolean;
}

// Simple buffer for tracking detection history
interface DetectionBuffer {
  timestamp: number;
  isDetected: boolean;
  confidence: number;
}

// Detailed statistics for debugging
interface DetailedStats {
  sources: Record<string, any>;
  config: {
    detectionThreshold: number;
    sourceWeights: Record<DetectionSource, number>;
    stableDetectionTimeMs: number;
    detectionPersistenceMs: number;
    adaptiveFactors: {
      qualityInfluence: number;
      movementSensitivity: number;
    };
  };
  state: {
    lastUpdate: number;
    detectionState: DetectionState;
    detectionBuffer: DetectionBuffer[];
  };
  diagnostics: DiagnosticEvent[];
  history: DetectionBuffer[];
  detectionResult: { isDetected: boolean; confidence: number };
  confidence: number;
}

/**
 * Hook for unified finger detection with multiple sources
 */
export function useFingerDetectionSystem() {
  // Current detection state
  const [detectionState, setDetectionState] = useState<DetectionState>({
    isFingerDetected: false,
    confidence: 0,
    consensusLevel: 0
  });
  
  // Detection history for stabilization
  const detectionBuffer = useRef<DetectionBuffer[]>([]);
  
  // Source weights and thresholds
  const sourceWeights = useRef<Record<DetectionSource, number>>({
    'ppg-amplitude': 0.4,
    'quality-metric': 0.3,
    'rhythm-detection': 0.2,
    'movement': 0.1
  });
  
  // Sources state
  const sources = useRef<Record<DetectionSource, { value: number; threshold: number; isDetected: boolean }>>({
    'ppg-amplitude': { value: 0, threshold: 0.03, isDetected: false },
    'quality-metric': { value: 0, threshold: 0.25, isDetected: false },
    'rhythm-detection': { value: 0, threshold: 0.4, isDetected: false },
    'movement': { value: 0, threshold: 0.15, isDetected: false }
  });
  
  // Constants
  const DETECTION_THRESHOLD = 0.5;
  const STABLE_DETECTION_TIME_MS = 1000;
  const DETECTION_PERSISTENCE_MS = 500;
  
  // Diagnostics
  const diagnostics = useRef<DiagnosticEvent[]>([]);
  
  /**
   * Update a detection source
   */
  const updateSource = useCallback((
    source: DetectionSource,
    value: number,
    threshold?: number
  ) => {
    // Update source value
    sources.current[source].value = value;
    
    // Update threshold if provided
    if (threshold !== undefined) {
      sources.current[source].threshold = threshold;
    }
    
    // Update detection state for this source
    sources.current[source].isDetected = value >= sources.current[source].threshold;
    
    // Record diagnostic event
    diagnostics.current.push({
      timestamp: Date.now(),
      source,
      value,
      threshold: sources.current[source].threshold,
      isDetected: sources.current[source].isDetected
    });
    
    // Keep diagnostic log limited
    if (diagnostics.current.length > 100) {
      diagnostics.current = diagnostics.current.slice(-100);
    }
    
    // Recalculate overall detection
    recalculateDetection();
  }, []);
  
  /**
   * Recalculate overall detection based on all sources
   */
  const recalculateDetection = useCallback(() => {
    const now = Date.now();
    
    // Calculate weighted confidence
    let weightedConfidence = 0;
    let totalWeight = 0;
    
    for (const source of Object.keys(sources.current) as DetectionSource[]) {
      const sourceData = sources.current[source];
      const weight = sourceWeights.current[source];
      
      // Calculate normalized confidence (0-1)
      const confidence = Math.min(1, sourceData.value / sourceData.threshold);
      
      // Add to weighted sum
      weightedConfidence += confidence * weight;
      totalWeight += weight;
    }
    
    // Normalize confidence
    const normalizedConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
    
    // Determine if finger is detected based on confidence
    const isDetected = normalizedConfidence >= DETECTION_THRESHOLD;
    
    // Add to buffer for stabilization
    detectionBuffer.current.push({
      timestamp: now,
      isDetected,
      confidence: normalizedConfidence
    });
    
    // Keep buffer limited
    const bufferTimeLimit = now - Math.max(STABLE_DETECTION_TIME_MS, DETECTION_PERSISTENCE_MS) - 1000;
    detectionBuffer.current = detectionBuffer.current.filter(entry => entry.timestamp >= bufferTimeLimit);
    
    // Calculate consensus (stability of detection)
    const recentBuffer = detectionBuffer.current.filter(
      entry => entry.timestamp >= now - STABLE_DETECTION_TIME_MS
    );
    
    if (recentBuffer.length > 0) {
      // Calculate percentage of recent entries that indicate detection
      const detectedCount = recentBuffer.filter(entry => entry.isDetected).length;
      const consensusLevel = detectedCount / recentBuffer.length;
      
      // Only change detection state if:
      // 1. Strong consensus for detection OR
      // 2. Strong consensus against detection for longer than persistence time
      const previousDetection = detectionState.isFingerDetected;
      
      let newDetectionState: boolean;
      
      if (consensusLevel >= 0.7) {
        // Strong consensus for detection
        newDetectionState = true;
      } else if (consensusLevel <= 0.3) {
        // Strong consensus against detection
        const persistenceBuffer = detectionBuffer.current.filter(
          entry => entry.timestamp >= now - DETECTION_PERSISTENCE_MS
        );
        
        if (persistenceBuffer.length > 0) {
          const persistenceConsensus = persistenceBuffer.filter(entry => entry.isDetected).length / persistenceBuffer.length;
          
          // Only change to false if we have strong persistence consensus against detection
          newDetectionState = persistenceConsensus > 0.2;
        } else {
          newDetectionState = previousDetection;
        }
      } else {
        // No strong consensus, maintain previous state
        newDetectionState = previousDetection;
      }
      
      // Update state
      setDetectionState({
        isFingerDetected: newDetectionState,
        confidence: normalizedConfidence,
        consensusLevel
      });
    }
  }, [detectionState.isFingerDetected]);
  
  /**
   * Reset the detection system
   */
  const reset = useCallback(() => {
    // Clear buffers
    detectionBuffer.current = [];
    diagnostics.current = [];
    
    // Reset source values
    for (const source of Object.keys(sources.current) as DetectionSource[]) {
      sources.current[source].value = 0;
      sources.current[source].isDetected = false;
    }
    
    // Reset detection state
    setDetectionState({
      isFingerDetected: false,
      confidence: 0,
      consensusLevel: 0
    });
    
    logError(
      "Finger detection system reset",
      ErrorLevel.INFO,
      "FingerDetectionSystem"
    );
  }, []);
  
  /**
   * Get detailed statistics for debugging
   */
  const getDetailedStats = useCallback((): DetailedStats => {
    return {
      sources: { ...sources.current },
      config: {
        detectionThreshold: DETECTION_THRESHOLD,
        sourceWeights: { ...sourceWeights.current },
        stableDetectionTimeMs: STABLE_DETECTION_TIME_MS,
        detectionPersistenceMs: DETECTION_PERSISTENCE_MS,
        adaptiveFactors: {
          qualityInfluence: 0.3,
          movementSensitivity: 0.2
        }
      },
      state: {
        lastUpdate: Date.now(),
        detectionState,
        detectionBuffer: [...detectionBuffer.current]
      },
      diagnostics: [...diagnostics.current],
      history: [...detectionBuffer.current],
      detectionResult: { 
        isDetected: detectionState.isFingerDetected, 
        confidence: detectionState.confidence 
      },
      confidence: detectionState.confidence
    };
  }, [detectionState]);
  
  /**
   * Adjust source weights to adapt to different conditions
   */
  const adaptWeights = useCallback((qualityFactor: number, movementFactor: number) => {
    // Adjust weights based on factors
    sourceWeights.current = {
      'ppg-amplitude': 0.4 - (movementFactor * 0.1),
      'quality-metric': 0.3 + (qualityFactor * 0.1),
      'rhythm-detection': 0.2 + (movementFactor * 0.1),
      'movement': 0.1 - (qualityFactor * 0.1) + (movementFactor * 0.1)
    };
    
    // Normalize weights
    const totalWeight = Object.values(sourceWeights.current).reduce((sum, weight) => sum + weight, 0);
    
    for (const source of Object.keys(sourceWeights.current) as DetectionSource[]) {
      sourceWeights.current[source] /= totalWeight;
    }
    
    // Recalculate with new weights
    recalculateDetection();
  }, [recalculateDetection]);
  
  return {
    detectionState,
    updateSource,
    reset,
    getDetailedStats,
    adaptWeights
  };
}
