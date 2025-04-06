import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import MonitorButton from "@/components/MonitorButton";
import AppTitle from "@/components/AppTitle";
import { VitalSignsTypes } from "@/types";

type LocalVitalSignsResult = VitalSignsTypes.VitalSignsResult;

const Index = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);
  const [vitalSigns, setVitalSigns] = useState<LocalVitalSignsResult>({
    spo2: 0,
    pressure: "--/--",
    arrhythmiaStatus: "--",
    glucose: 0,
    hydration: 0,
    lipids: {
      totalCholesterol: 0,
      triglycerides: 0
    }
  });
  const [heartRate, setHeartRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
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
    lastValidResults
  } = useVitalSignsProcessor();

  const enterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.log('Error al entrar en pantalla completa:', err);
    }
  };

  const sanitizeVitalSigns = (results: LocalVitalSignsResult): LocalVitalSignsResult => {
    if (!results) return vitalSigns;
    
    return {
      ...results,
      spo2: results.spo2 ? Math.round(Math.min(99, Math.max(90, results.spo2))) : 0,
      pressure: results.pressure,
      glucose: results.glucose ? Math.round(results.glucose) : 0,
      hydration: results.hydration ? Math.round(Math.min(100, Math.max(0, results.hydration))) : 0,
      lipids: {
        totalCholesterol: results.lipids?.totalCholesterol ? 
          Math.round(results.lipids.totalCholesterol) : 0,
        triglycerides: results.lipids?.triglycerides ? 
          Math.round(results.lipids.triglycerides) : 0
      },
      arrhythmiaStatus: results.arrhythmiaStatus,
      lastArrhythmiaData: results.lastArrhythmiaData
    };
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
      const convertedResult: LocalVitalSignsResult = {
        ...lastValidResults,
        lastArrhythmiaData: lastValidResults.lastArrhythmiaData ? {
          timestamp: lastValidResults.lastArrhythmiaData.timestamp,
          rmssd: lastValidResults.lastArrhythmiaData.rmssd || 0,
          rrVariation: lastValidResults.lastArrhythmiaData.rrVariation || 0
        } : null
      };
      
      setVitalSigns(sanitizeVitalSigns(convertedResult));
      setShowResults(true);
    }
  }, [lastValidResults, isMonitoring]);

  useEffect(() => {
    if (lastSignal && isMonitoring) {
      console.log("Processing signal:", lastSignal);
      
      const minQualityThreshold = 20;
      
      if (lastSignal.fingerDetected) {
        console.log("Finger detected, quality:", lastSignal.quality);
        
        const heartBeatResult = processHeartBeat(lastSignal.filteredValue);
        console.log("Heart beat result:", heartBeatResult);
        
        if (heartBeatResult.confidence > 0.1) {
          setHeartRate(Math.round(heartBeatResult.bpm));
          
          if (heartBeatResult.rrData && heartBeatResult.rrData.intervals.length > 0) {
            console.log("RR intervals:", heartBeatResult.rrData.intervals);
          }
          
          const vitals = processVitalSigns(lastSignal.filteredValue, heartBeatResult.rrData);
          if (vitals) {
            console.log("Vital signs processed:", vitals);
            
            const convertedResult: LocalVitalSignsResult = {
              ...vitals,
              lastArrhythmiaData: vitals.lastArrhythmiaData ? {
                timestamp: vitals.lastArrhythmiaData.timestamp,
                rmssd: vitals.lastArrhythmiaData.rmssd || 0,
                rrVariation: vitals.lastArrhythmiaData.rrVariation || 0
              } : null
            };
            
            setVitalSigns(sanitizeVitalSigns(convertedResult));
          }
        }
        
        setSignalQuality(Math.round(lastSignal.quality));
      } else {
        console.log("No finger detected");
        setSignalQuality(Math.round(lastSignal.quality));
        
        if (heartRate > 0) {
          setHeartRate(0);
        }
      }
    } else if (!isMonitoring) {
      setSignalQuality(0);
    }
  }, [lastSignal, isMonitoring, processHeartBeat, processVitalSigns, heartRate]);

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
    console.log("Finalizando medición");
    
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
      const convertedResult: LocalVitalSignsResult = {
        ...savedResults,
        lastArrhythmiaData: savedResults.lastArrhythmiaData ? {
          timestamp: savedResults.lastArrhythmiaData.timestamp,
          rmssd: savedResults.lastArrhythmiaData.rmssd || 0,
          rrVariation: savedResults.lastArrhythmiaData.rrVariation || 0
        } : null
      };
      
      setVitalSigns(sanitizeVitalSigns(convertedResult));
      setShowResults(true);
    }
    
    setElapsedTime(0);
    setSignalQuality(0);
  };

  const handleReset = () => {
    console.log("Reseteando completamente la aplicación");
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
      hydration: 0,
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
        console.log("Activando linterna para mejorar la señal PPG");
        videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        }).catch(err => console.error("Error activando linterna:", err));
      } else {
        console.warn("Esta cámara no tiene linterna disponible, la medición puede ser menos precisa");
      }
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', {willReadFrequently: true});
      if (!tempCtx) {
        console.error("No se pudo obtener el contexto 2D");
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
              console.log(`Rendimiento de procesamiento: ${processingFps} FPS`);
            }
          } catch (error) {
            console.error("Error capturando frame:", error);
          }
        }
        
        if (isMonitoring) {
          requestAnimationFrame(processImage);
        }
      };

      processImage();
    } else {
      console.error("ImageCapture API is not supported in this browser");
    }
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
                label="HIDRATACIÓN"
                value={vitalSigns.hydration || "--"}
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
