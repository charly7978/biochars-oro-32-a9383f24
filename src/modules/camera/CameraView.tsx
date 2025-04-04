import React, { useRef, useEffect, useState, useCallback } from 'react';
import { configureCameraForDevice, processFramesControlled } from './CameraFrameCapture';
import { logError, ErrorLevel } from '@/utils/debugUtils';

interface CameraViewProps {
  onStreamReady?: (stream: MediaStream) => void;
  onFrameProcessed?: (imageData: ImageData) => void;
  isMonitoring: boolean;
  isFingerDetected?: boolean;
  signalQuality?: number;
  frameRate?: number;
}

interface ImageCapture {
  grabFrame(): Promise<ImageBitmap>;
}

// Extending global Window interface to include ImageCapture constructor
declare global {
  interface Window {
    ImageCapture: {
      new(track: MediaStreamTrack): ImageCapture;
    };
  }
}

const CameraView: React.FC<CameraViewProps> = ({ 
  onStreamReady, 
  onFrameProcessed,
  isMonitoring, 
  isFingerDetected = false, 
  signalQuality = 0,
  frameRate = 30
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const retryAttemptsRef = useRef<number>(0);
  const maxRetryAttempts = 3;
  const processingCallbackRef = useRef<((imageData: ImageData) => void) | null>(null);
  const frameProcessorRef = useRef<(() => void) | null>(null);
  const lastTrackErrorTimeRef = useRef<number>(0);
  const trackErrorCountRef = useRef<number>(0);
  const trackRestartThrottleMs = 2000; // Prevent rapid restarts

  useEffect(() => {
    processingCallbackRef.current = onFrameProcessed || null;
  }, [onFrameProcessed]);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const androidDetected = /android/i.test(userAgent);
    const iosDetected = /ipad|iphone|ipod/i.test(userAgent);
    
    console.log("Plataforma detectada:", {
      userAgent,
      isAndroid: androidDetected,
      isIOS: iosDetected,
      isMobile: /mobile|android|iphone|ipad|ipod/i.test(userAgent)
    });
    
    setIsAndroid(androidDetected);
    setIsIOS(iosDetected);
  }, []);

  const stopCamera = async (): Promise<void> => {
    if (frameProcessorRef.current) {
      frameProcessorRef.current();
      frameProcessorRef.current = null;
    }
    
    if (stream) {
      logError("Stopping camera stream and turning off torch", ErrorLevel.INFO, "CameraView");
      stream.getTracks().forEach(track => {
        try {
          if (track.kind === 'video' && track.getCapabilities()?.torch) {
            track.applyConstraints({
              advanced: [{ torch: false }]
            }).catch(err => logError("Error desactivando linterna: " + err, ErrorLevel.WARNING, "CameraView"));
          }
          
          track.stop();
        } catch (err) {
          logError("Error al detener track: " + err, ErrorLevel.ERROR, "CameraView");
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setStream(null);
      setTorchEnabled(false);
      retryAttemptsRef.current = 0;
      trackErrorCountRef.current = 0;
    }
  };

  const restartCameraProcessing = useCallback(async (): Promise<void> => {
    const now = Date.now();
    
    // Evitar reintentos demasiado frecuentes
    if (now - lastTrackErrorTimeRef.current < trackRestartThrottleMs) {
      return;
    }
    
    lastTrackErrorTimeRef.current = now;
    trackErrorCountRef.current++;
    
    logError(`Reiniciando procesamiento de cámara después de error de track (intento ${trackErrorCountRef.current})`, 
      ErrorLevel.WARNING, "CameraView");
    
    if (stream && processingCallbackRef.current) {
      // Verificar si el track está activo
      const videoTrack = stream.getVideoTracks()[0];
      
      if (!videoTrack || videoTrack.readyState !== 'live') {
        logError("El track de video no está activo, reiniciando cámara", ErrorLevel.WARNING, "CameraView");
        
        // Si el track no está activo, reiniciar completamente
        await stopCamera();
        setTimeout(() => {
          if (isMonitoring) {
            startCamera();
          }
        }, 500);
        return;
      }
      
      try {
        // Intentar reiniciar solo el procesamiento sin detener la cámara
        if (frameProcessorRef.current) {
          frameProcessorRef.current();
        }
        
        if (typeof window.ImageCapture !== 'undefined') {
          const imageCapture = new window.ImageCapture(videoTrack);
          frameProcessorRef.current = processFramesControlled(
            imageCapture,
            isMonitoring,
            frameRate,
            processingCallbackRef.current
          );
          
          logError("Procesamiento de frames reiniciado correctamente", ErrorLevel.INFO, "CameraView");
        }
      } catch (err) {
        logError(`Error al reiniciar procesamiento: ${err}`, ErrorLevel.ERROR, "CameraView");
        
        // Si no podemos reiniciar el procesamiento, reiniciar completamente
        if (trackErrorCountRef.current > 3) {
          logError("Demasiados errores de track consecutivos, reiniciando cámara", ErrorLevel.WARNING, "CameraView");
          await stopCamera();
          setTimeout(() => {
            if (isMonitoring) {
              startCamera();
            }
          }, 1000);
        }
      }
    }
  }, [stream, frameRate, isMonitoring, stopCamera]);

  const startCamera = async (): Promise<void> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia no está soportado");
      }

      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      const baseVideoConstraints: MediaTrackConstraints = {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      };

      if (isAndroid) {
        logError("Configurando para Android", ErrorLevel.INFO, "CameraView");
        Object.assign(baseVideoConstraints, {
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        });
      } else if (isIOS) {
        logError("Configurando para iOS", ErrorLevel.INFO, "CameraView");
        Object.assign(baseVideoConstraints, {
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        });
      } else {
        logError("Configurando para escritorio con máxima resolución", ErrorLevel.INFO, "CameraView");
        Object.assign(baseVideoConstraints, {
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        });
      }

      const constraints: MediaStreamConstraints = {
        video: baseVideoConstraints,
        audio: false
      };

      logError("Intentando acceder a la cámara con configuración: " + JSON.stringify(constraints), ErrorLevel.INFO, "CameraView");
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      logError("Cámara inicializada correctamente", ErrorLevel.INFO, "CameraView");
      
      const videoTrack = newStream.getVideoTracks()[0];

      if (videoTrack) {
        await configureCameraForDevice(videoTrack, isAndroid, isIOS);
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.style.willChange = 'transform';
          videoRef.current.style.transform = 'translateZ(0)';
          videoRef.current.style.imageRendering = 'crisp-edges';
          videoRef.current.style.backfaceVisibility = 'hidden';
          videoRef.current.style.perspective = '1000px';
        }

        videoTrack.onended = () => {
          logError("Video track terminado inesperadamente", ErrorLevel.WARNING, "CameraView");
          restartCameraProcessing();
        };
        
        videoTrack.onerror = (event) => {
          logError(`Error en video track: ${event.type}`, ErrorLevel.ERROR, "CameraView");
          restartCameraProcessing();
        };

        setStream(newStream);
        
        if (processingCallbackRef.current && typeof window.ImageCapture !== 'undefined') {
          const imageCapture = new window.ImageCapture(videoTrack);
          
          if (frameProcessorRef.current) {
            frameProcessorRef.current();
          }
          
          frameProcessorRef.current = processFramesControlled(
            imageCapture,
            isMonitoring,
            frameRate,
            processingCallbackRef.current
          );
        }
        
        if (onStreamReady) {
          onStreamReady(newStream);
        }
        
        retryAttemptsRef.current = 0;
        trackErrorCountRef.current = 0;
      }
    } catch (err) {
      logError("Error al iniciar la cámara: " + err, ErrorLevel.ERROR, "CameraView");
      
      retryAttemptsRef.current++;
      if (retryAttemptsRef.current <= maxRetryAttempts) {
        logError(`Reintentando iniciar cámara (intento ${retryAttemptsRef.current} de ${maxRetryAttempts})...`, ErrorLevel.WARNING, "CameraView");
        setTimeout(startCamera, 1000);
      } else {
        logError(`Se alcanzó el máximo de ${maxRetryAttempts} intentos sin éxito`, ErrorLevel.ERROR, "CameraView");
      }
    }
  };

  const refreshAutoFocus = useCallback(async (): Promise<void> => {
    if (stream && !isFocusing && !isAndroid) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities()?.focusMode) {
        try {
          setIsFocusing(true);
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'manual' }]
          });
          await new Promise(resolve => setTimeout(resolve, 100));
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
          logError("Auto-enfoque refrescado con éxito", ErrorLevel.INFO, "CameraView");
        } catch (err) {
          logError("Error al refrescar auto-enfoque: " + err, ErrorLevel.ERROR, "CameraView");
        } finally {
          setIsFocusing(false);
        }
      }
    }
  }, [stream, isFocusing, isAndroid]);

  const handleStreamReady = useCallback((newStream: MediaStream): void => {
    if (!isMonitoring) return;
    
    const videoTrack = newStream.getVideoTracks()[0];
    
    if (typeof window !== 'undefined' && 'ImageCapture' in window) {
      const imageCapture = new window.ImageCapture(videoTrack);
      
      if (frameProcessorRef.current) {
        frameProcessorRef.current();
      }
      
      if (processingCallbackRef.current) {
        frameProcessorRef.current = processFramesControlled(
          imageCapture,
          isMonitoring,
          frameRate,
          processingCallbackRef.current
        );
      }
    } else {
      console.warn("ImageCapture API not supported in this browser");
    }
    
    if (onStreamReady) {
      onStreamReady(newStream);
    }
  }, [isMonitoring, frameRate, onStreamReady]);

  useEffect(() => {
    if (isMonitoring && !stream) {
      logError("Starting camera because isMonitoring=true", ErrorLevel.INFO, "CameraView");
      startCamera();
    } else if (!isMonitoring && stream) {
      logError("Stopping camera because isMonitoring=false", ErrorLevel.INFO, "CameraView");
      stopCamera();
    }
    
    return () => {
      logError("CameraView component unmounting, stopping camera", ErrorLevel.INFO, "CameraView");
      stopCamera();
    };
  }, [isMonitoring, stream]);

  useEffect(() => {
    if (stream && isFingerDetected && !torchEnabled) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities()?.torch) {
        logError("Activando linterna después de detectar dedo", ErrorLevel.INFO, "CameraView");
        videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        }).then(() => {
          setTorchEnabled(true);
        }).catch(err => {
          logError("Error activando linterna: " + err, ErrorLevel.ERROR, "CameraView");
        });
      }
    }
    
    if (isFingerDetected && !isAndroid) {
      const focusInterval = setInterval(refreshAutoFocus, 5000);
      return () => clearInterval(focusInterval);
    }
    
    return () => {};
  }, [stream, isFingerDetected, torchEnabled, refreshAutoFocus, isAndroid]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute top-0 left-0 min-w-full min-h-full w-auto h-auto z-0 object-cover"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        imageRendering: 'crisp-edges'
      }}
    />
  );
};

export default CameraView;
