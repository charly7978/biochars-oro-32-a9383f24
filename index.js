import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import ArrhythmiaVisualizer from "@/components/ArrhythmiaVisualizer";
import MeasurementConfirmationDialog from "@/components/MeasurementConfirmationDialog";
import { toast } from "sonner";
import { initializeErrorTracking, logError, ErrorLevel } from "@/utils/debugUtils";
import { initializeErrorPreventionSystem } from "@/utils/errorPrevention";
import { handleCameraError, setCameraState, CameraState } from "@/utils/deviceErrorTracker";

const Index = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);
  const [vitalSigns, setVitalSigns] = useState({ 
    spo2: 0, 
    pressure: "--/--",
    arrhythmiaStatus: "--" 
  });
  const [heartRate, setHeartRate] = useState(0);
  const [arrhythmiaCount, setArrhythmiaCount] = useState("--");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rrIntervals, setRRIntervals] = useState<number[]>([]);
  const measurementTimerRef = useRef(null);
  const cameraRecoveryTimerRef = useRef(null);
  
  const { startProcessing, stopProcessing, lastSignal, processFrame } = useSignalProcessor();
  const { processSignal: processHeartBeat } = useHeartBeatProcessor();
  const { processSignal: processVitalSigns, reset: resetVitalSigns } = useVitalSignsProcessor();

  useEffect(() => {
    initializeErrorTracking({
      verbose: false,
      setupGlobalHandlers: true
    });
    
    const cleanupErrorPrevention = initializeErrorPreventionSystem();
    
    logError("Application initialized", ErrorLevel.INFO, "App");
    
    return () => {
      cleanupErrorPrevention();
      logError("Application cleanup", ErrorLevel.INFO, "App");
    };
  }, []);

  const enterFullScreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen({ navigationUI: "hide" });
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen({ navigationUI: "hide" });
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen({ navigationUI: "hide" });
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen({ navigationUI: "hide" });
      }
      
      if (window.navigator.userAgent.match(/Android/i)) {
        if (window.AndroidFullScreen) {
          window.AndroidFullScreen.immersiveMode(
            function() { logError('Immersive mode enabled', ErrorLevel.INFO, 'FullScreen'); },
            function(error) { logError('Failed to enable immersive mode: ' + error, ErrorLevel.WARNING, 'FullScreen'); }
          );
        }
      }
    } catch (err) {
      logError('Error al entrar en pantalla completa: ' + err, ErrorLevel.WARNING, 'FullScreen', { error: err });
    }
  };

  useEffect(() => {
    const preventScroll = (e) => e.preventDefault();
    
    const lockOrientation = async () => {
      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock('portrait');
        }
      } catch (error) {
        logError('No se pudo bloquear la orientación: ' + error, ErrorLevel.WARNING, 'Orientation', { error });
      }
    };
    
    const setMaxResolution = () => {
      try {
        if ('devicePixelRatio' in window && window.devicePixelRatio !== 1) {
          document.body.style.zoom = 1 / window.devicePixelRatio;
        }
      } catch (error) {
        logError('Error setting resolution: ' + error, ErrorLevel.WARNING, 'Resolution', { error });
      }
    };
    
    lockOrientation();
    setMaxResolution();
    enterFullScreen();
    
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.addEventListener('scroll', preventScroll, { passive: false });
    document.body.addEventListener('touchstart', preventScroll, { passive: false });
    document.body.addEventListener('gesturestart', preventScroll, { passive: false });
    document.body.addEventListener('gesturechange', preventScroll, { passive: false });
    document.body.addEventListener('gestureend', preventScroll, { passive: false });
    
    window.addEventListener('orientationchange', enterFullScreen);
    
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        setTimeout(enterFullScreen, 1000);
      }
    });

    return () => {
      document.body.removeEventListener('touchmove', preventScroll);
      document.body.removeEventListener('scroll', preventScroll);
      document.body.removeEventListener('touchstart', preventScroll);
      document.body.removeEventListener('gesturestart', preventScroll);
      document.body.removeEventListener('gesturechange', preventScroll);
      document.body.removeEventListener('gestureend', preventScroll);
      window.removeEventListener('orientationchange', enterFullScreen);
      document.removeEventListener('fullscreenchange', enterFullScreen);
      
      if (measurementTimerRef.current) {
        clearInterval(measurementTimerRef.current);
      }
      if (cameraRecoveryTimerRef.current) {
        clearTimeout(cameraRecoveryTimerRef.current);
      }
    };
  }, []);

  const startMonitoring = () => {
    enterFullScreen();
    setIsMonitoring(true);
    setIsCameraOn(true);
    setCameraState(CameraState.REQUESTING);
    startProcessing();
    setElapsedTime(0);
    setRRIntervals([]);
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
    }
    
    measurementTimerRef.current = window.setInterval(() => {
      setElapsedTime(prev => {
        if (prev >= 30) {
          stopMonitoring();
          return 30;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const showMeasurementConfirmation = () => {
    setShowConfirmDialog(true);
  };

  const confirmMeasurement = () => {
    setShowConfirmDialog(false);
    completeMonitoring();
  };

  const cancelMeasurement = () => {
    setShowConfirmDialog(false);
    stopMonitoring();
  };

  const completeMonitoring = () => {
    setIsMonitoring(false);
    setIsCameraOn(false);
    setCameraState(CameraState.INACTIVE);
    stopProcessing();
    resetVitalSigns();
    setElapsedTime(0);
    setHeartRate(0);
    setVitalSigns({ 
      spo2: 0, 
      pressure: "--/--",
      arrhythmiaStatus: "--" 
    });
    setArrhythmiaCount("--");
    setSignalQuality(0);
    setRRIntervals([]);
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    setIsCameraOn(false);
    setCameraState(CameraState.INACTIVE);
    stopProcessing();
    resetVitalSigns();
    setElapsedTime(0);
    setHeartRate(0);
    setVitalSigns({ 
      spo2: 0, 
      pressure: "--/--",
      arrhythmiaStatus: "--" 
    });
    setArrhythmiaCount("--");
    setSignalQuality(0);
    setRRIntervals([]);
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    if (cameraRecoveryTimerRef.current) {
      clearTimeout(cameraRecoveryTimerRef.current);
      cameraRecoveryTimerRef.current = null;
    }
  };

  const handleStreamReady = (stream) => {
    if (!isMonitoring) return;
    
    try {
      setCameraState(CameraState.ACTIVE);
      
      const videoTrack = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(videoTrack);
      
      const capabilities = videoTrack.getCapabilities();
      if (capabilities.width && capabilities.height) {
        const maxWidth = capabilities.width.max;
        const maxHeight = capabilities.height.max;
        
        videoTrack.applyConstraints({
          width: { ideal: maxWidth },
          height: { ideal: maxHeight },
          torch: true
        }).catch(err => {
          logError("Error applying high resolution configuration", ErrorLevel.WARNING, "Camera", { error: err });
          
          videoTrack.applyConstraints({
            torch: true
          }).catch(innerErr => {
            logError("Error applying minimal camera configuration", ErrorLevel.ERROR, "Camera", { error: innerErr });
          });
        });
      } else if (videoTrack.getCapabilities()?.torch) {
        videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        }).catch(err => {
          logError("Error activating torch", ErrorLevel.WARNING, "Camera", { error: err });
        });
      }
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        logError("No se pudo obtener el contexto 2D", ErrorLevel.ERROR, "Camera");
        return;
      }
      
      const processImage = async () => {
        if (!isMonitoring) return;
        
        try {
          const frame = await imageCapture.grabFrame();
          tempCanvas.width = frame.width;
          tempCanvas.height = frame.height;
          tempCtx.drawImage(frame, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, frame.width, frame.height);
          processFrame(imageData);
          
          if (isMonitoring) {
            requestAnimationFrame(processImage);
          }
        } catch (error) {
          const { errorDetails, shouldRetry, recoveryAction } = handleCameraError(error, {
            label: videoTrack.label,
            deviceId: videoTrack.getSettings().deviceId
          });
          
          if (shouldRetry && recoveryAction && isMonitoring) {
            if (cameraRecoveryTimerRef.current) {
              clearTimeout(cameraRecoveryTimerRef.current);
            }
            
            cameraRecoveryTimerRef.current = setTimeout(async () => {
              if (isMonitoring) {
                try {
                  await recoveryAction();
                  setCameraState(CameraState.REQUESTING);
                } catch (recoveryError) {
                  logError("Recovery action failed", ErrorLevel.ERROR, "Camera", { error: recoveryError });
                }
              }
            }, 1000);
          } else if (isMonitoring) {
            requestAnimationFrame(processImage);
          }
        }
      };

      processImage();
    } catch (error) {
      logError("Error during stream setup", ErrorLevel.ERROR, "Camera", { error });
      setCameraState(CameraState.ERROR);
    }
  };

  useEffect(() => {
    if (lastSignal && lastSignal.fingerDetected && isMonitoring) {
      try {
        const heartBeatResult = processHeartBeat(lastSignal.filteredValue);
        setHeartRate(heartBeatResult.bpm);
        
        if (heartBeatResult.rrData && heartBeatResult.rrData.intervals) {
          setRRIntervals(prev => {
            const newIntervals = [...prev];
            if (heartBeatResult.rrData && heartBeatResult.rrData.intervals && heartBeatResult.rrData.intervals.length > 0) {
              newIntervals.push(...heartBeatResult.rrData.intervals);
            }
            return newIntervals.slice(-20);
          });
        }
        
        const vitals = processVitalSigns(lastSignal.filteredValue, heartBeatResult.rrData);
        if (vitals) {
          setVitalSigns(vitals);
          setArrhythmiaCount(vitals.arrhythmiaStatus.split('|')[1] || "--");
        }
        
        setSignalQuality(lastSignal.quality);
      } catch (error) {
        logError(
          "Error processing signal data", 
          ErrorLevel.ERROR, 
          "SignalProcessing", 
          { error, lastSignalState: lastSignal }
        );
      }
    }
  }, [lastSignal, isMonitoring, processHeartBeat, processVitalSigns]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black" 
      style={{ 
        height: '100%',
        width: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        touchAction: 'none',
        userSelect: 'none',
      }}>
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <CameraView 
            onStreamReady={handleStreamReady}
            isMonitoring={isCameraOn}
            isFingerDetected={lastSignal?.fingerDetected}
            signalQuality={signalQuality}
          />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          <div className="flex-1">
            <PPGSignalMeter 
              value={lastSignal?.filteredValue || 0}
              quality={lastSignal?.quality || 0}
              fingerDetected={lastSignal?.fingerDetected || false}
              showBeats={isMonitoring}
            />
          </div>

          <div className="bg-black bg-opacity-70 p-4 rounded-t-xl">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <VitalSign label="SpO₂" value={vitalSigns.spo2} unit="%" />
              <VitalSign label="Presión" value={vitalSigns.pressure} unit="" />
              <VitalSign label="Frecuencia" value={heartRate} unit="BPM" />
              <VitalSign label="Calidad" value={signalQuality} unit="%" />
            </div>
            
            <div className="mb-4">
              <ArrhythmiaVisualizer 
                arrhythmiaCount={arrhythmiaCount}
                arrhythmiaStatus={vitalSigns.arrhythmiaStatus}
                latestRRIntervals={rrIntervals}
                heartRate={heartRate}
                quality={signalQuality}
              />
            </div>

            <div className="flex justify-center">
              {!isMonitoring ? (
                <button
                  className="bg-green-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition-colors"
                  onClick={startMonitoring}
                >
                  Iniciar Medición
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-white mb-2">
                    Tiempo: {elapsedTime} segundos
                  </div>
                  <div className="flex space-x-4">
                    <button
                      className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:bg-red-600 transition-colors"
                      onClick={stopMonitoring}
                    >
                      Cancelar
                    </button>
                    <button
                      className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:bg-blue-600 transition-colors"
                      onClick={showMeasurementConfirmation}
                    >
                      Completar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MeasurementConfirmationDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmMeasurement}
        onCancel={cancelMeasurement}
        vitalSigns={{
          spo2: vitalSigns.spo2,
          pressure: vitalSigns.pressure,
          heartRate,
          arrhythmiaStatus: vitalSigns.arrhythmiaStatus
        }}
      />
    </div>
  );
};

export default Index;
