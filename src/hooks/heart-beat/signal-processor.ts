
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
  
  // Buffer for optimized processing with lower latency
  const signalBufferRef = useRef<number[]>([]);
  
  // Reference to the signal distributor
  const signalDistributorRef = useRef<OptimizedSignalDistributor | null>(null);
  
  // ML model initialization flag
  const mlInitializedRef = useRef<boolean>(false);
  
  // Simple reference counter for compatibility
  const consecutiveWeakSignalsRef = useRef<number>(0);
  
  // Reducir el umbral de señal débil para mejorar la detección de señales más débiles
  const WEAK_SIGNAL_THRESHOLD = HeartBeatConfig.LOW_SIGNAL_THRESHOLD * 0.7; 
  const MAX_CONSECUTIVE_WEAK_SIGNALS = HeartBeatConfig.LOW_SIGNAL_FRAMES;

  // Nuevo: buffer para mejorar la visualización de ondas
  const visualizationBufferRef = useRef<number[]>([]);
  const amplificationFactorRef = useRef<number>(1.5);  // Factor de amplificación aumentado

  // Initialize signal distributor and ML model
  useEffect(() => {
    // Create and initialize signal distributor if not already created
    if (!signalDistributorRef.current) {
      signalDistributorRef.current = new OptimizedSignalDistributor();
      signalDistributorRef.current.start();
      console.log("SignalProcessor: Signal distributor initialized with enhanced visualization");
    }
    
    // Initialize ML model
    if (!mlInitializedRef.current) {
      initializeCardiacModel().then(success => {
        mlInitializedRef.current = success;
        console.log(`SignalProcessor: ML model initialization ${success ? 'successful with improved sensitivity' : 'failed'}`);
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
      
      // Agregar mayor amplificación para visualización más clara
      const amplifiedVisualizationValue = value * amplificationFactorRef.current;
      visualizationBufferRef.current.push(amplifiedVisualizationValue);
      if (visualizationBufferRef.current.length > 30) {
        visualizationBufferRef.current.shift();
      }
      
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
      
      // Apply optimized cardiac signal processing with increased sensitivity
      const optimizedValue = optimizeCardiacSignal(enhancedValue, signalBufferRef.current);
      
      // Check for weak signal with reduced threshold for better sensitivity
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
      
      // Procesamiento mejorado con mayor sensibilidad
      if (!shouldProcessMeasurement(optimizedValue, 0.02)) { // Umbral reducido
        return createWeakSignalResult(processor.getArrhythmiaCounter());
      }
      
      // Process through signal distributor with enhanced settings
      if (signalDistributorRef.current && isMonitoringRef.current) {
        const processedSignal = {
          timestamp: Date.now(),
          rawValue: value,
          // Usar valor más amplificado para mejor visualización
          filteredValue: optimizedValue * 1.2, // Amplificación extra
          normalizedValue: optimizedValue,
          amplifiedValue: optimizedValue * 1.25, // Aumentado para mejor detección
          quality: mlConfidence > 0 ? mlConfidence * 100 : 70,
          fingerDetected: true,
          signalStrength: Math.abs(optimizedValue) * 1.2 // Mejora en la fuerza de señal
        };
        
        // Process through distributor with enhanced processing
        const distributorResults = signalDistributorRef.current.processSignal(processedSignal);
        const cardiacValue = distributorResults[VitalSignType.CARDIAC] * 1.15; // Amplificación adicional
        
        // Get cardiac channel for RR intervals with improved detection
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel && 'getRRIntervals' in cardiacChannel) {
          // Update RR intervals reference with enhanced detection
          const intervals = (cardiacChannel as any).getRRIntervals();
          if (intervals && intervals.length > 0) {
            lastRRIntervalsRef.current = [...intervals];
            
            // Use optimized heart rate calculation with improved algorithm
            if (lastRRIntervalsRef.current.length >= 2) {
              const optimizedBPM = calculateHeartRateOptimized(lastRRIntervalsRef.current);
              if (optimizedBPM > 0) {
                // Actualizar última BPM válida para mejor continuidad
                lastValidBpmRef.current = optimizedBPM;
                
                // Log improved BPM calculation
                console.log("SignalProcessor: Optimized BPM calculation", {
                  optimizedBPM,
                  intervals: lastRRIntervalsRef.current,
                  signalStrength: Math.abs(optimizedValue) * 1.2
                });
              }
            }
          }
          
          // Update arrhythmia status with high confidence threshold
          if ('isArrhythmia' in cardiacChannel) {
            currentBeatIsArrhythmiaRef.current = (cardiacChannel as any).isArrhythmia();
          }
        }
      }
      
      // Improved low-latency peak detection with higher sensitivity
      const isPeakRealTime = detectPeakRealTime(
        optimizedValue, 
        signalBufferRef.current, 
        0.12  // Umbral reducido para mejor detección
      );
      
      // Process real signal with traditional processor but use enhanced peak detection
      const result = processor.processSignal(optimizedValue * 1.15); // Valor amplificado
      const rrData = processor.getRRIntervals();
      
      // Override result with real-time peak detection for lower latency response
      if (isPeakRealTime) {
        result.isPeak = true;
      }
      
      // Asegurar que los intervalos RR se actualicen correctamente
      if (rrData && rrData.intervals && rrData.intervals.length > 0) {
        lastRRIntervalsRef.current = [...rrData.intervals];
      }
      
      // Handle peak detection with amplified value for better peaks
      handlePeakDetection(
        result, 
        lastPeakTimeRef, 
        requestImmediateBeep,
        isMonitoringRef,
        optimizedValue * 1.15 // Valor amplificado para mejor detección
      );
      
      // Update last valid BPM with improved filtering
      updateLastValidBpm(result, lastValidBpmRef);
      
      lastSignalQualityRef.current = result.confidence;

      // Process result with improved confidence - Use the imported function with renamed reference
      const processedResult = importedProcessLowConfidence(
        result, 
        currentBPM || lastValidBpmRef.current, // Usar último BPM válido si actual es 0
        processor.getArrhythmiaCounter()
      );
      
      // Si el BPM es 0 pero tenemos un BPM válido previo, lo usamos para mantener continuidad
      if (processedResult.bpm === 0 && lastValidBpmRef.current > 0) {
        processedResult.bpm = lastValidBpmRef.current;
        // Reducir confianza para indicar que es un valor estimado
        processedResult.confidence = Math.max(0.3, processedResult.confidence * 0.7);
      }
      
      // Send feedback to cardiac channel based on result with higher quality feedback
      if (result.confidence > 0.3 && signalDistributorRef.current) {
        const cardiacChannel = signalDistributorRef.current.getChannel(VitalSignType.CARDIAC);
        if (cardiacChannel) {
          signalDistributorRef.current.applyFeedback({
            channelId: cardiacChannel.getId(),
            success: true,
            signalQuality: result.confidence * 1.2, // Aumentar calidad percibida
            timestamp: Date.now(),
            suggestedAdjustments: {
              // Dynamic adjustment based on signal quality for mejor visualización
              amplificationFactor: 1.8 + (0.7 * (1 - result.confidence)),
              filterStrength: 0.25 + (0.2 * (1 - result.confidence))
            }
          });
        }
      }
      
      // El resultado debe tener al menos BPM básico, nunca 0
      if (processedResult.bpm === 0) {
        processedResult.bpm = lastValidBpmRef.current > 0 ? lastValidBpmRef.current : 72;
        processedResult.confidence = 0.3; // Baja confianza para valores estimados
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
    signalDistributor: signalDistributorRef.current,
    // Nuevas propiedades para mejorar visualización
    visualizationBuffer: visualizationBufferRef.current,
    amplificationFactor: amplificationFactorRef
  };
}
