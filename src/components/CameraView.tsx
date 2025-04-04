import React, { useRef, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { CameraState, setCameraState } from '@/utils/deviceErrorTracker';
import { updateDetectionSource } from '@/modules/signal-processing';

interface CameraViewProps {
  onStreamReady?: (stream: MediaStream) => void;
  isMonitoring: boolean;
  isFingerDetected?: boolean;
  signalQuality?: number;
  buttonPosition?: { x: number, y: number } | null;
}

const CameraView: React.FC<CameraViewProps> = ({ 
  onStreamReady, 
  isMonitoring, 
  isFingerDetected = false, 
  signalQuality = 0,
  buttonPosition 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [brightnessSamples, setBrightnessSamples] = useState<number[]>([]);
  const [avgBrightness, setAvgBrightness] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const brightnessSampleLimit = 10;
  const maxRetryAttempts = 3;
  const streamErrorRef = useRef<boolean>(false);

  const stopCamera = async (): Promise<void> => {
    if (stream) {
      try {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            logError(`Error al detener track: ${err instanceof Error ? err.message : String(err)}`, 
              ErrorLevel.WARNING, "CameraView");
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        setStream(null);
        setCameraState(CameraState.INACTIVE);
        logError("Cámara detenida correctamente", ErrorLevel.INFO, "CameraView");
      } catch (err) {
        logError(`Error al detener cámara: ${err instanceof Error ? err.message : String(err)}`, 
          ErrorLevel.ERROR, "CameraView");
      }
    }
  };

  const startCamera = async (): Promise<void> => {
    try {
      setCameraState(CameraState.REQUESTING);
      setCameraError(null);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia no está soportado");
      }

      const isAndroid = /android/i.test(navigator.userAgent);

      const baseVideoConstraints: MediaTrackConstraints = {
        facingMode: 'environment',
        width: { ideal: 720 },
        height: { ideal: 480 }
      };

      if (isAndroid) {
        Object.assign(baseVideoConstraints, {
          frameRate: { ideal: 25 },
          resizeMode: 'crop-and-scale'
        });
      }

      const constraints: MediaStreamConstraints = {
        video: baseVideoConstraints
      };

      logError("Intentando obtener acceso a la cámara...", ErrorLevel.INFO, "CameraView");
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];

      // Verificar que el track está realmente activo
      if (!videoTrack || videoTrack.readyState !== 'live') {
        throw new Error("Video track no está activo");
      }

      if (videoTrack && isAndroid) {
        try {
          const capabilities = videoTrack.getCapabilities();
          const advancedConstraints = [];
          
          if (capabilities.exposureMode) {
            advancedConstraints.push({ exposureMode: 'continuous' });
          }
          if (capabilities.focusMode) {
            advancedConstraints.push({ focusMode: 'continuous' });
          }
          if (capabilities.whiteBalanceMode) {
            advancedConstraints.push({ whiteBalanceMode: 'continuous' });
          }

          if (advancedConstraints.length > 0) {
            await videoTrack.applyConstraints({
              advanced: advancedConstraints
            });
          }

          if (videoRef.current) {
            videoRef.current.style.transform = 'translateZ(0)';
            videoRef.current.style.backfaceVisibility = 'hidden';
          }
        } catch (err) {
          logError(
            `No se pudieron aplicar algunas optimizaciones: ${err instanceof Error ? err.message : String(err)}`,
            ErrorLevel.WARNING,
            "CameraView"
          );
        }
      }

      // Configurar video elemento
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = newStream;
          
          if (isAndroid) {
            videoRef.current.style.willChange = 'transform';
            videoRef.current.style.transform = 'translateZ(0)';
          }
          
          // Agregar manejadores de errores para el video
          videoRef.current.onerror = (e) => {
            const eventType = e instanceof Event && 'type' in e ? e.type : 'unknown';
            logError(`Error en elemento video: ${eventType}`, ErrorLevel.ERROR, "CameraView");
            streamErrorRef.current = true;
            handleCameraError(eventType);
          };
        } catch (err) {
          throw new Error(`Error al configurar video: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Agregar listener para detectar cuando un track termina inesperadamente
      videoTrack.onended = () => {
        logError("Video track terminado inesperadamente", ErrorLevel.WARNING, "CameraView");
        streamErrorRef.current = true;
        handleCameraError("Video track terminado inesperadamente");
      };

      setStream(newStream);
      setCameraState(CameraState.ACTIVE);
      setRetryCount(0);
      streamErrorRef.current = false;
      
      if (onStreamReady) {
        onStreamReady(newStream);
      }
      
      logError("Cámara iniciada correctamente", ErrorLevel.INFO, "CameraView");
    } catch (err) {
      setCameraState(CameraState.ERROR);
      handleCameraError(err instanceof Error ? err.message : String(err));
    }
  };

  // Función para manejar errores de cámara
  const handleCameraError = (error: string | Event) => {
    const errorMessage = typeof error === 'string' 
      ? error 
      : (error instanceof Error ? error.message : 'Error desconocido');
    
    logError(`Error de cámara: ${errorMessage}`, ErrorLevel.ERROR, "CameraView");
    
    setCameraError(errorMessage);
    
    // Verificar si debemos reintentar
    if (retryCount < maxRetryAttempts && isMonitoring) {
      const nextRetryCount = retryCount + 1;
      setRetryCount(nextRetryCount);
      
      logError(`Reintentando iniciar cámara (${nextRetryCount}/${maxRetryAttempts})...`, 
        ErrorLevel.WARNING, "CameraView");
      
      // Esperar antes de reintentar (tiempo incremental)
      setTimeout(() => {
        // Verificar que seguimos necesitando la cámara
        if (isMonitoring) {
          startCamera();
        }
      }, 1000 * nextRetryCount); // Tiempo incremental: 1s, 2s, 3s...
    }
  };

  // Monitor camera brightness to help with finger detection verification
  useEffect(() => {
    if (!stream || !videoRef.current || !isMonitoring) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 100;
    canvas.height = 100;

    const checkBrightness = () => {
      if (!videoRef.current || !videoRef.current.videoWidth) return;
      
      try {
        ctx.drawImage(
          videoRef.current,
          0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight,
          0, 0, 100, 100
        );
        
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let brightness = 0;
        // Sample every 4th pixel to improve performance
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          brightness += (r + g + b) / 3;
        }
        
        brightness /= (data.length / 16);
        
        setBrightnessSamples(prev => {
          const newSamples = [...prev, brightness];
          if (newSamples.length > brightnessSampleLimit) {
            newSamples.shift();
          }
          return newSamples;
        });

        const avgBrightness = brightnessSamples.reduce((sum, val) => sum + val, 0) / 
                            Math.max(1, brightnessSamples.length);
        setAvgBrightness(avgBrightness);
        
        // Actualizar detector unificado con información de brillo
        updateDetectionSource(
          DetectionSource.CAMERA_ANALYSIS,
          avgBrightness > 50, // Indicar presencia potencial de dedo si brillo adecuado
          Math.min(1, avgBrightness / 200) // Confianza normalizada
        );
      } catch (error) {
        logError(`Error checking brightness: ${error}`, ErrorLevel.ERROR, "CameraView");
      }
    };

    const interval = setInterval(checkBrightness, 500);
    return () => clearInterval(interval);
  }, [stream, isMonitoring, brightnessSamples]);

  useEffect(() => {
    if (isMonitoring) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isMonitoring]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black w-full h-full flex items-center justify-center">
      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 p-4 z-20">
          <div className="bg-red-800/70 rounded-lg p-3 mb-2">
            <Fingerprint size={32} className="text-white" />
          </div>
          <p className="text-center font-medium">Error de cámara</p>
          <p className="text-center text-xs mt-1 max-w-[250px]">{cameraError}</p>
          {retryCount < maxRetryAttempts && (
            <p className="text-xs mt-2 text-gray-300">Reintentando automáticamente...</p>
          )}
        </div>
      ) : null}
      
      <video 
        ref={videoRef}
        autoPlay 
        playsInline
        muted
        className="min-w-full min-h-full object-cover"
      />
      
      {isMonitoring && (
        <div className="absolute bottom-2 left-2 bg-black/30 backdrop-blur-sm rounded px-2 py-1 text-xs text-white flex items-center">
          <div 
            className={`w-2 h-2 rounded-full mr-1.5 ${
              isFingerDetected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {isFingerDetected ? 'Dedo detectado' : 'Coloque su dedo'}
          {isFingerDetected && signalQuality && (
            <span className="ml-1.5">
              · Calidad: {Math.round(signalQuality)}%
            </span>
          )}
        </div>
      )}
      
      {buttonPosition && (
        <div 
          className="absolute w-16 h-16 rounded-full border-2 border-white/60 pointer-events-none"
          style={{
            top: buttonPosition.y - 32,
            left: buttonPosition.x - 32,
            boxShadow: '0 0 0 2px rgba(0,0,0,0.2)'
          }}
        />
      )}
      
      {/* Brightness indicator - only for development debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-1 rounded">
          Brillo: {Math.round(avgBrightness)}
        </div>
      )}
    </div>
  );
};

export default CameraView;
