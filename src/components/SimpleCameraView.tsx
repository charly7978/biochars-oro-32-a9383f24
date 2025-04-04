import React, { useRef, useEffect, useState } from 'react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { setCameraState, CameraState } from '@/utils/deviceErrorTracker';
import { handleCameraError } from '@/utils/deviceErrorTracker';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';

interface SimpleCameraViewProps {
  onFrameCallback?: (imageData: ImageData) => void;
  isActive: boolean;
  targetFps?: number;
  isFingerDetected?: boolean;
}

const SimpleCameraView: React.FC<SimpleCameraViewProps> = ({
  onFrameCallback,
  isActive,
  targetFps = 30,
  isFingerDetected = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingStartTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  const cleanupCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.error("Error al detener track:", err);
        }
      });
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setStream(null);
    setIsProcessing(false);
    processingStartTimeRef.current = 0;
    frameCountRef.current = 0;
  };
  
  const startCamera = async () => {
    try {
      setCameraState(CameraState.REQUESTING);
      setError(null);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("API de cámara no disponible");
      }
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      logError("Solicitando acceso a la cámara...", ErrorLevel.INFO, "SimpleCameraView");
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setStream(newStream);
      setCameraState(CameraState.ACTIVE);
      
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          if (isActive && onFrameCallback) {
            startFrameProcessing();
          }
        };
      }
      
      logError("Cámara iniciada correctamente", ErrorLevel.INFO, "SimpleCameraView");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logError(`Error al iniciar la cámara: ${errorMsg}`, ErrorLevel.ERROR, "SimpleCameraView");
      setError(`Error de cámara: ${errorMsg}`);
      setCameraState(CameraState.ERROR);
    }
  };
  
  const startFrameProcessing = () => {
    if (!videoRef.current || !canvasRef.current || !onFrameCallback) return;
    
    setIsProcessing(true);
    processingStartTimeRef.current = performance.now();
    frameCountRef.current = 0;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      logError("No se pudo obtener contexto de canvas", ErrorLevel.ERROR, "SimpleCameraView");
      return;
    }
    
    const processFrame = () => {
      if (!isActive || !video || !ctx) {
        setIsProcessing(false);
        return;
      }
      
      const now = performance.now();
      const frameTime = 1000 / targetFps;
      const elapsed = now - lastFrameTimeRef.current;
      
      if (lastFrameTimeRef.current > 0 && elapsed < frameTime) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      try {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        onFrameCallback(imageData);
        
        frameCountRef.current++;
        lastFrameTimeRef.current = now;
        
        if (frameCountRef.current % 100 === 0) {
          const totalTime = (now - processingStartTimeRef.current) / 1000;
          const fps = frameCountRef.current / totalTime;
          
          console.log(`Procesamiento de frames: ${frameCountRef.current} frames, ${fps.toFixed(1)} FPS`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Error al procesar frame:", errorMsg);
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };
    
    animationFrameRef.current = requestAnimationFrame(processFrame);
  };
  
  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    } else if (!isActive && stream) {
      cleanupCamera();
    } else if (isActive && stream && !isProcessing && onFrameCallback) {
      startFrameProcessing();
    } else if (!isActive && isProcessing) {
      setIsProcessing(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    
    return () => {
      cleanupCamera();
    };
  }, [isActive, stream, onFrameCallback, isProcessing]);
  
  useEffect(() => {
    if (!isActive || !stream || !isProcessing) return;
    
    const checkBrightness = () => {
      if (!canvasRef.current || !videoRef.current) return;
      
      try {
        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let brightness = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          brightness += (r + g + b) / 3;
        }
        
        brightness /= (data.length / 16);
        
        unifiedFingerDetector.updateSource(
          'camera-analysis', 
          brightness < 60, // Oscuridad sugiere presencia de dedo
          Math.min(1.0, Math.max(0.0, (120 - brightness) / 120))
        );
      } catch (err) {
        // Ignorar errores en esta función auxiliar
      }
    };
    
    const interval = setInterval(checkBrightness, 500);
    
    return () => {
      clearInterval(interval);
    };
  }, [isActive, stream, isProcessing]);
  
  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
      />
      
      {isFingerDetected && (
        <div className="absolute top-4 right-4 p-2 bg-green-500 rounded-full animate-pulse" />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="p-4 bg-red-800/80 text-white rounded max-w-md text-center">
            <p className="text-lg font-bold mb-2">Error</p>
            <p>{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-white text-red-800 rounded"
              onClick={() => {
                setError(null);
                startCamera();
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleCameraView;
