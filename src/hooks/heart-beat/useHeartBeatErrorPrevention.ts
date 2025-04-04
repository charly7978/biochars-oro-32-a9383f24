/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorPrevention } from '@/utils/errorPrevention/integration';
import { logError, ErrorLevel } from '@/utils/debugUtils';

export const useHeartBeatErrorPrevention = () => {
  const errorPrevention = useErrorPrevention();

  // Registro de errores
  const registerError = useCallback((error: any) => {
    errorPrevention.registerError(
      `Error en procesamiento cardíaco: ${error instanceof Error ? error.message : String(error)}`,
      'heartbeat-processor'
    );
  }, [errorPrevention]);

  return {
    registerError
  };
};
