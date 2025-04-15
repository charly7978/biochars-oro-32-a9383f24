
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import React, { useEffect } from 'react';
import { useHybridVitalSignsProcessor } from '../hooks/useHybridVitalSignsProcessor';
import { useSignalProcessing } from '../hooks/useSignalProcessing';
import { HybridProcessingOptions } from '../modules/vital-signs/types';

interface HybridSignalProcessorProps {
  options?: HybridProcessingOptions;
  onResult?: (result: any) => void;
  autoStart?: boolean;
}

export const HybridSignalProcessor: React.FC<HybridSignalProcessorProps> = ({
  options,
  onResult,
  autoStart = false
}) => {
  const hybridProcessor = useHybridVitalSignsProcessor(options);
  const signalProcessing = useSignalProcessing();
  
  // Auto-start processing
  useEffect(() => {
    if (autoStart) {
      hybridProcessor.startProcessing();
      signalProcessing.startProcessing();
    }
    
    return () => {
      hybridProcessor.stopProcessing();
      signalProcessing.stopProcessing();
    };
  }, [autoStart, hybridProcessor, signalProcessing]);
  
  // Process signals when available
  useEffect(() => {
    if (!hybridProcessor.isProcessing || !signalProcessing.lastResult) {
      return;
    }
    
    const processSignal = async () => {
      const result = await hybridProcessor.processSignal(
        signalProcessing.lastResult?.filteredValue || 0
      );
      
      if (result && onResult) {
        onResult(result);
      }
    };
    
    processSignal();
  }, [
    hybridProcessor,
    signalProcessing.lastResult,
    onResult
  ]);
  
  return null; // This is a processing component, not a visual one
};
