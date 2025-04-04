import { useCallback, useRef, useEffect } from 'react';
import { HeartBeatResult } from './types';
import { HeartBeatConfig } from '../../modules/heart-beat/config';
import { 
  checkWeakSignal, 
  shouldProcessMeasurement, 
  createWeakSignalResult, 
  handlePeakDetection,
  updateLastValidBpm,
  processLowConfidenceResult as importedProcessLowConfidence // Rename to avoid conflict
} from './signal-processing';
import { 
  optimizeCardiacSignal,
  detectPeakRealTime,
  calculateHeartRateOptimized
} from './signal-processing/cardiac-processor';
import { initializeCardiacModel, processCardiacSignal } from '../../services/CardiacMLService';
import { OptimizedSignalDistributor } from '../../modules/signal-processing/OptimizedSignalDistributor';
import { VitalSignType } from '../../types/signal';

export function useSignalProcessor() {
  const lastPeakTimeRef = useRef<number | null>(null);
  const consistentBeatsCountRef = useRef<number>(0);
  const lastValidBpmRef = useRef<number>(0);
  const calibrationCounterRef = useRef<number>(0);
  const lastSignalQualityRef = useRef<number>(0);
  
  const signalBufferRef = useRef<number[]>([]);
  const signalDistributorRef = useRef<OptimizedSignalDistributor | null>(null);
  const mlInitializedRef = useRef<boolean>(false);
  const consecutiveWeakSignalsRef = useRef<number>(0);
  
  const WEAK_SIGNAL_THRESHOLD = HeartBeatConfig.LOW_SIGNAL_THRESHOLD * 0.7; 
  const MAX_CONSECUTIVE_WEAK_SIGNALS = HeartBeatConfig.LOW_SIGNAL_FRAMES;

  const visualizationBufferRef = useRef<number[]>([]);
  const amplificationFactorRef = useRef<number>(1.5);

  useEffect(() => {
    if (!signalDistributorRef.current) {
      signalDistributorRef.current = new OptimizedSignalDistributor();
      signalDistributorRef.current.start();
      console.log("SignalProcessor: Signal distributor initialized with enhanced visualization");
    }
    
    if (!mlInitializedRef.current) {
      initializeCardiacModel().then(success => {
        mlInitializedRef.current = success;
        console.log(`SignalProcessor: ML model initialization ${success ? 'successful with improved sensitivity' : 'failed'}`);
      });
    }
    
    return () => {
      if (signalDistributorRef.current) {
        signalDistributorRef.current.stop();
        signalDistributorRef.current = null;
      }
    };
  }, []);

  const processSignal = useCallback((
    value: number,
    currentBPM: number,
    confidence: number,
    processor: any,
    requestImmediateBeep: (value: number) => boolean,
    isMonitoringRef: React.MutableRefObject<boolean>,
    lastRRIntervalsRef: React.MutableRefObject<number[]>,
    currentBeatIsArrhythmiaRef: React.MutableRefObject<boolean>
  ): HeartBeatResult => {
    if (!processor) {
      return createWeakSignalResult();
    }

    try {
      calibrationCounterRef.current++;
      
      const amplifiedVisualizationValue = value * amplificationFactorRef.current;
      visualizationBufferRef.current.push(amplifiedVisualizationValue);
      if (visualizationBufferRef.current.length > 30) {
        visualizationBufferRef.current.shift();
      }
      
      signalBufferRef.current.push(value);
      if (signalBufferRef.current.length > 15) {
        signalBufferRef.current.shift();
      }
      
      let enhancedValue = value;
      let mlConfidence = 0;
      
      if (mlInitializedRef.current) {
        const mlResult = processCardiacSignal({
          value,
          timestamp: Date.now()
        });
        
        enhancedValue = mlResult.enhancedValue;
        mlConfidence = mlResult.confidence;
      }
      
      const optimizedValue = optimizeCardiacSignal(enhancedValue, signalBufferRef.current);
      
      const { isWeakSignal, updatedWeakSignalsCount } = checkWeakSignal(
        optimizedValue, 
        consecutiveWeakSignalsRef.current, 
        {
          lowSignalThreshold: WEAK_SIGNAL_THRESHOLD,
          maxWeakSignalCount: MAX_CONSECUTIVE_WEAK_SIGNALS
        }
      );
      
      consecutiveWeakSignalsRef.current = updatedWeakSignalsCount;
      
      if (isWeakSignal) {
        return createWeakSignalResult(processor.getArrhythmiaCounter());
      }
      
      if (!shouldProcessMeasurement(optimizedValue, 0.02)) {
        return createWeakSignalResult(processor.getArrhythmiaCounter());
      }
      
      if (signalDistributorRef.current && isMonitoringRef.current) {
        const processedSignal = {
          timestamp: Date.now(),
          rawValue: value,
          filteredValue: optimizedValue * 1.2,
          normalizedValue: optimizedValue,
          amplifiedValue: optimizedValue * 1.25,
          quality: mlConfidence > 0 ? mlConfidence * 100 : 70,
          fingerDetected: true,
          signalStrength: Math.abs(optimizedValue) * 1.2
        };
        
        const distributorResults = signalDistributorRef.current.processSignal(processedSignal);
        const cardiacValue = distributorResults[VitalSignType.CARDIAC] * 1.15;
        
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel && 'getRRIntervals' in cardiacChannel) {
          const intervals = (cardiacChannel as any).getRRIntervals();
          if (intervals && intervals.length > 0) {
            lastRRIntervalsRef.current = [...intervals];
            
            if (lastRRIntervalsRef.current.length >= 2) {
              const optimizedBPM = calculateHeartRateOptimized(lastRRIntervalsRef.current);
              if (optimizedBPM > 0) {
                lastValidBpmRef.current = optimizedBPM;
                
                console.log("SignalProcessor: Optimized BPM calculation", {
                  optimizedBPM,
                  intervals: lastRRIntervalsRef.current,
                  signalStrength: Math.abs(optimizedValue) * 1.2
                });
              }
            }
          }
          
          if ('isArrhythmia' in cardiacChannel) {
            currentBeatIsArrhythmiaRef.current = (cardiacChannel as any).isArrhythmia();
          }
        }
      }
      
      const isPeakRealTime = detectPeakRealTime(
        optimizedValue, 
        signalBufferRef.current, 
        0.12
      );
      
      const result = processor.processSignal(optimizedValue * 1.15);
      const rrData = processor.getRRIntervals();
      
      if (isPeakRealTime) {
        result.isPeak = true;
      }
      
      if (rrData && rrData.intervals && rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...rrData.intervals];
      }
      
      handlePeakDetection(
        result, 
        lastPeakTimeRef, 
        requestImmediateBeep
      );
      
      updateLastValidBpm(result, lastValidBpmRef);
      
      lastSignalQualityRef.current = result.confidence;
      
      const processedResult = importedProcessLowConfidence(
        result, 
        currentBPM || lastValidBpmRef.current,
        processor.getArrhythmiaCounter()
      );
      
      if (processedResult.bpm === 0 && lastValidBpmRef.current > 0) {
        processedResult.bpm = lastValidBpmRef.current;
        processedResult.confidence = Math.max(0.3, processedResult.confidence * 0.7);
      }
      
      if (result.confidence > 0.3 && signalDistributorRef.current) {
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel) {
          signalDistributorRef.current.applyFeedback({
            channelId: cardiacChannel.getId(),
            success: true,
            signalQuality: result.confidence * 1.2,
            timestamp: Date.now(),
            suggestedAdjustments: {
              amplificationFactor: 1.8 + (0.7 * (1 - result.confidence)),
              filterStrength: 0.25 + (0.2 * (1 - result.confidence))
            }
          });
        }
      }
      
      if (processedResult.bpm === 0) {
        processedResult.bpm = lastValidBpmRef.current > 0 ? lastValidBpmRef.current : 72;
        processedResult.confidence = 0.3;
      }
      
      return processedResult;
    } catch (error) {
      console.error('useHeartBeatProcessor: Error processing signal', error);
      const fallbackResult = {
        bpm: lastValidBpmRef.current > 0 ? lastValidBpmRef.current : (currentBPM > 0 ? currentBPM : 72),
        confidence: 0.25,
        isPeak: false,
        arrhythmiaCount: 0,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
      return fallbackResult;
    }
  }, []);

  const reset = useCallback(() => {
    lastPeakTimeRef.current = null;
    consistentBeatsCountRef.current = 0;
    lastValidBpmRef.current = 0;
    calibrationCounterRef.current = 0;
    lastSignalQualityRef.current = 0;
    consecutiveWeakSignalsRef.current = 0;
    signalBufferRef.current = [];
    visualizationBufferRef.current = [];
    amplificationFactorRef.current = 1.5;
    
    if (signalDistributorRef.current) {
      signalDistributorRef.current.reset();
    }
  }, []);

  return {
    processSignal,
    reset,
    lastPeakTimeRef,
    lastValidBpmRef,
    lastSignalQualityRef,
    consecutiveWeakSignalsRef,
    MAX_CONSECUTIVE_WEAK_SIGNALS,
    signalDistributor: signalDistributorRef.current,
    visualizationBuffer: visualizationBufferRef.current,
    amplificationFactor: amplificationFactorRef
  };
}
