import { useState, useEffect, useCallback, useRef } from 'react';
import { HeartBeatProcessor } from '../modules/HeartBeatProcessor';
import { toast } from 'sonner';
import { useBeepProcessor } from './heart-beat/beep-processor';
import { useArrhythmiaDetector } from './heart-beat/arrhythmia-detector';
import { useSignalProcessor } from './heart-beat/signal-processor';
import { HeartBeatResult, UseHeartBeatReturn } from './heart-beat/types';
import { 
  getAverageDiagnostics, 
  getDetailedQualityStats, 
  getDiagnosticsData 
} from './heart-beat/signal-processing/peak-detection';

export const useHeartBeatProcessor = (): UseHeartBeatReturn => {
  const processorRef = useRef<HeartBeatProcessor | null>(null);
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const sessionId = useRef<string>(Math.random().toString(36).substring(2, 9));
  
  const missedBeepsCounter = useRef<number>(0);
  const isMonitoringRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const lastProcessedPeakTimeRef = useRef<number>(0);
  const lastValidBpmTimestampRef = useRef<number>(0);
  const bpmHistoryRef = useRef<number[]>([]);
  
  const { 
    requestImmediateBeep, 
    processBeepQueue, 
    pendingBeepsQueue, 
    lastBeepTimeRef, 
    beepProcessorTimeoutRef, 
    cleanup: cleanupBeepProcessor 
  } = useBeepProcessor();
  
  const {
    processRRIntervals,
    reset: resetArrhythmiaDetector,
    getArrhythmiaState,
    lastRRIntervalsRef,
    lastIsArrhythmiaRef,
    currentBeatIsArrhythmiaRef,
    heartRateVariabilityRef,
    stabilityCounterRef
  } = useArrhythmiaDetector();
  
  const {
    processSignal: processSignalInternal,
    reset: resetSignalProcessor,
    lastPeakTimeRef,
    lastValidBpmRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    visualizationBuffer,
    amplificationFactor,
    MAX_CONSECUTIVE_WEAK_SIGNALS
  } = useSignalProcessor();

  const diagnosticsRef = useRef<{
    lastDiagnosticUpdate: number;
    qualityHistory: number[];
    confidenceHistory: number[];
    bpmStability: number;
    arrhythmiaRisk: number;
  }>({
    lastDiagnosticUpdate: 0,
    qualityHistory: [],
    confidenceHistory: [],
    bpmStability: 0,
    arrhythmiaRisk: 0
  });

  useEffect(() => {
    if (isMonitoringRef.current && processorRef.current) {
      const bpmCheckInterval = setInterval(() => {
        const now = Date.now();
        if (now - lastValidBpmTimestampRef.current > 5000 && currentBPM === 0) {
          console.log("BPM monitoring: No BPM updates for 5 seconds, forcing recalibration");
          
          if (bpmHistoryRef.current.length > 0) {
            const avgBpm = Math.round(
              bpmHistoryRef.current.reduce((sum, bpm) => sum + bpm, 0) / 
              bpmHistoryRef.current.length
            );
            
            if (avgBpm >= 40 && avgBpm <= 200) {
              setCurrentBPM(avgBpm);
              setConfidence(0.5);
              console.log("BPM monitoring: Recovered BPM from history:", avgBpm);
              lastValidBpmTimestampRef.current = now;
            }
          }
          
          if (processorRef.current) {
            processorRef.current.setMonitoring(true);
            processorRef.current.reset();
            console.log("BPM monitoring: Processor reset for recalibration");
          }
        }
      }, 2000);
      
      return () => clearInterval(bpmCheckInterval);
    }
  }, [currentBPM]);

  useEffect(() => {
    console.log('useHeartBeatProcessor: Initializing new processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!processorRef.current) {
        processorRef.current = new HeartBeatProcessor();
        console.log('HeartBeatProcessor: New instance created - sin audio activado');
        initializedRef.current = true;
        
        if (typeof window !== 'undefined') {
          (window as any).heartBeatProcessor = processorRef.current;
        }
      }
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(true);
        console.log('HeartBeatProcessor: Monitoring state set to true, audio centralizado en PPGSignalMeter');
        isMonitoringRef.current = true;
      }
    } catch (error) {
      console.error('Error initializing HeartBeatProcessor:', error);
      toast.error('Error initializing heartbeat processor');
    }

    return () => {
      console.log('useHeartBeatProcessor: Cleaning up processor', {
        sessionId: sessionId.current,
        timestamp: new Date().toISOString()
      });
      
      if (processorRef.current) {
        processorRef.current.setMonitoring(false);
        processorRef.current = null;
      }
      
      if (typeof window !== 'undefined') {
        (window as any).heartBeatProcessor = undefined;
      }
    };
  }, []);

  const requestBeep = useCallback((value: number): boolean => {
    console.log('useHeartBeatProcessor: Beep ELIMINADO - Todo el sonido SOLO en PPGSignalMeter', {
      value,
      isMonitoring: isMonitoringRef.current,
      processorExists: !!processorRef.current,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }, []);

  const processSignal = useCallback((value: number): HeartBeatResult => {
    if (!processorRef.current) {
      return {
        bpm: 0,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        isArrhythmia: false,
        rrData: {
          intervals: [],
          lastPeakTime: null
        },
        diagnosticData: {
          signalQuality: 'weak',
          detectionStatus: 'processor_not_initialized',
          lastProcessedTime: Date.now()
        }
      };
    }

    const lastRRIntervals = lastRRIntervalsRef?.current || [];
    const currentBeatIsArrhythmia = currentBeatIsArrhythmiaRef?.current || false;

    const amplifiedValue = value * (amplificationFactor?.current || 1.5);

    const result = processSignalInternal(
      amplifiedValue, 
      currentBPM, 
      confidence, 
      processorRef.current, 
      requestBeep, 
      isMonitoringRef, 
      { current: lastRRIntervals }, 
      { current: currentBeatIsArrhythmia }
    );
    
    const now = Date.now();
    if (!result.diagnosticData) {
      result.diagnosticData = {
        lastProcessedTime: now,
        signalStrength: Math.abs(amplifiedValue),
        signalQuality: 
          result.confidence > 0.7 ? 'excellent' : 
          result.confidence > 0.5 ? 'good' : 
          result.confidence > 0.3 ? 'moderate' : 'weak'
      };
    }

    if (result.bpm > 0 && result.bpm >= 40 && result.bpm <= 200 && result.confidence > 0.3) {
      const newBPM = currentBPM === 0 ? result.bpm : (0.8 * currentBPM + 0.2 * result.bpm);
      setCurrentBPM(Math.round(newBPM));
      setConfidence(result.confidence);
      
      lastValidBpmTimestampRef.current = Date.now();
      
      bpmHistoryRef.current.push(Math.round(newBPM));
      if (bpmHistoryRef.current.length > 10) {
        bpmHistoryRef.current.shift();
      }
      
      if (lastValidBpmRef && typeof lastValidBpmRef.current !== 'undefined') {
        lastValidBpmRef.current = Math.round(newBPM);
      }
      
      diagnosticsRef.current.qualityHistory.push(result.confidence * 100);
      diagnosticsRef.current.confidenceHistory.push(result.confidence);
      if (diagnosticsRef.current.qualityHistory.length > 20) {
        diagnosticsRef.current.qualityHistory.shift();
        diagnosticsRef.current.confidenceHistory.shift();
      }
      
      if (bpmHistoryRef.current.length >= 3) {
        const recentBpms = bpmHistoryRef.current.slice(-3);
        const variance = calculateVariance(recentBpms);
        diagnosticsRef.current.bpmStability = Math.max(0, 100 - variance * 10);
      }
    }
    else if (result.bpm <= 0 && lastValidBpmRef && lastValidBpmRef.current > 0) {
      result.bpm = lastValidBpmRef.current;
      result.confidence = Math.max(0.3, result.confidence);
      
      if (result.diagnosticData) {
        result.diagnosticData.usingHistoricalBPM = true;
        result.diagnosticData.bpmStatus = 'using_historical';
      }
    }
    else if (result.bpm <= 0 && currentBPM === 0) {
      if (bpmHistoryRef.current.length > 0) {
        result.bpm = Math.round(
          bpmHistoryRef.current.reduce((sum, bpm) => sum + bpm, 0) / 
          bpmHistoryRef.current.length
        );
      } else {
        result.bpm = 72;
      }
      result.confidence = 0.3;
    }

    if (lastRRIntervals.length >= 3) {
      const isArrhythmia = processRRIntervals(lastRRIntervals);
      result.isArrhythmia = isArrhythmia;
      
      if (isArrhythmia) {
        diagnosticsRef.current.arrhythmiaRisk = Math.min(100, diagnosticsRef.current.arrhythmiaRisk + 20);
      } else {
        diagnosticsRef.current.arrhythmiaRisk = Math.max(0, diagnosticsRef.current.arrhythmiaRisk - 5);
      }
      
      if (result.diagnosticData) {
        result.diagnosticData.rhythmAnalysis = {
          regularity: calculateRRRegularity(lastRRIntervals),
          variability: calculateRRVariability(lastRRIntervals)
        };
      }
    }
    
    if (now - diagnosticsRef.current.lastDiagnosticUpdate > 1000) {
      const avgDiagnostics = getAverageDiagnostics();
      const qualityStats = getDetailedQualityStats();
      
      if (result.diagnosticData) {
        result.diagnosticData.processPerformance = {
          avgProcessTime: avgDiagnostics.avgProcessTime,
          avgSignalStrength: avgDiagnostics.avgSignalStrength,
          qualityDistribution: qualityStats.qualityDistribution,
          qualityTrend: JSON.stringify(qualityStats.qualityTrend)
        };
      }
      
      diagnosticsRef.current.lastDiagnosticUpdate = now;
    }

    return result;
  }, [
    currentBPM, 
    confidence, 
    processSignalInternal, 
    requestBeep, 
    processRRIntervals,
    lastRRIntervalsRef,
    currentBeatIsArrhythmiaRef,
    lastValidBpmRef
  ]);

  const reset = useCallback(() => {
    console.log('useHeartBeatProcessor: Resetting processor', {
      sessionId: sessionId.current,
      timestamp: new Date().toISOString()
    });
    
    if (processorRef.current) {
      processorRef.current.setMonitoring(false);
      isMonitoringRef.current = false;
      
      processorRef.current.reset();
    }
    
    setCurrentBPM(0);
    setConfidence(0);
    
    resetArrhythmiaDetector();
    resetSignalProcessor();
    
    missedBeepsCounter.current = 0;
    lastProcessedPeakTimeRef.current = 0;
    lastValidBpmTimestampRef.current = 0;
    bpmHistoryRef.current = [];
    
    cleanupBeepProcessor();
  }, [resetArrhythmiaDetector, resetSignalProcessor, cleanupBeepProcessor]);

  const startMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Starting monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = true;
      processorRef.current.setMonitoring(true);
      console.log('HeartBeatProcessor: Monitoring state set to true');
      
      if (lastPeakTimeRef) lastPeakTimeRef.current = null;
      if (lastBeepTimeRef) lastBeepTimeRef.current = 0;
      lastProcessedPeakTimeRef.current = 0;
      if (pendingBeepsQueue) pendingBeepsQueue.current = [];
      if (consecutiveWeakSignalsRef) consecutiveWeakSignalsRef.current = 0;
      lastValidBpmTimestampRef.current = Date.now();
      
      if (beepProcessorTimeoutRef && beepProcessorTimeoutRef.current) {
        clearTimeout(beepProcessorTimeoutRef.current);
        beepProcessorTimeoutRef.current = null;
      }
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('useHeartBeatProcessor: Stopping monitoring');
    if (processorRef.current) {
      isMonitoringRef.current = false;
      processorRef.current.setMonitoring(false);
      console.log('HeartBeatProcessor: Monitoring state set to false');
    }
    
    cleanupBeepProcessor();
    
    setCurrentBPM(0);
    setConfidence(0);
  }, [cleanupBeepProcessor]);

  const getDiagnostics = useCallback(() => {
    return {
      processingMetrics: getAverageDiagnostics(),
      qualityStats: getDetailedQualityStats(),
      detailedData: getDiagnosticsData().slice(-20),
      patientMetrics: {
        bpmStability: diagnosticsRef.current.bpmStability,
        signalQuality: diagnosticsRef.current.qualityHistory.length > 0 ?
          diagnosticsRef.current.qualityHistory.reduce((sum, val) => sum + val, 0) / 
          diagnosticsRef.current.qualityHistory.length : 0,
        arrhythmiaRisk: diagnosticsRef.current.arrhythmiaRisk
      }
    };
  }, []);

  return {
    currentBPM,
    confidence,
    processSignal,
    reset,
    isArrhythmia: currentBeatIsArrhythmiaRef?.current || false,
    requestBeep,
    startMonitoring,
    stopMonitoring,
    getDiagnostics
  };
};

function calculateVariance(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateRRRegularity(intervals: number[]): number {
  if (intervals.length < 3) return 1;
  
  const diffs = [];
  for (let i = 1; i < intervals.length; i++) {
    diffs.push(Math.abs(intervals[i] - intervals[i-1]));
  }
  
  const avgDiff = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
  return Math.max(0, Math.min(1, 1 - (avgDiff / 200))); 
}

function calculateRRVariability(intervals: number[]): number {
  if (intervals.length < 3) return 0;
  return calculateVariance(intervals) / 1000;
}
