
import React, { useState, useRef, useEffect, useCallback } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import MonitorButton from "@/components/MonitorButton";
import AppTitle from "@/components/AppTitle";
import ShareButton from "@/components/ShareButton";
import { VitalSignsResult } from "@/modules/vital-signs/VitalSignsProcessor";
import { useTensorFlowIntegration } from "@/hooks/useTensorFlowIntegration";

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
      hydration: 0
    }
  });
  const [heartRate, setHeartRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isTfActive, setIsTfActive] = useState(false);
  const [frameRate, setFrameRate] = useState(0);
  const measurementTimerRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  
  const { 
    isTensorFlowReady, 
    tensorflowBackend,
    isWebGLAvailable
  } = useTensorFlowIntegration();
  
  const { 
    startProcessing, 
    stopProcessing, 
    lastSignal, 
    processFrame,
    framesProcessed
  } = useSignalProcessor();
  
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
    debugInfo
  } = useVitalSignsProcessor();

  useEffect(() => {
    setIsTfActive(isTensorFlowReady);
    if (isTensorFlowReady) {
      console.log("Index: TensorFlow is ready", {
        backend: tensorflowBackend,
        webgl: isWebGLAvailable
      });
    }
  }, [isTensorFlowReady, tensorflowBackend, isWebGLAvailable]);
  
  useEffect(() => {
    const frameRateInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastFrameTimeRef.current;
      
      if (elapsed > 0) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFrameRate(currentFps);
        
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
    }, 1000);
    
    return () => clearInterval(frameRateInterval);
  }, []);

  const enterFullScreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Error al entrar en pantalla completa:', err);
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
    if (lastValidResults && !isMonitoring && showResults) {
      console.log("Index: Displaying saved measurement results", lastValidResults);
      setVitalSigns(lastValidResults);
    }
  }, [lastValidResults, isMonitoring, showResults]);

  useEffect(() => {
    if (lastSignal && isMonitoring) {
      frameCountRef.current++;
      
      const signalThreshold = isTfActive ? 30 : 40;
      const hasValidSignal = lastSignal.fingerDetected && lastSignal.quality >= signalThreshold;
      
      if (hasValidSignal) {
        const heartBeatResult = processHeartBeat(lastSignal.filteredValue);
        
        if (heartBeatResult.confidence > 0.4 && heartBeatResult.bpm > 0) {
          setHeartRate(heartBeatResult.bpm);
        }
        
        const vitals = processVitalSigns(lastSignal.filteredValue, heartBeatResult.rrData);
        
        if (vitals) {
          if (vitals.spo2 > 0 || vitals.glucose > 0 || 
              vitals.lipids.totalCholesterol > 0 || vitals.lipids.hydration > 0) {
            console.log("Index: Real-time vital signs update", {
              heartRate: heartBeatResult.bpm,
              confidence: heartBeatResult.confidence,
              spo2: vitals.spo2,
              pressure: vitals.pressure,
              glucose: vitals.glucose,
              cholesterol: vitals.lipids.totalCholesterol,
              hydration: vitals.lipids.hydration,
              quality: lastSignal.quality,
              tensorFlow: isTfActive
            });
          }
          
          setVitalSigns(vitals);
        }
      }
      
      setSignalQuality(lastSignal.quality);
    } else if (!isMonitoring && heartRate > 0) {
      console.log("Index: Preserving latest measurements for display");
    }
  }, [lastSignal, isMonitoring, processHeartBeat, processVitalSigns, isTfActive]);

  const startMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      enterFullScreen();
      setIsMonitoring(true);
      setIsCameraOn(true);
      setShowResults(false);
      
      setHeartRate(0);
      
      startProcessing();
      startHeartBeatMonitoring();
      
      setElapsedTime(0);
      
      if (measurementTimerRef.current) {
        clearInterval(measurementTimerRef.current);
      }
      
      measurementTimerRef.current = window.setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          
          if (newTime >= 30) {
            finalizeMeasurement();
            return 30;
          }
          return newTime;
        });
      }, 1000);
      
      console.log("Medición iniciada - Coloque su dedo sobre la cámara trasera");
    }
  };

  const finalizeMeasurement = () => {
    console.log("Index: Finalizando medición con resultados", vitalSigns);
    
    setIsMonitoring(false);
    setIsCameraOn(false);
    stopProcessing();
    stopHeartBeatMonitoring();
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    const savedResults = resetVitalSigns();
    if (savedResults) {
      setVitalSigns(savedResults);
      setShowResults(true);
      
      console.log("Medición completa - Resultados actualizados");
    }
    
    setElapsedTime(0);
    setSignalQuality(0);
  };

  const handleReset = () => {
    console.log("Index: Reseteando completamente la aplicación");
    setIsMonitoring(false);
    setIsCameraOn(false);
    setShowResults(false);
    stopProcessing();
    stopHeartBeatMonitoring();
    resetHeartBeatProcessor();
    
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
        hydration: 0
      }
    });
    setSignalQuality(0);
    
    console.log("Sistema reiniciado - Todos los datos han sido borrados");
  };

  const handleStreamReady = (stream: MediaStream) => {
    if (!isMonitoring) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);
    
    if (videoTrack.getCapabilities()?.torch) {
      console.log("Index: Activando linterna para mejorar la señal PPG");
      videoTrack.applyConstraints({
        advanced: [{ torch: true }]
      }).catch(err => console.error("Error activando linterna:", err));
    }
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', {willReadFrequently: true});
    if (!tempCtx) {
      console.error("No se pudo obtener el contexto 2D");
      return;
    }
    
    let lastProcessTime = 0;
    const targetFrameInterval = 1000/30;
    
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
          
          lastProcessTime = now;
        } catch (error) {
          console.error("Error capturando frame:", error);
        }
      }
      
      if (isMonitoring) {
        requestAnimationFrame(processImage);
      }
    };

    processImage();
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      startMonitoring();
    }
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
          <div className="px-4 py-2 flex justify-between items-center bg-black/20">
            <div className="text-white text-lg flex items-center gap-2">
              <span>Calidad: {signalQuality}</span>
              {isTfActive && (
                <span className="text-green-400 text-sm bg-green-900/50 px-2 py-0.5 rounded">
                  TF: {tensorflowBackend}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ShareButton />
              <div className="text-white text-lg flex flex-col items-end">
                <span>{lastSignal?.fingerDetected ? "Huella Detectada" : "Huella No Detectada"}</span>
                <span className="text-xs text-gray-400">{frameRate} FPS</span>
              </div>
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
                label="HIDRATACIÓN"
                value={vitalSigns.lipids?.hydration || "--"}
                unit="%"
                highlighted={showResults}
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-4 flex gap-4 px-4">
            <div className="w-1/2">
              <MonitorButton 
                isMonitoring={isMonitoring} 
                onToggle={handleToggleMonitoring} 
                variant="monitor"
              />
            </div>
            <div className="w-1/2">
              <MonitorButton 
                isMonitoring={isMonitoring} 
                onToggle={handleReset} 
                variant="reset"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
