/**
 * Hook for processing vital signs signals
 * Now with diagnostics channel and prioritization system
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { VitalSignsProcessor } from '../modules/vital-signs'; // Import from central module
import { ProcessingPriority } from '../modules/extraction'; // Import priority enum
import type { VitalSignsResult, RRIntervalData } from '../types/vital-signs';
import type { ArrhythmiaWindow } from './vital-signs/types';
import { getDiagnosticsData, clearDiagnosticsData } from '../hooks/heart-beat/signal-processing/peak-detection';

// Interfaz para datos de diagnóstico integral
export interface DiagnosticsInfo {
  processedSignals: number;
  signalLog: Array<{ timestamp: number, value: number, result: any, priority: ProcessingPriority }>;
  performanceMetrics: {
    avgProcessTime: number;
    highPriorityPercentage: number;
    mediumPriorityPercentage: number;
    lowPriorityPercentage: number;
    lowPriorityPercentage: number;
  };
}

export function useSignalProcessing() {
  const [state, setState] = useState({
    spo2: 0,
    pressure: '--/--',
    arrhythmiaStatus: '--',
    glucose: 0,
    lipids: {
      totalCholesterol: 0,
      hydrationPercentage: 0
    },
    confidence: {
      glucose: 0,
      lipids: 0,
      overall: 0
    }
  });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const diagnosticsRef = useRef<any>(null);
  const [isDiagnosticsEnabled, setIsDiagnosticsEnabled] = useState(false);
  
  // Mocked values for demonstration
  const spo2Value = 98 + Math.random() * 2;
  const systolic = 120 + Math.random() * 10;
  const diastolic = 80 + Math.random() * 5;
  const glucose = 90 + Math.random() * 15;
  const cholesterol = 190 + Math.random() * 25;
  const hydration = 60 + Math.random() * 10;
  const glucoseConf = 0.8 + Math.random() * 0.2;
  const lipidsConf = 0.7 + Math.random() * 0.3;
  const overallConf = 0.75 + Math.random() * 0.25;
  
  // Toggle diagnostics
  const toggleDiagnostics = useCallback(() => {
    setIsDiagnosticsEnabled(prev => !prev);
    console.log(`Diagnostics toggled: ${!isDiagnosticsEnabled}`);
  }, [isDiagnosticsEnabled]);
  
  // Get diagnostics data
  const getDiagnostics = useCallback(() => {
    return diagnosticsRef.current;
  }, []);
  
  // Refresh state
  const refreshState = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);
  
  // Process signal data
  const processSignalData = useCallback((value: number): VitalSignsResult => {
    // Simulate signal processing
    const timestamp = Date.now();
    
    if (isDiagnosticsEnabled) {
      diagnosticsRef.current = {
        timestamp,
        value,
        spo2Value,
        systolic,
        diastolic,
        glucose,
        cholesterol,
        hydration,
        glucoseConf,
        lipidsConf,
        overallConf
      };
      setDiagnostics(diagnosticsRef.current);
    }
    
    // If signal is too weak, return zeros
    if (Math.abs(value) < 0.01) {
      return {
        spo2: 0,
        pressure: '--/--',
        arrhythmiaStatus: '--',
        glucose: 0,
        lipids: {
          totalCholesterol: 0,
          hydrationPercentage: 0  // Changed from triglycerides to hydrationPercentage
        },
        confidence: {
          glucose: 0,
          lipids: 0,
          overall: 0
        }
      };
    }
    
    // Simulate signal processing
    const spo2Value = 98 + Math.random() * 2;
    const systolic = 120 + Math.random() * 10;
    const diastolic = 80 + Math.random() * 5;
    const glucose = 90 + Math.random() * 15;
    const cholesterol = 190 + Math.random() * 25;
    const hydration = 60 + Math.random() * 10;
    const glucoseConf = 0.8 + Math.random() * 0.2;
    const lipidsConf = 0.7 + Math.random() * 0.3;
    const overallConf = 0.75 + Math.random() * 0.25;
    
    // Return processed result
    return {
      spo2: spo2Value,
      pressure: `${systolic}/${diastolic}`,
      arrhythmiaStatus: '',
      glucose: glucose,
      lipids: {
        totalCholesterol: cholesterol,
        hydrationPercentage: hydration  // Changed from triglycerides to hydrationPercentage
      },
      confidence: {
        glucose: glucoseConf,
        lipids: lipidsConf,
        overall: overallConf
      }
    };
  }, [state, refreshCounter]);
  
  // Update state
  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      spo2: spo2Value,
      pressure: `${systolic}/${diastolic}`,
      glucose: glucose,
      lipids: {
        totalCholesterol: cholesterol,
        hydrationPercentage: hydration
      },
      confidence: {
        glucose: glucoseConf,
        lipids: lipidsConf,
        overall: overallConf
      }
    }));
  }, [refreshCounter, spo2Value, systolic, diastolic, glucose, cholesterol, hydration, glucoseConf, lipidsConf, overallConf]);
  
  return {
    state,
    refreshState,
    diagnostics,
    getDiagnostics,
    toggleDiagnostics,
    isDiagnosticsEnabled,
    processSignalData
  };
}
