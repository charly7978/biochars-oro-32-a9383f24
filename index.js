import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
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
              isFingerDetected={lastSignal?.fingerDetected || false}
              onStartMeasurement={startMonitoring}
              onReset={stopMonitoring}
              arrhythmiaStatus={vitalSigns.arrhythmiaStatus}
              rawArrhythmiaData={vitalSigns.lastArrhythmiaData}
            />
          </div>

          <div className="absolute bottom-[200px] left-0 right-0 px-4">
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4">
              <div className="grid grid-cols-4 gap-2">
                <VitalSign 
                  label="FRECUENCIA CARDÍACA"
                  value={heartRate || "--"}
                  unit="BPM"
                />
                <VitalSign 
                  label="SPO2"
                  value={vitalSigns.spo2 || "--"}
                  unit="%"
                />
                <VitalSign 
                  label="PRESIÓN ARTERIAL"
                  value={vitalSigns.pressure}
                  unit="mmHg"
                />
                <VitalSign 
                  label="ARRITMIAS"
                  value={vitalSigns.arrhythmiaStatus}
                />
              </div>
            </div>
          </div>

          {isMonitoring && (
            <div className="absolute bottom-40 left-0 right-0 text-center">
              <span className="text-xl font-medium text-gray-300">{elapsedTime}s / 30s</span>
            </div>
          )}

          <div className="h-[80px] grid grid-cols-2 gap-px bg-gray-900 mt-auto">
            <button 
              onClick={startMonitoring}
              className="w-full h-full bg-black/80 text-2xl font-bold text-white active:bg-gray-800"
            >
              INICIAR
            </button>
            <button 
              onClick={stopMonitoring}
              className="w-full h-full bg-black/80 text-2xl font-bold text-white active:bg-gray-800"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      <MeasurementConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={confirmMeasurement}
        onCancel={cancelMeasurement}
        measurementTime={elapsedTime}
        heartRate={heartRate}
        spo2={vitalSigns.spo2}
        pressure={vitalSigns.pressure}
      />
    </div>
  );
};

export default Index;
