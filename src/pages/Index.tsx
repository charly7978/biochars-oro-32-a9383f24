
import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import MonitorButton from "@/components/MonitorButton";
import AppTitle from "@/components/AppTitle";
import MonitoringPanel from "@/components/MonitoringPanel";
import { VitalSignsResult } from "@/modules/vital-signs";
import { logError, ErrorLevel } from "@/utils/debugUtils";

const Index = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);
  const [vitalSigns, setVitalSigns] = useState<VitalSignsResult>({
    spo2: 0,
    pressure: "--/--",
    arrhythmiaStatus: "--",
    glucose: 0,
    lipids: {
      totalCholesterol: 0,
      triglycerides: 0
    }
  });
  const [heartRate, setHeartRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showMonitorPanel, setShowMonitorPanel] = useState(false);
  const measurementTimerRef = useRef<number | null>(null);
  
  const { startProcessing, stopProcessing, lastSignal, processFrame } = useSignalProcessor();
  const { 
    processSignal: processHeartBeat, 
    isArrhythmia,
    startMonitoring: startHeartBeatMonitoring,
    stopMonitoring: stopHeartBeatMonitoring,
    reset: resetHeartBeatProcessor
  } = useHeartBeatProcessor();
  
  const { 
    processSignal: processVitalSigns, 
    reset: resetVitalSigns,
    fullReset: fullResetVitalSigns,
    lastValidResults,
    getPeakDetectionDiagnostics
  } = useVitalSignsProcessor();

  const enterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      logError('Error al entrar en pantalla completa:', ErrorLevel.ERROR, 'UI', err);
    }
  };

  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.addEventListener('scroll', preventScroll, { passive: false });

    return () => {
      document.body.removeEventListener('touchmove', preventScroll);
      document.body.removeEventListener('scroll', preventScroll);
    };
  }, []);

  useEffect(() => {
    if (lastValidResults && !isMonitoring) {
      setVitalSigns(lastValidResults);
      setShowResults(true);
    }
  }, [lastValidResults, isMonitoring]);

  useEffect(() => {
    if (lastSignal && isMonitoring) {
      const minQualityThreshold = 40;
      
      if (lastSignal.fingerDetected && lastSignal.quality >= minQualityThreshold) {
        // Log processing for debugging
        if (showMonitorPanel) {
          logError(`Procesando señal de calidad ${lastSignal.quality}`, ErrorLevel.DEBUG, 'SignalFlow');
        }
        
        try {
          const heartBeatResult = processHeartBeat(lastSignal.filteredValue);
          
          if (heartBeatResult.confidence > 0.4) {
            setHeartRate(heartBeatResult.bpm);
            
            const vitals = processVitalSigns(lastSignal.filteredValue, heartBeatResult.rrData);
            if (vitals) {
              setVitalSigns(vitals);
            }
          }
          
          setSignalQuality(lastSignal.quality);
        } catch (error) {
          logError('Error en procesamiento de señal:', ErrorLevel.ERROR, 'SignalProcessing', error);
        }
      } else {
        setSignalQuality(lastSignal.quality);
        
        if (!lastSignal.fingerDetected && heartRate > 0) {
          setHeartRate(0);
        }
      }
    } else if (!isMonitoring) {
      setSignalQuality(0);
    }
  }, [lastSignal, isMonitoring, processHeartBeat, processVitalSigns, heartRate, showMonitorPanel]);

  const startMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      enterFullScreen();
      setIsMonitoring(true);
      setIsCameraOn(true);
      setShowResults(false);
      setHeartRate(0);
      
      try {
        startProcessing();
        startHeartBeatMonitoring();
        logError('Iniciando monitoreo de signos vitales', ErrorLevel.INFO, 'Monitoring');
      } catch (error) {
        logError('Error al iniciar monitoreo:', ErrorLevel.ERROR, 'Monitoring', error);
      }
      
      setElapsedTime(0);
      
      if (measurementTimerRef.current) {
        clearInterval(measurementTimerRef.current);
      }
      
      measurementTimerRef.current = window.setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          console.log(`Tiempo transcurrido: ${newTime}s`);
          
          if (newTime >= 30) {
            finalizeMeasurement();
            return 30;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const finalizeMeasurement = () => {
    logError("Finalizando medición", ErrorLevel.INFO, 'Monitoring');
    
    setIsMonitoring(false);
    setIsCameraOn(false);
    
    try {
      stopProcessing();
      stopHeartBeatMonitoring();
    } catch (error) {
      logError('Error al detener procesamiento:', ErrorLevel.ERROR, 'Monitoring', error);
    }
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    const savedResults = resetVitalSigns();
    if (savedResults) {
      setVitalSigns(savedResults);
      setShowResults(true);
    }
    
    setElapsedTime(0);
    setSignalQuality(0);
    setHeartRate(0);
  };

  const handleReset = () => {
    logError("Reseteando completamente la aplicación", ErrorLevel.INFO, 'System');
    setIsMonitoring(false);
    setIsCameraOn(false);
    setShowResults(false);
    
    try {
      stopProcessing();
      stopHeartBeatMonitoring();
      resetHeartBeatProcessor();
    } catch (error) {
      logError('Error al resetear:', ErrorLevel.ERROR, 'System', error);
    }
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    fullResetVitalSigns();
    setElapsedTime(0);
    setHeartRate(0);
    setVitalSigns({ 
      spo2: 0, 
      pressure: "--/--",
      arrhythmiaStatus: "--",
      glucose: 0,
      lipids: {
        totalCholesterol: 0,
        triglycerides: 0
      }
    });
    setSignalQuality(0);
  };

  const handleStreamReady = (stream: MediaStream) => {
    if (!isMonitoring) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    
    if (typeof window !== 'undefined' && 'ImageCapture' in window) {
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      
      if (videoTrack.getCapabilities()?.torch) {
        logError("Activando linterna para mejorar la señal PPG", ErrorLevel.INFO, 'Camera');
        videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        }).catch(err => logError("Error activando linterna:", ErrorLevel.ERROR, 'Camera', err));
      } else {
        logError("Esta cámara no tiene linterna disponible, la medición puede ser menos precisa", 
          ErrorLevel.WARNING, 'Camera');
      }
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', {willReadFrequently: true});
      if (!tempCtx) {
        logError("No se pudo obtener el contexto 2D", ErrorLevel.ERROR, 'Canvas');
        return;
      }
      
      let lastProcessTime = 0;
      const targetFrameInterval = 1000/30;
      let frameCount = 0;
      let lastFpsUpdateTime = Date.now();
      let processingFps = 0;
      
      const processImage = async () => {
        if (!isMonitoring) return;
        
        const now = Date.now();
        const timeSinceLastProcess = now - lastProcessTime;
        
        if (timeSinceLastProcess >= targetFrameInterval) {
          try {
            const frame = await imageCapture.grabFrame();
            
            const targetWidth = Math.min(320, frame.width);
            const targetHeight = Math.min(240, frame.height);
            
            tempCanvas.width = targetWidth;
            tempCanvas.height = targetHeight;
            
            tempCtx.drawImage(
              frame, 
              0, 0, frame.width, frame.height, 
              0, 0, targetWidth, targetHeight
            );
            
            const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
            processFrame(imageData);
            
            frameCount++;
            lastProcessTime = now;
            
            if (now - lastFpsUpdateTime > 1000) {
              processingFps = frameCount;
              frameCount = 0;
              lastFpsUpdateTime = now;
              if (showMonitorPanel) {
                logError(`Rendimiento de procesamiento: ${processingFps} FPS`, 
                  ErrorLevel.INFO, 'Performance');
              }
            }
          } catch (error) {
            logError("Error capturando frame:", ErrorLevel.ERROR, 'Camera', error);
          }
        }
        
        if (isMonitoring) {
          requestAnimationFrame(processImage);
        }
      };

      processImage();
    } else {
      logError("ImageCapture API is not supported in this browser", ErrorLevel.ERROR, 'Browser');
    }
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      startMonitoring();
    }
  };
  
  const toggleMonitoringPanel = () => {
    setShowMonitorPanel(prev => !prev);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black" style={{ 
      height: '100vh',
      width: '100vw',
      maxWidth: '100vw',
      maxHeight: '100vh',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)'
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
          <div className="px-4 py-2 flex justify-around items-center bg-black/20">
            <div className="text-white text-lg">
              Calidad: {signalQuality}
            </div>
            <div className="text-white text-lg">
              {lastSignal?.fingerDetected ? "Huella Detectada" : "Huella No Detectada"}
            </div>
          </div>

          <div className="flex-1">
            <PPGSignalMeter 
              value={lastSignal?.filteredValue || 0}
              quality={lastSignal?.quality || 0}
              isFingerDetected={lastSignal?.fingerDetected || false}
              onStartMeasurement={startMonitoring}
              onReset={handleReset}
              arrhythmiaStatus={vitalSigns.arrhythmiaStatus}
              preserveResults={showResults}
              isArrhythmia={isArrhythmia}
            />
          </div>

          <AppTitle />

          <div className="absolute inset-x-0 top-[45%] bottom-[60px] bg-black/10 px-4 py-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 place-items-center h-full overflow-y-auto pb-4">
              <VitalSign 
                label="FRECUENCIA CARDÍACA"
                value={heartRate || "--"}
                unit="BPM"
                highlighted={showResults}
              />
              <VitalSign 
                label="SPO2"
                value={vitalSigns.spo2 || "--"}
                unit="%"
                highlighted={showResults}
              />
              <VitalSign 
                label="PRESIÓN ARTERIAL"
                value={vitalSigns.pressure}
                unit="mmHg"
                highlighted={showResults}
              />
              <VitalSign 
                label="GLUCOSA"
                value={vitalSigns.glucose || "--"}
                unit="mg/dL"
                highlighted={showResults}
              />
              <VitalSign 
                label="COLESTEROL"
                value={vitalSigns.lipids?.totalCholesterol || "--"}
                unit="mg/dL"
                highlighted={showResults}
              />
              <VitalSign 
                label="TRIGLICÉRIDOS"
                value={vitalSigns.lipids?.triglycerides || "--"}
                unit="mg/dL"
                highlighted={showResults}
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-4 flex gap-4 px-4">
            <div className="w-1/3">
              <MonitorButton 
                isMonitoring={isMonitoring} 
                onToggle={handleToggleMonitoring} 
                variant="monitor"
              />
            </div>
            <div className="w-1/3">
              <MonitorButton 
                isMonitoring={isMonitoring} 
                onToggle={handleReset} 
                variant="reset"
              />
            </div>
            <div className="w-1/3">
              <MonitorButton
                isMonitoring={showMonitorPanel}
                onToggle={toggleMonitoringPanel}
                variant="debug"
              />
            </div>
          </div>
        </div>
        
        <MonitoringPanel
          isVisible={showMonitorPanel}
          lastSignal={lastSignal}
          heartRate={heartRate}
          signalQuality={signalQuality}
          vitalSigns={vitalSigns}
        />
      </div>
    </div>
  );
};

export default Index;
