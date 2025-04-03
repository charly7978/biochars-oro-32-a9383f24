
import React, { useRef, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { logError, ErrorLevel } from '@/utils/debugUtils';
import { CameraState, setCameraState, trackDeviceError } from '@/utils/deviceErrorTracker';

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
  const brightnessSampleLimit = 10;

  const stopCamera = async (): Promise<void> => {
    if (stream) {
      try {
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        setStream(null);
        setCameraState(CameraState.INACTIVE);
        logError("Cámara detenida", ErrorLevel.INFO, "CameraView");
      } catch (err) {
        logError(`Error al detener la cámara: ${err instanceof Error ? err.message : String(err)}`, 
                ErrorLevel.ERROR, 
                "CameraView");
      }
    }
  };

  const startCamera = async (): Promise<void> => {
    try {
      // First make sure any previous stream is properly stopped
      await stopCamera();
      
      setCameraState(CameraState.REQUESTING);
      
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

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];

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

          // Try to enable flash if available
          if (capabilities.torch) {
            try {
              await videoTrack.applyConstraints({
                advanced: [{ torch: true }]
              });
              console.log("Linterna activada para mejorar detección");
            } catch (torchErr) {
              console.warn("No se pudo activar la linterna:", torchErr);
            }
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

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        if (isAndroid) {
          videoRef.current.style.willChange = 'transform';
          videoRef.current.style.transform = 'translateZ(0)';
        }
      }

      setStream(newStream);
      setCameraState(CameraState.ACTIVE);
      
      if (onStreamReady) {
        onStreamReady(newStream);
      }
      
      logError("Cámara iniciada correctamente", ErrorLevel.INFO, "CameraView");
    } catch (err) {
      setCameraState(CameraState.ERROR);
      trackDeviceError(err);
      logError(
        `Error al iniciar la cámara: ${err instanceof Error ? err.message : String(err)}`,
        ErrorLevel.ERROR,
        "CameraView"
      );
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
        
        console.log("CameraView: Brightness check", { 
          currentBrightness: brightness,
          avgBrightness,
          fingerDetected: isFingerDetected,
          signalQuality
        });
      } catch (err) {
        console.error("Error checking brightness:", err);
      }
    };

    const interval = setInterval(checkBrightness, 500);
    return () => clearInterval(interval);
  }, [stream, isMonitoring, isFingerDetected, signalQuality, brightnessSamples]);

  useEffect(() => {
    if (isMonitoring && !stream) {
      startCamera();
    } else if (!isMonitoring && stream) {
      stopCamera();
    }
    
    // Clean up on unmount
    return () => {
      logError("CameraView component unmounting, stopping camera", ErrorLevel.INFO, "CameraView");
      stopCamera();
    };
  }, [isMonitoring, stream]);

  // Determine actual finger status using both provided detection and brightness
  const actualFingerStatus = isFingerDetected && (
    avgBrightness < 90 || // Dark means finger is likely present - increased threshold from 60 to 90
    signalQuality > 30    // Good quality signal confirms finger - decreased threshold from 50 to 30
  );

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
      {isMonitoring && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <Fingerprint
            size={48}
            className={`transition-colors duration-300 ${
              !actualFingerStatus ? 'text-gray-400' :
              signalQuality > 60 ? 'text-green-500' :
              signalQuality > 30 ? 'text-yellow-500' :
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
