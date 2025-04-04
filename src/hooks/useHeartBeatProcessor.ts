
import { useState, useRef, useCallback } from 'react';
import { detectArrhythmia } from '../modules/heart-beat/arrhythmia-detector';
import { processHeartbeatSignal } from '../modules/heart-beat/signal-processor';
import { getDiagnosticsData, getAverageDiagnostics, getDetailedQualityStats } from './heart-beat/signal-processing/peak-detection';

export function useHeartBeatProcessor() {
  const [heartRate, setHeartRate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isArrhythmia, setIsArrhythmia] = useState(false);
  const [arrhythmiaCount, setArrhythmiaCount] = useState(0);
  
  const lastPeakTimeRef = useRef<number | null>(null);
  const processingTimeRef = useRef<number>(0);
  const lastValidBpmRef = useRef<number>(0);
  const isMonitoringRef = useRef<boolean>(false);
  
  const processSignal = useCallback((value: number) => {
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      const result = processHeartbeatSignal(value, lastPeakTimeRef, lastValidBpmRef, arrhythmiaCount, isMonitoringRef);
      
      // Actualizar referencias y estado
      if (result.bpm > 0 && result.bpm <= 220 && result.confidence > 0.2) {
        setHeartRate(result.bpm);
      }
      
      // Detectar arritmia
      if (result.isPeak && result.bpm > 0) {
        const arrhythmiaResult = detectArrhythmia(result, arrhythmiaCount);
        setArrhythmiaCount(arrhythmiaResult.arrhythmiaCount);
        setIsArrhythmia(arrhythmiaResult.isArrhythmia || false);
        result.isArrhythmia = arrhythmiaResult.isArrhythmia || false;
        result.arrhythmiaCount = arrhythmiaResult.arrhythmiaCount;
      }
      
      setLastResult(result);
      processingTimeRef.current = performance.now() - startTime;
      setIsProcessing(false);
      return result;
      
    } catch (error) {
      console.error("Error processing heartbeat signal:", error);
      setIsProcessing(false);
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: arrhythmiaCount,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
    }
  }, [arrhythmiaCount]);
  
  const startMonitoring = useCallback(() => {
    isMonitoringRef.current = true;
  }, []);
  
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
  }, []);
  
  const reset = useCallback(() => {
    setHeartRate(0);
    setIsProcessing(false);
    setLastResult(null);
    setIsArrhythmia(false);
    setArrhythmiaCount(0);
    lastPeakTimeRef.current = null;
    lastValidBpmRef.current = 0;
    isMonitoringRef.current = false;
  }, []);

  const getDiagnostics = useCallback(() => {
    const diagnosticsData = getDiagnosticsData();
    const averageDiagnostics = getAverageDiagnostics();
    const qualityStats = getDetailedQualityStats();
    
    // Calcular métricas adicionales
    const bpmHistory = lastResult?.bpmHistory || [];
    const bpmValues = bpmHistory.filter((bpm: number) => bpm > 40 && bpm < 220);
    const bpmStability = bpmValues.length > 5 ? 
      100 - (Math.sqrt(bpmValues.reduce((sum: number, bpm: number) => 
        sum + Math.pow(bpm - bpmValues.reduce((a: number, b: number) => a + b, 0) / bpmValues.length, 2), 0) 
        / bpmValues.length) / 5 * 100) : 0;
    
    const arrhythmiaRisk = lastResult && lastResult.isArrhythmia ? 
      Math.min(100, arrhythmiaCount * 10) : 
      Math.min(75, arrhythmiaCount * 5);
    
    return {
      rawDiagnostics: diagnosticsData,
      processingMetrics: {
        ...averageDiagnostics,
        currentProcessingTime: processingTimeRef.current,
        isProcessing: isProcessing,
        lastProcessedTimestamp: lastResult?.timestamp || 0
      },
      qualityStats: qualityStats,
      patientMetrics: {
        currentBpm: heartRate,
        isArrhythmia: isArrhythmia,
        arrhythmiaCount: arrhythmiaCount,
        arrhythmiaRisk: arrhythmiaRisk,
        bpmStability: bpmStability,
        confidenceLevel: lastResult?.confidence || 0,
        rrIntervals: lastResult?.rrData?.intervals || []
      }
    };
  }, [lastResult, isProcessing, heartRate, isArrhythmia, arrhythmiaCount]);
  
  return {
    heartRate,
    isProcessing,
    lastResult,
    processSignal,
    isArrhythmia,
    arrhythmiaCount,
    startMonitoring,
    stopMonitoring,
    reset,
    getDiagnostics
  };
}
