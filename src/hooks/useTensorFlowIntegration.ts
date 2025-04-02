
import { useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { initializeTensorFlow, disposeTensors } from '../utils/tfModelInitializer';
import { toast } from './use-toast';

interface UseTensorFlowIntegrationReturn {
  isTensorFlowReady: boolean;
  tensorflowVersion: string;
  tensorflowBackend: string;
  isWebGLAvailable: boolean;
  reinitializeTensorFlow: () => Promise<boolean>;
  disposeResources: () => void;
  performanceMetrics: {
    tensorCount: number;
    memoryUsage: number;
    gpuActive: boolean;
  };
}

/**
 * Hook for managing TensorFlow.js integration
 * Handles initialization, monitoring, and resource cleanup
 */
export function useTensorFlowIntegration(): UseTensorFlowIntegrationReturn {
  const [isTensorFlowReady, setIsTensorFlowReady] = useState<boolean>(false);
  const [tensorflowVersion, setTensorflowVersion] = useState<string>('');
  const [tensorflowBackend, setTensorflowBackend] = useState<string>('');
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean>(false);
  const [initializationAttempts, setInitializationAttempts] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    tensorCount: 0,
    memoryUsage: 0,
    gpuActive: false
  });

  // Initialize TensorFlow
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        console.log("TensorFlowIntegration: Starting initialization... (attempt #" + (initializationAttempts + 1) + ")");
        const success = await initializeTensorFlow();
        
        if (!isMounted) return;
        
        if (success) {
          setIsTensorFlowReady(true);
          setTensorflowVersion(tf.version.tfjs);
          setTensorflowBackend(tf.getBackend() || 'none');
          const hasWebGL = tf.ENV.getBool('HAS_WEBGL');
          setIsWebGLAvailable(hasWebGL);
          
          // Log detailed information about the environment
          console.log("TensorFlow.js initialized successfully", {
            version: tf.version.tfjs,
            backend: tf.getBackend(),
            webgl: hasWebGL,
            device: {
              platform: navigator.platform,
              userAgent: navigator.userAgent,
              memory: navigator.deviceMemory,
              cores: navigator.hardwareConcurrency,
              connection: navigator.connection ? {
                type: navigator.connection.type,
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
              } : 'unknown'
            },
            timestamp: new Date().toISOString()
          });
          
          // Perform test computation to ensure everything is working
          const testTensor = tf.zeros([1, 5, 5, 3]);
          const testResult = testTensor.mean().dataSync()[0];
          testTensor.dispose();
          
          console.log("TensorFlow test computation result:", testResult);
          
          // Show success toast
          if (hasWebGL) {
            toast({
              title: "TensorFlow initialized with GPU",
              description: `Using ${tf.getBackend()} backend for advanced vital sign analysis`,
              variant: "default"
            });
          } else {
            toast({
              title: "TensorFlow initialized with CPU",
              description: "Using fallback CPU mode for vital sign analysis",
              variant: "default"
            });
          }
        } else {
          console.error("Failed to initialize TensorFlow");
          
          setInitializationAttempts(prev => prev + 1);
          
          // If we already tried multiple times, show message indicating using fallback mode
          if (initializationAttempts >= 1) {
            toast({
              title: "TensorFlow initialization failed",
              description: "Using fallback algorithms for signal processing",
              variant: "destructive"
            });
          }
          
          // Try again with a timeout if we haven't exceeded maximum attempts
          if (initializationAttempts < 2 && isMounted) {
            setTimeout(() => {
              initialize();
            }, 3000);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error("Error initializing TensorFlow:", error);
        setIsTensorFlowReady(false);
        setInitializationAttempts(prev => prev + 1);
        
        // Try again with CPU backend if WebGL failed
        if (initializationAttempts === 0) {
          try {
            console.log("Forcing CPU backend after WebGL initialization failure");
            await tf.setBackend('cpu');
            if (await tf.ready()) {
              setIsTensorFlowReady(true);
              setTensorflowVersion(tf.version.tfjs);
              setTensorflowBackend('cpu');
              setIsWebGLAvailable(false);
              
              console.log("TensorFlow.js initialized with CPU fallback");
              
              toast({
                title: "TensorFlow initialized with CPU",
                description: "Using CPU mode for vital sign analysis",
                variant: "default"
              });
            }
          } catch (cpuError) {
            console.error("CPU fallback also failed:", cpuError);
          }
        }
      }
    };
    
    initialize();
    
    // Set up memory monitoring
    const memoryMonitorInterval = setInterval(() => {
      if (isTensorFlowReady) {
        try {
          const memoryInfo = tf.memory();
          
          setPerformanceMetrics({
            tensorCount: memoryInfo.numTensors,
            memoryUsage: memoryInfo.numBytes,
            gpuActive: tf.getBackend() === 'webgl' || tf.getBackend() === 'webgpu'
          });
          
          // Check for memory leaks
          if (memoryInfo.numTensors > 1000) {
            console.warn("High tensor count detected:", memoryInfo.numTensors);
            
            // Only show warning toast for very high counts
            if (memoryInfo.numTensors > 5000) {
              toast({
                title: "Memory warning",
                description: "High tensor count detected. Performance may degrade.",
                variant: "destructive"
              });
            }
            
            // Clean up unused tensors
            tf.tidy(() => {});
          }
        } catch (error) {
          console.warn("Error checking TensorFlow memory:", error);
        }
      }
    }, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(memoryMonitorInterval);
      
      // Clean up TensorFlow resources
      try {
        disposeTensors();
      } catch (error) {
        console.warn("Error disposing TensorFlow resources:", error);
      }
    };
  }, [initializationAttempts]);
  
  /**
   * Re-initialize TensorFlow
   */
  const reinitializeTensorFlow = useCallback(async (): Promise<boolean> => {
    try {
      console.log("TensorFlowIntegration: Reinitializing...");
      
      // Dispose existing resources
      disposeTensors();
      
      // Re-initialize
      const success = await initializeTensorFlow();
      
      if (success) {
        setIsTensorFlowReady(true);
        setTensorflowVersion(tf.version.tfjs);
        setTensorflowBackend(tf.getBackend() || 'none');
        setIsWebGLAvailable(tf.ENV.getBool('HAS_WEBGL'));
        
        // Perform test computation to ensure everything is working
        const testComputation = await tf.tidy(() => {
          const a = tf.tensor1d([1, 2, 3]);
          const b = tf.tensor1d([4, 5, 6]);
          return a.add(b).dataSync();
        });
        
        console.log("TensorFlow reinitialization test computation result:", testComputation);
        
        toast({
          title: "TensorFlow reinitialized",
          description: `Using ${tf.getBackend()} backend`,
          variant: "default"
        });
      } else {
        setIsTensorFlowReady(false);
        
        toast({
          title: "TensorFlow reinitialization failed",
          description: "Using fallback algorithms",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error("Error reinitializing TensorFlow:", error);
      setIsTensorFlowReady(false);
      
      toast({
        title: "Error",
        description: "Failed to reinitialize TensorFlow",
        variant: "destructive"
      });
      
      return false;
    }
  }, []);
  
  /**
   * Dispose TensorFlow resources
   */
  const disposeResources = useCallback(() => {
    try {
      console.log("TensorFlowIntegration: Disposing resources...");
      disposeTensors();
      console.log("TensorFlow resources disposed");
    } catch (error) {
      console.error("Error disposing TensorFlow resources:", error);
    }
  }, []);

  return {
    isTensorFlowReady,
    tensorflowVersion,
    tensorflowBackend,
    isWebGLAvailable,
    reinitializeTensorFlow,
    disposeResources,
    performanceMetrics
  };
}
