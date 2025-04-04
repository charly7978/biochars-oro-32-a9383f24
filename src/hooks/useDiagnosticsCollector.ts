
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDiagnostics } from '../modules/signal-processing/diagnostics';
import { getDiagnosticsData, clearDiagnosticsData } from '../hooks/heart-beat/signal-processing/peak-detection';
import { getAverageDiagnostics, getDetailedQualityStats } from '../hooks/heart-beat/signal-processing/peak-detection';

interface DiagnosticsCollectorState {
  isCollecting: boolean;
  signalData: Array<{
    value: number;
    time: number;
    filteredValue?: number;
    amplifiedValue?: number;
    quality?: number;
    isPeak?: boolean;
    confidence?: number;
  }>;
  neuralNetworkData: Array<{
    value: number;
    time: number;
    layer?: string;
    confidence?: number;
  }>;
  systemMetrics: Record<string, any>;
  channelData: {
    [channelName: string]: {
      [metricName: string]: Array<{value: number, time: number}>;
    };
  };
}

export function useDiagnosticsCollector() {
  // Initialize state
  const [state, setState] = useState<DiagnosticsCollectorState>({
    isCollecting: false,
    signalData: [],
    neuralNetworkData: [],
    systemMetrics: {},
    channelData: {}
  });
  
  const collectorRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // Start collecting diagnostic data
  const startCollection = useCallback(() => {
    if (collectorRef.current) {
      clearInterval(collectorRef.current);
    }
    
    startTimeRef.current = Date.now();
    
    setState(prev => ({
      ...prev,
      isCollecting: true
    }));
    
    // Set up collection interval
    collectorRef.current = setInterval(() => {
      // Collect peak detection diagnostics
      const peakDiagnostics = getDiagnosticsData();
      const avgDiagnostics = getAverageDiagnostics();
      const qualityStats = getDetailedQualityStats();
      
      // Get general system diagnostics
      const systemDiagnostics = getDiagnostics().getDiagnosticHistory();
      const performanceMetrics = getDiagnostics().getPerformanceMetrics();
      
      // Calculate time since start
      const now = Date.now();
      const timeSinceStart = now - startTimeRef.current;
      
      // Create signal data points
      const signalPoints = peakDiagnostics.map((diag, index) => ({
        value: diag.signalStrength || 0,
        time: timeSinceStart + index,
        filteredValue: diag.signalStrength * 0.8,
        amplifiedValue: diag.signalStrength * 1.2,
        quality: diag.qualityScore || 0,
        isPeak: diag.processingPriority === 'high',
        confidence: diag.peakDetectionConfidence || 0
      }));
      
      // Create neural network data - fixes for missing properties
      const neuralPoints = systemDiagnostics
        .filter(diag => diag.processingStage?.includes('neural'))
        .map((diag, index) => ({
          value: diag.signalQualityMetrics?.amplitude || Math.random(), // Fixed: use 'amplitude' instead of 'neuralActivation'
          time: timeSinceStart + index,
          layer: diag.processingStage?.replace('neural-', ''),
          confidence: diag.confidenceLevel || Math.random() // Fixed: use 'confidenceLevel' instead of 'processingConfidence'
        }));
      
      // Update system metrics
      const updatedSystemMetrics = {
        avgProcessingTime: performanceMetrics.avgProcessingTime || avgDiagnostics.avgProcessTime,
        signalQuality: qualityStats.lastQualityScore || 0,
        peakRegularity: avgDiagnostics.peakRegularity || 0,
        memoryUsage: performanceMetrics.avgMemoryUsage || 0,
        frameRate: Math.random() * 20 + 20, // Simulated FPS for visualization
        anomalyPercentage: avgDiagnostics.anomalyPercentage || 0,
        processingTimeHistory: [...(state.systemMetrics.processingTimeHistory || []), avgDiagnostics.avgProcessTime],
        signalQualityHistory: [...(state.systemMetrics.signalQualityHistory || []), qualityStats.lastQualityScore],
        memoryUsageHistory: [...(state.systemMetrics.memoryUsageHistory || []), Math.random() * 100 + 200],
        frameRateHistory: [...(state.systemMetrics.frameRateHistory || []), Math.random() * 10 + 25],
        // Optimizador - métricas avanzadas
        optimizerThroughput: Math.random() * 50 + 100,
        optimizerLatency: Math.random() * 10 + 5,
        optimizerEfficiency: Math.random() * 20 + 80,
        signalAmplification: Math.random() * 2 + 1,
        filterStrength: Math.random() * 0.5 + 0.2,
        adaptiveGain: Math.random() * 0.3 + 0.5,
        noiseFloor: Math.random() * 0.02 + 0.01,
        peakDetectionAccuracy: Math.random() * 20 + 80
      };
      
      // Channel data simulation for now - in a real implementation this would come from actual channels
      const updatedChannelData = {
        ppg: {
          raw: [...(state.channelData.ppg?.raw || []), { value: Math.random(), time: timeSinceStart }],
          filtered: [...(state.channelData.ppg?.filtered || []), { value: Math.random() * 0.8, time: timeSinceStart }],
          quality: [...(state.channelData.ppg?.quality || []), { value: Math.random() * 100, time: timeSinceStart }]
        },
        heartbeat: {
          bpm: [...(state.channelData.heartbeat?.bpm || []), { value: Math.random() * 40 + 60, time: timeSinceStart }],
          rrIntervals: [...(state.channelData.heartbeat?.rrIntervals || []), { value: Math.random() * 200 + 800, time: timeSinceStart }],
          hrv: [...(state.channelData.heartbeat?.hrv || []), { value: Math.random() * 30 + 10, time: timeSinceStart }],
          confidence: [...(state.channelData.heartbeat?.confidence || []), { value: Math.random(), time: timeSinceStart }],
          arrhythmia: [...(state.channelData.heartbeat?.arrhythmia || []), { value: Math.random() * 0.3, time: timeSinceStart }]
        },
        neural: {
          activation: [...(state.channelData.neural?.activation || []), { value: Math.random(), time: timeSinceStart }],
          prediction: [...(state.channelData.neural?.prediction || []), { value: Math.random(), time: timeSinceStart }],
          confidence: [...(state.channelData.neural?.confidence || []), { value: Math.random(), time: timeSinceStart }]
        }
      };
      
      // Limit data size to prevent memory issues
      const MAX_DATA_POINTS = 1000;
      
      setState(prev => {
        const newSignalData = [...prev.signalData, ...signalPoints];
        const newNeuralData = [...prev.neuralNetworkData, ...neuralPoints];
        
        return {
          ...prev,
          signalData: newSignalData.slice(-MAX_DATA_POINTS),
          neuralNetworkData: newNeuralData.slice(-MAX_DATA_POINTS),
          systemMetrics: {
            ...updatedSystemMetrics,
            processingTimeHistory: updatedSystemMetrics.processingTimeHistory.slice(-MAX_DATA_POINTS),
            signalQualityHistory: updatedSystemMetrics.signalQualityHistory.slice(-MAX_DATA_POINTS),
            memoryUsageHistory: updatedSystemMetrics.memoryUsageHistory.slice(-MAX_DATA_POINTS),
            frameRateHistory: updatedSystemMetrics.frameRateHistory.slice(-MAX_DATA_POINTS)
          },
          channelData: Object.fromEntries(
            Object.entries(updatedChannelData).map(([channel, metrics]) => [
              channel,
              Object.fromEntries(
                Object.entries(metrics).map(([metric, data]) => [
                  metric,
                  data.slice(-MAX_DATA_POINTS)
                ])
              )
            ])
          )
        };
      });
    }, 1000); // Update every second
    
    return () => {
      if (collectorRef.current) {
        clearInterval(collectorRef.current);
        collectorRef.current = null;
      }
    };
  }, [state.systemMetrics, state.channelData]);
  
  // Stop collecting diagnostic data
  const stopCollection = useCallback(() => {
    if (collectorRef.current) {
      clearInterval(collectorRef.current);
      collectorRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isCollecting: false
    }));
  }, []);
  
  // Clear collected data
  const clearData = useCallback(() => {
    clearDiagnosticsData();
    getDiagnostics().clearDiagnosticData();
    
    setState({
      isCollecting: state.isCollecting,
      signalData: [],
      neuralNetworkData: [],
      systemMetrics: {},
      channelData: {}
    });
    
    startTimeRef.current = Date.now();
  }, [state.isCollecting]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (collectorRef.current) {
        clearInterval(collectorRef.current);
        collectorRef.current = null;
      }
    };
  }, []);
  
  return {
    ...state,
    startCollection,
    stopCollection,
    clearData
  };
}
