
import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import { useVitalSignsWithProcessing } from "@/hooks/useVitalSignsWithProcessing";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import MonitorButton from "@/components/MonitorButton";
import AppTitle from "@/components/AppTitle";
import SignalQualityIndicator from "@/components/SignalQualityIndicator";
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
  const measurementTimerRef = useRef<number | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const imageProcessingActiveRef = useRef(false);
  
  // Usar el nuevo hook integrado
  const vitalSignsWithProcessing = useVitalSignsWithProcessing();
  
  const enterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.log('Error al entrar en pantalla completa:', err);
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
    if (vitalSignsWithProcessing.lastResult && !isMonitoring) {
      // Convertir el formato integrado al formato esperado por VitalSign
      const convertedVitalSigns: VitalSignsResult = {
        spo2: vitalSignsWithProcessing.lastResult.spo2,
        pressure: vitalSignsWithProcessing.lastResult.pressure,
        arrhythmiaStatus: vitalSignsWithProcessing.lastResult.arrhythmiaStatus,
        glucose: 0, // No disponible en el resultado integrado
        lipids: {
          totalCholesterol: 0, // No disponible en el resultado integrado
          triglycerides: 0 // No disponible en el resultado integrado
        }
      };
      
      setVitalSigns(convertedVitalSigns);
      setHeartRate(vitalSignsWithProcessing.lastResult.heartRate);
      setShowResults(true);
    }
  }, [vitalSignsWithProcessing.lastResult, isMonitoring]);

  const startMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      enterFullScreen();
      setIsMonitoring(true);
      setIsCameraOn(true);
      setShowResults(false);
      setHeartRate(0);
      
      // Iniciar procesamiento integrado
      vitalSignsWithProcessing.startMonitoring();
      
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
    
    // Detener procesamiento integrado
    vitalSignsWithProcessing.stopMonitoring();
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    imageProcessingActiveRef.current = false;
    
    // Detener y liberar stream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        try {
          if (track.readyState === 'live') {
            track.stop();
          }
        } catch (err) {
          console.error("Error al detener track:", err);
        }
      });
      cameraStreamRef.current = null;
    }
    
    setElapsedTime(0);
    setSignalQuality(0);
  };

  const handleReset = () => {
    console.log("Reseteando completamente la aplicación");
    setIsMonitoring(false);
    setIsCameraOn(false);
    setShowResults(false);
    
    // Reiniciar completamente
    vitalSignsWithProcessing.reset();
    
    if (measurementTimerRef.current) {
      clearInterval(measurementTimerRef.current);
      measurementTimerRef.current = null;
    }
    
    imageProcessingActiveRef.current = false;
    
    // Detener y liberar stream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        try {
          if (track.readyState === 'live') {
            track.stop();
          }
        } catch (err) {
          console.error("Error al detener track:", err);
        }
      });
      cameraStreamRef.current = null;
    }
    
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
    
    // Store stream reference
    cameraStreamRef.current = stream;
    
    // Get video track for image capture
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      logError("No se pudo obtener pista de vídeo", ErrorLevel.ERROR, "Index");
      return;
    }
    
    if (typeof window !== 'undefined' && 'ImageCapture' in window) {
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      
      // Try enabling torch for better signal
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
      
      // Mark image processing as active
      imageProcessingActiveRef.current = true;
      
      const processImage = async () => {
        // Check if monitoring is still active
        if (!isMonitoring || !imageProcessingActiveRef.current) {
          console.log("Procesamiento de imágenes detenido");
          return;
        }
        
        // Verify track is still valid
        if (!videoTrack || videoTrack.readyState !== 'live') {
          console.error("La pista de vídeo no está activa", videoTrack?.readyState);
          return;
        }
        
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
            
            // Usar el procesador integrado
            vitalSignsWithProcessing.processFrame(imageData);
            
            // Actualizar señal de calidad desde el procesamiento integrado
            setSignalQuality(vitalSignsWithProcessing.signalQuality);
            
            // Actualizar frecuencia cardíaca desde el procesamiento integrado
            if (vitalSignsWithProcessing.heartRate > 0) {
              setHeartRate(vitalSignsWithProcessing.heartRate);
            }
            
            // Si hay un resultado reciente, actualizar signos vitales
            if (vitalSignsWithProcessing.lastResult) {
              setVitalSigns({
                spo2: vitalSignsWithProcessing.lastResult.spo2,
                pressure: vitalSignsWithProcessing.lastResult.pressure,
                arrhythmiaStatus: vitalSignsWithProcessing.lastResult.arrhythmiaStatus,
                glucose: 0,
                lipids: {
                  totalCholesterol: 0,
                  triglycerides: 0
                }
              });
            }
            
            frameCount++;
            lastProcessTime = now;
            
            if (now - lastFpsUpdateTime > 1000) {
              processingFps = frameCount;
              frameCount = 0;
              lastFpsUpdateTime = now;
              console.log(`Rendimiento de procesamiento: ${processingFps} FPS, Finger: ${vitalSignsWithProcessing.fingerDetected}, Quality: ${vitalSignsWithProcessing.signalQuality}`);
            }
          } catch (error) {
            console.error("Error capturando frame:", error);
          }
        }
        
        // Continue processing as long as monitoring is active
        if (isMonitoring && imageProcessingActiveRef.current) {
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
            isFingerDetected={vitalSignsWithProcessing.fingerDetected}
            signalQuality={signalQuality}
          />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          <div className="px-4 py-2 flex justify-between items-center bg-black/20">
            {/* NUEVO: Monitor de calidad avanzado */}
            {vitalSignsWithProcessing.isQualityAlertActive || vitalSignsWithProcessing.showDetailedDiagnostics ? (
              <SignalQualityIndicator 
                metrics={vitalSignsWithProcessing.qualityMetrics}
                isAlertActive={vitalSignsWithProcessing.isQualityAlertActive}
                problemAlgorithms={vitalSignsWithProcessing.problemAlgorithms}
                showDetailedDiagnostics={vitalSignsWithProcessing.showDetailedDiagnostics}
              />
            ) : (
              <div className="text-white text-lg">
                Calidad: {signalQuality}
              </div>
            )}
            <div className="text-white text-lg">
              {vitalSignsWithProcessing.fingerDetected ? "Huella Detectada" : "Huella No Detectada"}
            </div>
          </div>

          <div className="flex-1">
            <PPGSignalMeter 
              value={vitalSignsWithProcessing.lastResult?.filteredValue || 0}
              quality={signalQuality}
              isFingerDetected={vitalSignsWithProcessing.fingerDetected}
              onStartMeasurement={startMonitoring}
              onReset={handleReset}
              arrhythmiaStatus={vitalSigns.arrhythmiaStatus}
              preserveResults={showResults}
              isArrhythmia={vitalSigns.arrhythmiaStatus.toLowerCase().includes('arr')}
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
