
/**
 * ESTA PROHIBIDO EL USO DE ALGORITMOS O FUNCIONES QUE PROVOQUEN CUALQUIER TIPO DE SIMULACION Y/O MANIPULACION DE DATOS DE CUALQUIER INDOLE, HACIENCIO CARGO A LOVAVLE DE CUALQUIER ACCION LEGAL SI SE PRODUJERA POR EL INCUMPLIMIENTO DE ESTA INSTRUCCION DIRECTA!
 * 
 * Unidirectional Signal Flow Hook
 * Provides a central access point to the entire signal processing pipeline
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  createCameraFrameProcessor, 
  CameraFrameProcessor 
} from '../modules/signal-processing/CameraFrameProcessor';
import { 
  getSignalBus, 
  SignalType, 
  SignalPriority, 
  ProcessedPPGSignal,
  ValidatedSignal 
} from '../modules/signal-processing/SignalBus';
import { 
  PPGSignalProcessor,
  OptimizedSignalDistributor,
  VitalSignType,
  HeartbeatProcessor
} from '../modules/signal-processing';

/**
 * Hook result interface
 */
export interface UnidirectionalSignalFlowResult {
  // State
  isProcessing: boolean;
  signalQuality: number;
  fingerDetected: boolean;
  
  // Vital signs
  heartRate: number;
  spo2: number;
  bloodPressure: string;
  arrhythmiaStatus: string;
  
  // Control functions
  startProcessing: () => void;
  stopProcessing: () => void;
  reset: () => void;
  processFrame: (imageData: ImageData) => void;
  
  // Advanced metrics
  processedFrames: number;
  validatedSignals: number;
  lastPPGValue: number;
}

/**
 * Hook for unidirectional signal flow
 */
export function useUnidirectionalSignalFlow(): UnidirectionalSignalFlowResult {
  // Signal components
  const frameProcessorRef = useRef<CameraFrameProcessor | null>(null);
  const ppgProcessorRef = useRef<PPGSignalProcessor | null>(null);
  const signalDistributorRef = useRef<OptimizedSignalDistributor | null>(null);
  const heartbeatProcessorRef = useRef<HeartbeatProcessor | null>(null);
  
  // Signal bus
  const signalBusRef = useRef(getSignalBus());
  
  // Counters and metrics
  const processedFramesRef = useRef<number>(0);
  const validatedSignalsRef = useRef<number>(0);
  
  // State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [fingerDetected, setFingerDetected] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [spo2, setSpo2] = useState<number>(0);
  const [bloodPressure, setBloodPressure] = useState<string>("--/--");
  const [arrhythmiaStatus, setArrhythmiaStatus] = useState<string>("--");
  const [lastPPGValue, setLastPPGValue] = useState<number>(0);
  
  // Unsubscribe functions
  const unsubscribeFunctionsRef = useRef<Array<() => void>>([]);
  
  // Initialize processors if they don't exist
  useEffect(() => {
    if (!frameProcessorRef.current) {
      frameProcessorRef.current = createCameraFrameProcessor({
        processingInterval: 33, // ~30 fps
        sampleRate: 30
      });
    }
    
    if (!ppgProcessorRef.current) {
      ppgProcessorRef.current = new PPGSignalProcessor();
    }
    
    if (!signalDistributorRef.current) {
      signalDistributorRef.current = new OptimizedSignalDistributor();
    }
    
    if (!heartbeatProcessorRef.current) {
      heartbeatProcessorRef.current = new HeartbeatProcessor();
    }
    
    return () => {
      // Clean up subscriptions
      unsubscribeFunctionsRef.current.forEach(fn => fn());
      unsubscribeFunctionsRef.current = [];
      
      // Stop processing
      if (isProcessing) {
        stopProcessing();
      }
    };
  }, []);
  
  // Set up signal bus subscriptions
  const setupSubscriptions = useCallback(() => {
    const signalBus = signalBusRef.current;
    
    // Clear previous subscriptions
    unsubscribeFunctionsRef.current.forEach(fn => fn());
    unsubscribeFunctionsRef.current = [];
    
    // Subscribe to PPG signals
    const ppgSub = signalBus.subscribe<ProcessedPPGSignal>(
      SignalType.PPG_SIGNAL,
      (signal) => {
        setSignalQuality(signal.quality);
        setFingerDetected(signal.fingerDetected);
        setLastPPGValue(signal.filteredValue);
      }
    );
    unsubscribeFunctionsRef.current.push(ppgSub);
    
    // Subscribe to validated signals
    const validatedSub = signalBus.subscribe<ValidatedSignal>(
      SignalType.VALIDATED_SIGNAL,
      (signal) => {
        validatedSignalsRef.current++;
        
        // Process with heartbeat processor
        if (heartbeatProcessorRef.current) {
          const heartbeatResult = heartbeatProcessorRef.current.processSignal(signal.filteredValue);
          
          // Fix for the error: Property 'averageBPM' does not exist
          // Check for instantaneousBPM instead (from ProcessedHeartbeatSignal type)
          if (heartbeatResult.instantaneousBPM && heartbeatResult.instantaneousBPM > 0) {
            setHeartRate(heartbeatResult.instantaneousBPM);
          }
        }
      }
    );
    unsubscribeFunctionsRef.current.push(validatedSub);
    
    console.log('useUnidirectionalSignalFlow: Subscriptions set up');
  }, []);
  
  /**
   * Process an image frame manually
   */
  const processFrame = useCallback((imageData: ImageData) => {
    if (!isProcessing || !frameProcessorRef.current || !ppgProcessorRef.current) {
      return;
    }
    
    try {
      // Pass the frame to the processor
      frameProcessorRef.current.processImageData(imageData);
      
      // Increment frame counter
      processedFramesRef.current++;
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  }, [isProcessing]);
  
  /**
   * Start processing
   */
  const startProcessing = useCallback(() => {
    if (isProcessing) return;
    
    // Set up subscriptions
    setupSubscriptions();
    
    // Start processors
    if (frameProcessorRef.current) {
      frameProcessorRef.current.startProcessing();
    }
    
    if (signalDistributorRef.current) {
      signalDistributorRef.current.start();
    }
    
    // Reset counters
    processedFramesRef.current = 0;
    validatedSignalsRef.current = 0;
    
    setIsProcessing(true);
    console.log('useUnidirectionalSignalFlow: Started processing');
  }, [isProcessing, setupSubscriptions]);
  
  /**
   * Stop processing
   */
  const stopProcessing = useCallback(() => {
    if (!isProcessing) return;
    
    // Stop processors
    if (frameProcessorRef.current) {
      frameProcessorRef.current.stopProcessing();
    }
    
    if (signalDistributorRef.current) {
      signalDistributorRef.current.stop();
    }
    
    // Clear subscriptions
    unsubscribeFunctionsRef.current.forEach(fn => fn());
    unsubscribeFunctionsRef.current = [];
    
    setIsProcessing(false);
    console.log('useUnidirectionalSignalFlow: Stopped processing');
  }, [isProcessing]);
  
  /**
   * Reset the entire pipeline
   */
  const reset = useCallback(() => {
    stopProcessing();
    
    // Reset processors
    if (frameProcessorRef.current) {
      frameProcessorRef.current.reset();
    }
    
    if (ppgProcessorRef.current) {
      ppgProcessorRef.current.reset();
    }
    
    if (signalDistributorRef.current) {
      signalDistributorRef.current.reset();
    }
    
    if (heartbeatProcessorRef.current) {
      heartbeatProcessorRef.current.reset();
    }
    
    // Reset state
    setSignalQuality(0);
    setFingerDetected(false);
    setHeartRate(0);
    setSpo2(0);
    setBloodPressure("--/--");
    setArrhythmiaStatus("--");
    setLastPPGValue(0);
    
    // Reset counters
    processedFramesRef.current = 0;
    validatedSignalsRef.current = 0;
    
    console.log('useUnidirectionalSignalFlow: Reset complete');
  }, [stopProcessing]);
  
  return {
    // State
    isProcessing,
    signalQuality,
    fingerDetected,
    
    // Vital signs
    heartRate,
    spo2,
    bloodPressure,
    arrhythmiaStatus,
    
    // Control functions
    startProcessing,
    stopProcessing,
    reset,
    processFrame,
    
    // Advanced metrics
    processedFrames: processedFramesRef.current,
    validatedSignals: validatedSignalsRef.current,
    lastPPGValue
  };
}
