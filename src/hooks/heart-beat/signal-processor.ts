
import { useCallback, useRef, useEffect } from 'react';
import { HeartBeatResult } from './types';
import { HeartBeatConfig } from '../../modules/heart-beat/config';
import { 
  checkWeakSignal, 
  shouldProcessMeasurement, 
  createWeakSignalResult, 
  handlePeakDetection,
  updateLastValidBpm,
  processLowConfidenceResult
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
  
  // Buffer for optimized processing with lower latency
  const signalBufferRef = useRef<number[]>([]);
  
  // Reference to the signal distributor
  const signalDistributorRef = useRef<OptimizedSignalDistributor | null>(null);
  
  // ML model initialization flag
  const mlInitializedRef = useRef<boolean>(false);
  
  // Simple reference counter for compatibility
  const consecutiveWeakSignalsRef = useRef<number>(0);
  const WEAK_SIGNAL_THRESHOLD = HeartBeatConfig.LOW_SIGNAL_THRESHOLD; 
  const MAX_CONSECUTIVE_WEAK_SIGNALS = HeartBeatConfig.LOW_SIGNAL_FRAMES;

  // Initialize signal distributor and ML model
  useEffect(() => {
    // Create and initialize signal distributor if not already created
    if (!signalDistributorRef.current) {
      signalDistributorRef.current = new OptimizedSignalDistributor();
      signalDistributorRef.current.start();
      console.log("SignalProcessor: Signal distributor initialized");
    }
    
    // Initialize ML model
    if (!mlInitializedRef.current) {
      initializeCardiacModel().then(success => {
        mlInitializedRef.current = success;
        console.log(`SignalProcessor: ML model initialization ${success ? 'successful' : 'failed'}`);
      });
    }
    
    // Cleanup
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
      
      // Store in optimized buffer for low-latency processing
      signalBufferRef.current.push(value);
      if (signalBufferRef.current.length > 15) { // Smaller buffer for reduced latency
        signalBufferRef.current.shift();
      }
      
      // Process signal with ML service if available
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
      
      // Apply optimized cardiac signal processing for lower latency
      const optimizedValue = optimizeCardiacSignal(enhancedValue, signalBufferRef.current);
      
      // Check for weak signal
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
      
      // Only process signals with sufficient amplitude
      if (!shouldProcessMeasurement(optimizedValue)) {
        return createWeakSignalResult(processor.getArrhythmiaCounter());
      }
      
      // Process through signal distributor if available
      if (signalDistributorRef.current && isMonitoringRef.current) {
        const processedSignal = {
          timestamp: Date.now(),
          rawValue: value,
          // Use optimized value for faster response
          filteredValue: optimizedValue,
          normalizedValue: optimizedValue,
          amplifiedValue: optimizedValue,
          quality: mlConfidence > 0 ? mlConfidence * 100 : 70,
          fingerDetected: true,
          signalStrength: Math.abs(optimizedValue)
        };
        
        // Process through distributor and get cardiac channel result
        const distributorResults = signalDistributorRef.current.processSignal(processedSignal);
        const cardiacValue = distributorResults[VitalSignType.CARDIAC];
        
        // Get cardiac channel for RR intervals
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel && 'getRRIntervals' in cardiacChannel) {
          // Update RR intervals reference
          const intervals = (cardiacChannel as any).getRRIntervals();
          if (intervals.length > 0) {
            lastRRIntervalsRef.current = [...intervals];
            
            // Use optimized heart rate calculation
            if (lastRRIntervalsRef.current.length >= 2) {
              const optimizedBPM = calculateHeartRateOptimized(lastRRIntervalsRef.current);
              if (optimizedBPM > 0) {
                // Log improved BPM calculation
                console.log("SignalProcessor: Optimized BPM calculation", {
                  optimizedBPM,
                  intervals: lastRRIntervalsRef.current
                });
              }
            }
          }
          
          // Update arrhythmia status
          if ('isArrhythmia' in cardiacChannel) {
            currentBeatIsArrhythmiaRef.current = (cardiacChannel as any).isArrhythmia();
          }
        }
      }
      
      // Improved low-latency peak detection
      const isPeakRealTime = detectPeakRealTime(
        optimizedValue, 
        signalBufferRef.current, 
        0.15
      );
      
      // Process real signal with traditional processor but use enhanced peak detection
      const result = processor.processSignal(optimizedValue);
      const rrData = processor.getRRIntervals();
      
      // Override result with real-time peak detection for lower latency response
      if (isPeakRealTime) {
        result.isPeak = true;
      }
      
      if (rrData && rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...rrData.intervals];
      }
      
      // Handle peak detection
      handlePeakDetection(
        result, 
        lastPeakTimeRef, 
        requestImmediateBeep, 
        isMonitoringRef,
        optimizedValue
      );
      
      // Update last valid BPM if it's reasonable
      updateLastValidBpm(result, lastValidBpmRef);
      
      lastSignalQualityRef.current = result.confidence;

      // Process result
      const processedResult = processLowConfidenceResult(
        result, 
        currentBPM, 
        processor.getArrhythmiaCounter()
      );
      
      // Send feedback to cardiac channel based on result
      if (result.confidence > 0.5 && signalDistributorRef.current) {
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel) {
          signalDistributorRef.current.applyFeedback({
            channelId: cardiacChannel.getId(),
            success: true,
            signalQuality: result.confidence,
            timestamp: Date.now(),
            suggestedAdjustments: {
              // Dynamic adjustment based on signal quality
              amplificationFactor: 1.5 + (0.5 * (1 - result.confidence)),
              filterStrength: 0.3 + (0.2 * (1 - result.confidence))
            }
          });
        }
      }
      
      return processedResult;
    } catch (error) {
      console.error('useHeartBeatProcessor: Error processing signal', error);
      return {
        bpm: currentBPM,
        confidence: 0,
        isPeak: false,
        arrhythmiaCount: 0,
        rrData: {
          intervals: [],
          lastPeakTime: null
        }
      };
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
    
    // Reset signal distributor
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
    signalDistributor: signalDistributorRef.current
  };
}
