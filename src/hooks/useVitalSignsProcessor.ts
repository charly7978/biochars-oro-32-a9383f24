
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { VitalSignsResult } from '../modules/vital-signs/types/vital-signs-result';
import { useArrhythmiaVisualization } from './vital-signs/use-arrhythmia-visualization';
import { useSignalProcessing } from './vital-signs/use-signal-processing';
import { useVitalSignsLogging } from './vital-signs/use-vital-signs-logging';
import { UseVitalSignsProcessorReturn, SignalQualityMetrics } from './vital-signs/types';
import { checkSignalQuality, getSignalQualityMetrics } from './heart-beat/signal-processing';
import { useTensorFlowIntegration } from './useTensorFlowIntegration';
import { evaluateSignalQuality } from '../modules/vital-signs/utils/signal-processing-utils';

/**
 * Hook for processing vital signs with direct algorithms only
 * No simulation or reference values are used
 * Improved with advanced signal quality metrics
 */
export const useVitalSignsProcessor = (): UseVitalSignsProcessorReturn => {
  // State management - only direct measurement, no simulation
  const [lastValidResults, setLastValidResults] = useState<VitalSignsResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('initializing');
  const [measurementQuality, setMeasurementQuality] = useState<number>(0);
  const [signalQualityMetrics, setSignalQualityMetrics] = useState<SignalQualityMetrics>({
    amplitude: 0,
    stability: 0,
    noiseLevel: 0,
    fingerDetectionConfidence: 0,
    overallQuality: 0
  });
  
  // Session tracking
  const sessionId = useRef<string>(Math.random().toString(36).substring(2, 9));
  
  // Signal quality tracking
  const weakSignalsCountRef = useRef<number>(0);
  const signalQualityHistory = useRef<number[]>([]);
  const LOW_SIGNAL_THRESHOLD = 0.05;
  const MAX_WEAK_SIGNALS = 10;
  
  // Advanced signal analysis
  const rawSignalBuffer = useRef<number[]>([]);
  const MAX_BUFFER_SIZE = 150; // 5 segundos a 30fps
  
  // TensorFlow integration
  const { 
    isTensorFlowReady, 
    tensorflowBackend,
    performanceMetrics,
    reinitializeTensorFlow
  } = useTensorFlowIntegration();
  
  const { 
    arrhythmiaWindows, 
    addArrhythmiaWindow, 
    clearArrhythmiaWindows 
  } = useArrhythmiaVisualization();
  
  const { 
    processSignal: processVitalSignal, 
    initializeProcessor,
    reset: resetProcessor, 
    fullReset: fullResetProcessor,
    getArrhythmiaCounter,
    getDebugInfo,
    processedSignals
  } = useSignalProcessing();
  
  const { 
    logSignalData, 
    clearLog,
    getSignalLog
  } = useVitalSignsLogging();
  
  // Initialize processor components - direct measurement only
  useEffect(() => {
    console.log("useVitalSignsProcessor: Initializing processor for DIRECT MEASUREMENT ONLY", {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString(),
      tensorflowStatus: isTensorFlowReady ? 'ready' : 'initializing',
      tensorflowBackend
    });
    
    // Create new instances for direct measurement
    initializeProcessor();
    setProcessingStatus('ready');
    
    // Track TensorFlow status
    if (isTensorFlowReady) {
      console.log("useVitalSignsProcessor: TensorFlow is ready for processing", {
        backend: tensorflowBackend,
        memoryUsage: performanceMetrics.memoryUsage,
        tensorCount: performanceMetrics.tensorCount
      });
    }
    
    return () => {
      console.log("useVitalSignsProcessor: Processor cleanup", {
        sessionId: sessionId.current,
        totalArrhythmias: getArrhythmiaCounter(),
        processedSignals: processedSignals.current,
        timestamp: new Date().toISOString()
      });
    };
  }, [initializeProcessor, getArrhythmiaCounter, processedSignals, isTensorFlowReady, tensorflowBackend, performanceMetrics]);
  
  // Monitor and log quality information with enhanced metrics
  useEffect(() => {
    const qualityInterval = setInterval(() => {
      if (signalQualityHistory.current.length > 0) {
        const avgQuality = signalQualityHistory.current.reduce((sum, val) => sum + val, 0) / 
                           signalQualityHistory.current.length;
        setMeasurementQuality(Math.round(avgQuality));
        
        // Get advanced quality metrics
        const currentMetrics = getSignalQualityMetrics();
        setSignalQualityMetrics(currentMetrics);
        
        // Reset history to track recent quality only
        signalQualityHistory.current = signalQualityHistory.current.slice(-10);
        
        console.log("useVitalSignsProcessor: Enhanced quality metrics", {
          averageQuality: Math.round(avgQuality),
          currentSamples: signalQualityHistory.current.length,
          weakSignals: weakSignalsCountRef.current,
          fingerConfidence: currentMetrics.fingerDetectionConfidence,
          perfusionAmplitude: currentMetrics.amplitude,
          signalStability: currentMetrics.stability,
          noiseLevel: currentMetrics.noiseLevel,
          overallQuality: currentMetrics.overallQuality,
          processingStatus
        });
      }
    }, 3000);
    
    return () => clearInterval(qualityInterval);
  }, [processingStatus]);
  
  /**
   * Process PPG signal directly with enhanced quality analysis
   * No simulation or reference values
   */
  const processSignal = useCallback((value: number, rrData?: { intervals: number[], lastPeakTime: number | null }) => {
    // Store raw signal values for advanced analysis
    rawSignalBuffer.current.push(value);
    if (rawSignalBuffer.current.length > MAX_BUFFER_SIZE) {
      rawSignalBuffer.current.shift();
    }
    
    // Perform advanced signal quality analysis if we have enough data
    if (rawSignalBuffer.current.length >= 30) {
      const recentSignal = rawSignalBuffer.current.slice(-30);
      const qualityScore = evaluateSignalQuality(recentSignal);
      
      // Add to quality history
      signalQualityHistory.current.push(qualityScore);
      if (signalQualityHistory.current.length > 20) {
        signalQualityHistory.current.shift();
      }
    }
    
    // Check for weak signal to detect finger removal using centralized function
    const { isWeakSignal, updatedWeakSignalsCount } = checkSignalQuality(
      value,
      weakSignalsCountRef.current,
      {
        lowSignalThreshold: LOW_SIGNAL_THRESHOLD,
        maxWeakSignalCount: MAX_WEAK_SIGNALS
      }
    );
    
    weakSignalsCountRef.current = updatedWeakSignalsCount;
    
    // Process signal directly - no simulation
    let result = processVitalSignal(value, rrData, isWeakSignal);
    
    // If arrhythmia is detected in real data, register visualization window
    if (result.arrhythmiaStatus.includes("ARRHYTHMIA DETECTED") && result.lastArrhythmiaData) {
      const arrhythmiaTime = result.lastArrhythmiaData.timestamp;
      
      // Window based on real heart rate
      let windowWidth = 400;
      
      // Adjust based on real RR intervals
      if (rrData && rrData.intervals.length > 0) {
        const lastIntervals = rrData.intervals.slice(-4);
        const avgInterval = lastIntervals.reduce((sum, val) => sum + val, 0) / lastIntervals.length;
        windowWidth = Math.max(300, Math.min(1000, avgInterval * 1.1));
      }
      
      addArrhythmiaWindow(arrhythmiaTime - windowWidth/2, arrhythmiaTime + windowWidth/2);
    }
    
    // Only update lastValidResults if we have meaningful data
    if (result.spo2 > 0 || result.glucose > 0 || 
        result.lipids.totalCholesterol > 0 || result.lipids.hydration > 0) {
      setLastValidResults(result);
    }
    
    // Log processed signals
    logSignalData(value, result, processedSignals.current);
    
    // Always return real result
    return result;
  }, [processVitalSignal, processedSignals, addArrhythmiaWindow, logSignalData]);

  /**
   * Perform complete reset - start from zero
   * No simulations or reference values
   */
  const reset = useCallback(() => {
    const currentResults = lastValidResults;
    
    resetProcessor();
    clearArrhythmiaWindows();
    setLastValidResults(null);
    weakSignalsCountRef.current = 0;
    signalQualityHistory.current = [];
    rawSignalBuffer.current = [];
    
    // Return current results so UI can keep displaying them after reset
    return currentResults;
  }, [resetProcessor, clearArrhythmiaWindows, lastValidResults]);
  
  /**
   * Perform full reset - clear all data
   * No simulations or reference values
   */
  const fullReset = useCallback(() => {
    fullResetProcessor();
    setLastValidResults(null);
    clearArrhythmiaWindows();
    weakSignalsCountRef.current = 0;
    signalQualityHistory.current = [];
    rawSignalBuffer.current = [];
    clearLog();
    
    // Reset signal quality metrics
    setSignalQualityMetrics({
      amplitude: 0,
      stability: 0,
      noiseLevel: 0,
      fingerDetectionConfidence: 0,
      overallQuality: 0
    });
    
    // Try to reinitialize TensorFlow if needed
    if (!isTensorFlowReady) {
      console.log("useVitalSignsProcessor: Attempting to reinitialize TensorFlow");
      reinitializeTensorFlow().then(success => {
        if (success) {
          console.log("useVitalSignsProcessor: TensorFlow reinitialized successfully");
        } else {
          console.warn("useVitalSignsProcessor: TensorFlow reinitialization failed");
        }
      });
    }
  }, [fullResetProcessor, clearArrhythmiaWindows, clearLog, isTensorFlowReady, reinitializeTensorFlow]);

  // Modified to include the signal log in the debug info
  const getExtendedDebugInfo = useCallback(() => {
    // Get base debug info
    const baseDebugInfo = getDebugInfo();
    // Merge with signal log from logging module
    return {
      ...baseDebugInfo,
      signalLog: getSignalLog() // Use the signalLog from useVitalSignsLogging
    };
  }, [getDebugInfo, getSignalLog]);

  return {
    processSignal,
    reset,
    fullReset,
    arrhythmiaCounter: getArrhythmiaCounter(),
    lastValidResults,
    arrhythmiaWindows,
    debugInfo: getExtendedDebugInfo(),
    signalQuality: signalQualityMetrics // Exportar métricas de calidad mejoradas
  };
};
