/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorPrevention } from '@/utils/errorPrevention/integration';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { useVitalSignsWithProcessing } from './useVitalSignsWithProcessing';

export function useVitalSignsWithErrorPrevention() {
  const vitals = useVitalSignsWithProcessing();
  const errorPrevention = useErrorPrevention();
  const [isMonitoringWithPrevention, setIsMonitoringWithPrevention] = useState(false);
  
  // Registro de errores
  const registerError = useCallback((message: string) => {
    errorPrevention.registerError(message, 'vital-signs-processing');
  }, [errorPrevention]);
  
  const startMonitoringWithPrevention = useCallback(() => {
    try {
      vitals.startMonitoring();
      setIsMonitoringWithPrevention(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registerError(`Error al iniciar el monitoreo: ${errorMessage}`);
      logError(`Error al iniciar el monitoreo: ${errorMessage}`, ErrorLevel.ERROR, 'useVitalSignsWithErrorPrevention');
    }
  }, [vitals, registerError]);
  
  const stopMonitoringWithPrevention = useCallback(() => {
    try {
      vitals.stopMonitoring();
      setIsMonitoringWithPrevention(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registerError(`Error al detener el monitoreo: ${errorMessage}`);
      logError(`Error al detener el monitoreo: ${errorMessage}`, ErrorLevel.ERROR, 'useVitalSignsWithErrorPrevention');
    }
  }, [vitals, registerError]);
  
  const resetWithPrevention = useCallback(() => {
    try {
      vitals.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registerError(`Error al resetear el sistema: ${errorMessage}`);
      logError(`Error al resetear el sistema: ${errorMessage}`, ErrorLevel.ERROR, 'useVitalSignsWithErrorPrevention');
    }
  }, [vitals, registerError]);
  
  const processFrameWithPrevention = useCallback((imageData: ImageData) => {
    try {
      vitals.processFrame(imageData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registerError(`Error al procesar el frame: ${errorMessage}`);
      logError(`Error al procesar el frame: ${errorMessage}`, ErrorLevel.ERROR, 'useVitalSignsWithErrorPrevention');
    }
  }, [vitals, registerError]);
  
  return {
    isMonitoring: isMonitoringWithPrevention,
    lastResult: vitals.lastResult,
    processedFrames: vitals.processedFrames,
    fingerDetected: vitals.fingerDetected,
    signalQuality: vitals.signalQuality,
    heartRate: vitals.heartRate,
    processFrame: processFrameWithPrevention,
    startMonitoring: startMonitoringWithPrevention,
    stopMonitoring: stopMonitoringWithPrevention,
    reset: resetWithPrevention,
    updateAmbientBrightness: vitals.updateAmbientBrightness
  };
}
