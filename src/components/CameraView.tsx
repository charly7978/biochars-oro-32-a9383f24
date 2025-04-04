import React, { useRef, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { CameraState, setCameraState, trackDeviceError } from '@/utils/deviceErrorTracker';
import { unifiedFingerDetector } from '@/modules/signal-processing/utils/unified-finger-detector';

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
            logError(`Error en elemento video: ${e.type}`, ErrorLevel.ERROR, "CameraView");
            streamErrorRef.current = true;
            handleCameraError(e);
          };
        } catch (err) {
          throw new Error(`Error al configurar video: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Agregar listener para detectar cuando un track termina inesperadamente
      videoTrack.onended = () => {
        logError("Video track terminado inesperadamente", ErrorLevel.WARNING, "CameraView");
        streamErrorRef.current = true;
        handleCameraError(new Error("Video track terminado inesperadamente"));
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
      trackDeviceError(err);
      handleCameraError(err);
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
        unifiedFingerDetector.updateSource(
          'brightness', 
          avgBrightness < 60, // Oscuro sugiere presencia de dedo
          Math.min(1.0, Math.max(0.0, (120 - avgBrightness) / 120))
        );
        
        // Verificar si el video sigue reproduciéndose correctamente
        if (videoRef.current && (videoRef.current.paused || videoRef.current.ended)) {
          logError("Video pausado o terminado inesperadamente", ErrorLevel.WARNING, "CameraView");
          streamErrorRef.current = true;
          handleCameraError(new Error("Video pausado o terminado"));
        }
      } catch (err) {
        logError(`Error al verificar brillo: ${err instanceof Error ? err.message : String(err)}`, 
          ErrorLevel.ERROR, "CameraView");
        streamErrorRef.current = true;
      }
    };

    const interval = setInterval(checkBrightness, 500);
    
    // Health check para el stream
    const healthCheck = setInterval(() => {
      // Verificar que el stream sigue activo
      if (stream) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
          logError("Estado de video track no válido", ErrorLevel.WARNING, "CameraView");
          streamErrorRef.current = true;
          handleCameraError(new Error("Video track no válido"));
        }
      }
      
      // Si hay error de stream pero no se ha reiniciado, intentar reiniciar
      if (streamErrorRef.current && isMonitoring) {
        logError("Reiniciando cámara tras error detectado por health check", 
          ErrorLevel.WARNING, "CameraView");
        
        stopCamera().then(() => startCamera());
        streamErrorRef.current = false;
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
      clearInterval(healthCheck);
    };
  }, [stream, isMonitoring, isFingerDetected, signalQuality, brightnessSamples, retryCount]);

  // Gestión principal de la cámara
  useEffect(() => {
    if (isMonitoring && !stream) {
      startCamera();
    } else if (!isMonitoring && stream) {
      stopCamera();
    }
    
    return () => {
      logError("CameraView component unmounting, stopping camera", ErrorLevel.INFO, "CameraView");
      stopCamera();
    };
  }, [isMonitoring]);

  // Determine actual finger status using both provided detection and brightness
  const actualFingerStatus = isFingerDetected && (
    avgBrightness < 60 || // Dark means finger is likely present
    signalQuality > 50    // Good quality signal confirms finger
  );
  
  // Actualizar detector unificado con nuestra conclusión sobre el dedo
  useEffect(() => {
    if (isMonitoring) {
      unifiedFingerDetector.updateSource(
        'camera-analysis', 
        actualFingerStatus,
        signalQuality ? (signalQuality / 100) : 0.5
      );
    }
  }, [actualFingerStatus, signalQuality, isMonitoring]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 min-w-full min-h-full w-auto h-auto z-0 object-cover"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      />
      
      {/* Error de cámara */}
      {cameraError && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30 p-4">
          <div className="bg-red-900/80 p-4 rounded-lg text-white max-w-md text-center">
            <h3 className="text-lg font-semibold mb-2">Error de cámara</h3>
            <p className="mb-4">{cameraError}</p>
            <p className="text-sm opacity-80">
              {retryCount < maxRetryAttempts 
                ? `Reintentando (${retryCount}/${maxRetryAttempts})...` 
                : "Reintento fallido, compruebe los permisos de la cámara."}
            </p>
          </div>
        </div>
      )}
      
      {isMonitoring && buttonPosition && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <Fingerprint
            size={48}
            className={`transition-colors duration-300 ${
              !actualFingerStatus ? 'text-gray-400' :
              signalQuality > 75 ? 'text-green-500' :
              signalQuality > 50 ? 'text-yellow-500' :
              'text-red-500'
            }`}
          />
          <span className={`text-xs mt-2 transition-colors duration-300 ${
            actualFingerStatus ? 'text-green-500' : 'text-gray-400'
          }`}>
            {actualFingerStatus ? "dedo detectado" : "ubique su dedo en el lente"}
          </span>
        </div>
      )}
    </>
  );
};

export default CameraView;
