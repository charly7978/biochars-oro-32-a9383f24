
import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

// Interface for browser capabilities
interface BrowserCapabilities {
  hasWebGL: boolean;
  hasWasm: boolean;
  hasCPU: boolean;
  memory?: number;
  connectionType?: string;
  connectionDownlink?: number;
  connectionRtt?: number;
  connectionEffectiveType?: string;
  online: boolean;
}

// Interface for TensorFlow performance metrics
export interface TensorFlowPerformanceMetrics {
  tensorCount: number;
  memoryUsage: number;
  memoryLimit?: number;
  kernelMs?: number;
  maxTextureSize?: number;
}

// Interface for the hook return value
export interface TensorFlowIntegrationHook {
  isTensorFlowReady: boolean;
  tensorflowBackend: string;
  isWebGLAvailable: boolean;
  performanceMetrics: TensorFlowPerformanceMetrics;
  reinitializeTensorFlow: () => Promise<boolean>;
}

/**
 * Hook for TensorFlow integration
 */
export const useTensorFlowIntegration = (): TensorFlowIntegrationHook => {
  const [isTensorFlowReady, setIsTensorFlowReady] = useState<boolean>(false);
  const [tensorflowBackend, setTensorflowBackend] = useState<string>('');
  const [isWebGLAvailable, setIsWebGLAvailable] = useState<boolean>(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<TensorFlowPerformanceMetrics>({
    tensorCount: 0,
    memoryUsage: 0
  });

  const initializationAttempts = useRef<number>(0);
  const maxInitAttempts = 3;
  const initIntervalRef = useRef<number | null>(null);
  
  // Detect browser capabilities
  const detectBrowserCapabilities = useCallback((): BrowserCapabilities => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      } catch (e) {
        return false;
      }
    };
    
    const capabilities: BrowserCapabilities = {
      hasWebGL: checkWebGL(),
      hasWasm: typeof WebAssembly === 'object',
      hasCPU: true,
      online: navigator.onLine
    };
    
    // Safely check optional properties
    if ('deviceMemory' in navigator) {
      capabilities.memory = (navigator as any).deviceMemory;
    }
    
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        capabilities.connectionType = conn.type;
        capabilities.connectionDownlink = conn.downlink;
        capabilities.connectionRtt = conn.rtt;
        capabilities.connectionEffectiveType = conn.effectiveType;
      }
    }
    
    return capabilities;
  }, []);
  
  // Update performance metrics
  const updatePerformanceMetrics = useCallback(() => {
    try {
      if (!isTensorFlowReady) return;
      
      const numTensors = tf.memory().numTensors;
      const memoryInfo = tf.memory();
      
      let maxTextureSize: number | undefined;
      if (tf.getBackend() === 'webgl') {
        const gl = (tf.backend() as any).gpgpu?.gl;
        if (gl) {
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        }
      }
      
      setPerformanceMetrics({
        tensorCount: numTensors,
        memoryUsage: memoryInfo.numBytes,
        memoryLimit: memoryInfo.unreliable ? undefined : undefined,
        kernelMs: undefined,
        maxTextureSize
      });
    } catch (e) {
      console.error('Error updating TensorFlow metrics:', e);
    }
  }, [isTensorFlowReady]);
  
  // Initialize TensorFlow - optimized version
  const initializeTensorFlow = useCallback(async (): Promise<boolean> => {
    if (isTensorFlowReady) return true;
    
    try {
      const capabilities = detectBrowserCapabilities();
      console.log('Browser capabilities for TensorFlow:', capabilities);
      
      // Determine optimal backend based on capabilities
      let preferredBackend = 'cpu';
      
      if (capabilities.hasWebGL) {
        preferredBackend = 'webgl';
        setIsWebGLAvailable(true);
      }
      
      // For high-end devices, prefer WebGL
      if (capabilities.hasWebGL) {
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
        tf.env().set('WEBGL_PACK', true);
        tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);
      }
      
      await tf.ready();
      await tf.setBackend(preferredBackend);
      
      const actualBackend = tf.getBackend();
      console.log(`TensorFlow initialized with backend: ${actualBackend}`);
      setTensorflowBackend(actualBackend || 'unknown');
      
      // Run a simple operation to warm up the backend
      const t1 = tf.tensor([1, 2, 3]);
      const t2 = tf.tensor([4, 5, 6]);
      const result = tf.add(t1, t2);
      await result.data();
      
      // Clean up tensors
      t1.dispose();
      t2.dispose();
      result.dispose();
      
      setIsTensorFlowReady(true);
      updatePerformanceMetrics();
      
      return true;
    } catch (e) {
      console.error('Error initializing TensorFlow:', e);
      return false;
    }
  }, [detectBrowserCapabilities, updatePerformanceMetrics, isTensorFlowReady]);
  
  // Reinitialize TensorFlow if needed
  const reinitializeTensorFlow = useCallback(async (): Promise<boolean> => {
    try {
      // First try to clean up existing state
      if (tf.getBackend()) {
        tf.engine().disposeVariables();
        tf.engine().startScope(); // Start a fresh scope
      }
      
      return await initializeTensorFlow();
    } catch (e) {
      console.error('Error reinitializing TensorFlow:', e);
      return false;
    }
  }, [initializeTensorFlow]);
  
  // Initialize on component mount
  useEffect(() => {
    const initialize = async () => {
      const success = await initializeTensorFlow();
      
      if (!success) {
        initializationAttempts.current += 1;
        console.log(`TensorFlow initialization attempt ${initializationAttempts.current} failed.`);
        
        if (initializationAttempts.current < maxInitAttempts) {
          // Try again after a delay
          const initInterval = window.setTimeout(() => {
            console.log(`Retrying TensorFlow initialization (attempt ${initializationAttempts.current + 1})...`);
            initialize();
          }, 2000);
          
          initIntervalRef.current = initInterval as unknown as number;
        }
      }
    };
    
    initialize();
    
    return () => {
      if (initIntervalRef.current !== null) {
        clearTimeout(initIntervalRef.current);
      }
    };
  }, [initializeTensorFlow]);
  
  // Update metrics periodically
  useEffect(() => {
    if (!isTensorFlowReady) return;
    
    const metricsInterval = setInterval(() => {
      updatePerformanceMetrics();
    }, 5000);
    
    return () => clearInterval(metricsInterval);
  }, [isTensorFlowReady, updatePerformanceMetrics]);
  
  return {
    isTensorFlowReady,
    tensorflowBackend,
    isWebGLAvailable,
    performanceMetrics,
    reinitializeTensorFlow
  };
};
