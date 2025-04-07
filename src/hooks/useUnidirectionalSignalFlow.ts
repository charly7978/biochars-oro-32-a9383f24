/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Hook for unidirectional signal flow processing with the GuardianShield
 */

import { useRef, useCallback, useState } from 'react';
import { guardianShield } from '../modules/guardian-shield';
import { logError, ErrorLevel } from '../utils/debugUtils';
import { useToast } from '../hooks/use-toast';
import { createPPGSignalProcessor } from '../modules/signal-processing';

interface SignalFlowOptions {
  validateSignal?: boolean;
  trackPerformance?: boolean;
  preventDuplicates?: boolean;
}

/**
 * Hook for managing unidirectional signal flow with GuardianShield integration
 */
export function useUnidirectionalSignalFlow(options: SignalFlowOptions = {}) {
  const { validateSignal = true, trackPerformance = true, preventDuplicates = true } = options;
  
  // Refs for performance tracking
  const signalProcessorRef = useRef(createPPGSignalProcessor());
  const processedSignalsCount = useRef(0);
  const duplicateSignalsCount = useRef(0);
  const lastProcessedSignalRef = useRef<any>(null);
  const processingTimes = useRef<number[]>([]);
  
  // State for tracking
  const [isActive, setIsActive] = useState(false);
  const [avgProcessingTime, setAvgProcessingTime] = useState(0);
  const [duplicateRate, setDuplicateRate] = useState(0);
  
  // Get toast
  const { toast } = useToast();
  
  /**
   * Process a signal through the unidirectional flow
   */
  const processSignal = useCallback((signal: any) => {
    if (!isActive) return null;
    
    try {
      // Start performance tracking if enabled
      const startTime = trackPerformance ? performance.now() : 0;
      
      // Check for duplicate signals if prevention is enabled
      if (preventDuplicates && lastProcessedSignalRef.current) {
        const isDuplicate = JSON.stringify(signal) === JSON.stringify(lastProcessedSignalRef.current);
        
        if (isDuplicate) {
          duplicateSignalsCount.current++;
          const totalProcessed = processedSignalsCount.current + duplicateSignalsCount.current;
          if (totalProcessed > 0) {
            setDuplicateRate(duplicateSignalsCount.current / totalProcessed);
          }
          
          // Log the duplication
          logError(
            'Duplicate signal detected and skipped',
            ErrorLevel.INFO,
            'SignalFlow'
          );
          
          return null;
        }
      }
      
      // Validate signal if enabled
      if (validateSignal) {
        // Simple validation for now
        if (signal === null || signal === undefined) {
          logError(
            'Invalid signal received: null or undefined',
            ErrorLevel.WARNING,
            'SignalFlow'
          );
          return null;
        }
        
        // Additional validation could be added here
      }
      
      // Process the signal using the processor
      const processedSignal = signalProcessorRef.current.processSignal(signal);
      
      // Store this signal as last processed
      lastProcessedSignalRef.current = signal;
      processedSignalsCount.current++;
      
      // Update performance metrics
      if (trackPerformance) {
        const processingTime = performance.now() - startTime;
        processingTimes.current.push(processingTime);
        
        // Keep only the last 100 processing times
        if (processingTimes.current.length > 100) {
          processingTimes.current.shift();
        }
        
        // Calculate average processing time
        const sum = processingTimes.current.reduce((acc, val) => acc + val, 0);
        setAvgProcessingTime(sum / processingTimes.current.length);
      }
      
      return processedSignal;
    } catch (error) {
      // Log error with GuardianShield
      logError(
        `Error in signal processing: ${error}`,
        ErrorLevel.ERROR,
        'SignalFlow'
      );
      
      // Show toast
      toast({
        title: 'Signal Processing Error',
        description: 'An error occurred while processing the signal',
        variant: 'destructive',
      });
      
      return null;
    }
  }, [isActive, preventDuplicates, validateSignal, trackPerformance, toast]);
  
  /**
   * Start signal processing
   */
  const startProcessing = useCallback(() => {
    if (isActive) return;
    
    // Reset counters
    processedSignalsCount.current = 0;
    duplicateSignalsCount.current = 0;
    lastProcessedSignalRef.current = null;
    processingTimes.current = [];
    
    setIsActive(true);
    setAvgProcessingTime(0);
    setDuplicateRate(0);
    
    logError(
      'Signal processing started',
      ErrorLevel.INFO,
      'SignalFlow'
    );
  }, [isActive]);
  
  /**
   * Stop signal processing
   */
  const stopProcessing = useCallback(() => {
    if (!isActive) return;
    
    setIsActive(false);
    
    logError(
      `Signal processing stopped. Processed ${processedSignalsCount.current} signals, ` +
      `filtered ${duplicateSignalsCount.current} duplicates.`,
      ErrorLevel.INFO,
      'SignalFlow'
    );
  }, [isActive]);
  
  /**
   * Reset the processor
   */
  const resetProcessor = useCallback(() => {
    lastProcessedSignalRef.current = null;
    processedSignalsCount.current = 0;
    duplicateSignalsCount.current = 0;
    processingTimes.current = [];
    
    setAvgProcessingTime(0);
    setDuplicateRate(0);
    
    // Re-initialize the signal processor
    signalProcessorRef.current = createPPGSignalProcessor();
    
    logError(
      'Signal processor reset',
      ErrorLevel.INFO,
      'SignalFlow'
    );
  }, []);
  
  return {
    isActive,
    processSignal,
    startProcessing,
    stopProcessing,
    resetProcessor,
    stats: {
      processedSignals: processedSignalsCount.current,
      duplicateSignals: duplicateSignalsCount.current,
      avgProcessingTime,
      duplicateRate
    }
  };
}

export default useUnidirectionalSignalFlow;
