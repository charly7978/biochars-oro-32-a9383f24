
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook para manejo del sistema de detección de dedos avanzado
 * Proporciona integración con componentes React para el sistema unificado,
 * diagnósticos y calibración adaptativa
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';
import { 
  fingerDiagnostics, 
  startDiagnosticsSession,
  endDiagnosticsSession,
  DiagnosticSession
} from '@/modules/signal-processing/utils/finger-diagnostics';
import {
  adaptiveCalibration,
  getCalibrationParameters,
  setCalibrationParameters,
  CalibrationParameters,
  EnvironmentalState,
  updateEnvironmentalState
} from '@/modules/signal-processing/utils/adaptive-calibration';
import { resetFingerDetector } from '@/modules/signal-processing/utils/finger-detector';
import { useToast } from '@/hooks/use-toast';

// Interfaz para el estado de detección
interface DetectionState {
  isFingerDetected: boolean;
  confidence: number;
  consensusLevel: number;
}

// Interfaz para estadísticas detalladas
interface DetailedStats {
  sources: Record<string, any>;
  history: Array<any>;
  detectionResult: boolean;
  confidence: number;
}

/**
 * Hook personalizado para integrar el sistema de detección de dedos
 * con componentes React
 */
export function useFingerDetectionSystem(options: {
  enableDebugLogs?: boolean;
  enableDiagnostics?: boolean;
  enableAdaptiveCalibration?: boolean;
  diagnosticsSessionId?: string;
  onDetectionChange?: (isDetected: boolean) => void;
} = {}) {
  // Valores por defecto
  const {
    enableDebugLogs = true,
    enableDiagnostics = true,
    enableAdaptiveCalibration = true,
    diagnosticsSessionId = `session-${Date.now()}`,
    onDetectionChange
  } = options;
  
  // Estado para React
  const [detectionState, setDetectionState] = useState<DetectionState>({
    isFingerDetected: false,
    confidence: 0,
    consensusLevel: 0
  });
  
  const [diagnosticsState, setDiagnosticsState] = useState({
    isRecording: false,
    currentSessionId: '',
    totalEvents: 0
  });
  
  const [calibrationParams, setCalibrationParams] = useState<CalibrationParameters>(
    getCalibrationParameters()
  );
  
  const { toast } = useToast();
  const lastDetectionState = useRef<boolean>(false);
  const sessionRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<number | null>(null);
  
  // Inicializar componentes
  useEffect(() => {
    // Configurar modo debug
    unifiedFingerDetector.setDebug(enableDebugLogs);
    
    // Iniciar sesión de diagnóstico si está habilitado
    if (enableDiagnostics) {
      const sessionId = startDiagnosticsSession(diagnosticsSessionId);
      sessionRef.current = sessionId;
      
      setDiagnosticsState({
        isRecording: true,
        currentSessionId: sessionId,
        totalEvents: 0
      });
      
      // Notificar al usuario
      if (enableDebugLogs) {
        toast({
          title: "Diagnóstico de detección iniciado",
          description: `Sesión: ${sessionId}`,
          duration: 3000
        });
      }
    }
    
    // Iniciar calibración adaptativa si está habilitada
    if (enableAdaptiveCalibration) {
      adaptiveCalibration.start();
      
      // Actualizar parámetros iniciales
      setCalibrationParams(getCalibrationParameters());
    }
    
    // Configurar intervalo para actualizar estado
    updateIntervalRef.current = window.setInterval(() => {
      // Obtener estado actual
      const currentState = unifiedFingerDetector.getDetectionState();
      
      // Actualizar estado de React
      setDetectionState(currentState);
      
      // Verificar cambios en la detección
      if (currentState.isFingerDetected !== lastDetectionState.current) {
        lastDetectionState.current = currentState.isFingerDetected;
        
        // Notificar cambio si se proporcionó callback
        if (onDetectionChange) {
          onDetectionChange(currentState.isFingerDetected);
        }
        
        // Mostrar toast en modo debug
        if (enableDebugLogs) {
          toast({
            title: currentState.isFingerDetected ? "Dedo detectado" : "Dedo removido",
            description: `Confianza: ${Math.round(currentState.confidence * 100)}%`,
            duration: 2000
          });
        }
      }
      
      // Actualizar estado de diagnóstico
      if (enableDiagnostics) {
        const currentDiagState = fingerDiagnostics.getDiagnosticsState();
        setDiagnosticsState({
          isRecording: currentDiagState.isRecording,
          currentSessionId: currentDiagState.currentSessionId || '',
          totalEvents: currentDiagState.currentSessionEvents
        });
      }
      
      // Actualizar parámetros de calibración
      if (enableAdaptiveCalibration) {
        setCalibrationParams(getCalibrationParameters());
      }
      
    }, 500); // Actualizar cada medio segundo
    
    // Limpieza
    return () => {
      // Detener intervalo
      if (updateIntervalRef.current !== null) {
        clearInterval(updateIntervalRef.current);
      }
      
      // Finalizar sesión de diagnóstico
      if (enableDiagnostics && sessionRef.current) {
        endDiagnosticsSession();
      }
      
      // Detener calibración adaptativa
      if (enableAdaptiveCalibration) {
        adaptiveCalibration.stop();
      }
    };
  }, [
    enableDebugLogs, 
    enableDiagnostics, 
    enableAdaptiveCalibration, 
    diagnosticsSessionId,
    onDetectionChange,
    toast
  ]);
  
  /**
   * Obtiene estadísticas detalladas del detector
   */
  const getDetailedStats = useCallback((): DetailedStats => {
    return unifiedFingerDetector.getDetailedStats();
  }, []);
  
  /**
   * Actualiza el estado ambiental
   */
  const updateEnvironment = useCallback((state: Partial<EnvironmentalState>): void => {
    updateEnvironmentalState(state);
  }, []);
  
  /**
   * Fuerza una detección manual (para pruebas)
   */
  const setManualOverride = useCallback((isDetected: boolean, enabled: boolean = true): void => {
    unifiedFingerDetector.setManualOverride(isDetected, enabled);
    
    if (enableDebugLogs) {
      toast({
        title: `Anulación manual ${enabled ? 'activada' : 'desactivada'}`,
        description: enabled ? (isDetected ? "Forzando detección de dedo" : "Forzando sin detección") : "Modo normal",
        duration: 3000
      });
    }
  }, [enableDebugLogs, toast]);
  
  /**
   * Actualiza los parámetros de calibración
   */
  const updateCalibration = useCallback((params: Partial<CalibrationParameters>): void => {
    setCalibrationParameters(params);
    setCalibrationParams(getCalibrationParameters());
    
    if (enableDebugLogs) {
      toast({
        title: "Calibración actualizada",
        description: "Parámetros de detección modificados",
        duration: 2000
      });
    }
  }, [enableDebugLogs, toast]);
  
  /**
   * Obtiene la sesión de diagnóstico actual
   */
  const getDiagnosticSession = useCallback((): DiagnosticSession | null => {
    return fingerDiagnostics.getSession();
  }, []);
  
  /**
   * Exporta datos de diagnóstico para análisis
   */
  const exportDiagnostics = useCallback((): string => {
    return fingerDiagnostics.exportSessionData();
  }, []);
  
  /**
   * Reinicia todo el sistema de detección
   */
  const resetSystem = useCallback((): void => {
    // Reiniciar detector
    resetFingerDetector();
    
    // Si hay diagnóstico activo, finalizar y comenzar nueva sesión
    if (enableDiagnostics) {
      endDiagnosticsSession();
      const newSessionId = startDiagnosticsSession();
      sessionRef.current = newSessionId;
      
      setDiagnosticsState({
        isRecording: true,
        currentSessionId: newSessionId,
        totalEvents: 0
      });
    }
    
    // Reiniciar calibración
    if (enableAdaptiveCalibration) {
      adaptiveCalibration.reset();
      adaptiveCalibration.start();
      setCalibrationParams(getCalibrationParameters());
    }
    
    // Reiniciar estado de React
    setDetectionState({
      isFingerDetected: false,
      confidence: 0,
      consensusLevel: 0
    });
    
    lastDetectionState.current = false;
    
    if (enableDebugLogs) {
      toast({
        title: "Sistema reiniciado",
        description: "Todos los componentes de detección han sido reiniciados",
        duration: 3000
      });
    }
  }, [enableDiagnostics, enableAdaptiveCalibration, enableDebugLogs, toast]);
  
  // Retornar API pública del hook
  return {
    // Estado actual
    isFingerDetected: detectionState.isFingerDetected,
    confidence: detectionState.confidence,
    consensusLevel: detectionState.consensusLevel,
    
    // Estado de diagnósticos
    diagnostics: diagnosticsState,
    
    // Parámetros de calibración
    calibrationParams,
    
    // Métodos
    getDetailedStats,
    updateEnvironment,
    setManualOverride,
    updateCalibration,
    getDiagnosticSession,
    exportDiagnostics,
    resetSystem
  };
}
