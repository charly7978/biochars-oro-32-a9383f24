
import React, { useState, useRef, useEffect } from "react";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import { useFingerDetection } from "@/hooks/useFingerDetection"; // Nuevo hook centralizado
import PPGSignalMeter from "@/components/PPGSignalMeter";
import MonitorButton from "@/components/MonitorButton";
import AppTitle from "@/components/AppTitle";
import SignalQualityIndicator from "@/components/SignalQualityIndicator";
import { VitalSignsResult } from "@/modules/vital-signs";
import { logError, ErrorLevel } from "@/utils/debugUtils";

const Index = () => {
  // Estado general
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
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
  
  // Referencias
  const measurementTimerRef = useRef<number | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const imageProcessingActiveRef = useRef(false);
  
  // Utilizamos el hook centralizado para detección de dedo
  const fingerDetector = useFingerDetection();
  
  // Hooks de procesamiento
  const signalProcessor = useSignalProcessor();
  const vitalSignsProcessor = useVitalSignsProcessor();
  
  // Estado para la calidad y diagnósticos
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [isQualityAlertActive, setIsQualityAlertActive] = useState(false);
  const [problemAlgorithms, setProblemAlgorithms] = useState<{algorithm: string, issues: string[], quality: number}[]>([]);
  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState(false);
  
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

  // Obtener resultados cuando termina la monitorización
  useEffect(() => {
    if (signalProcessor.lastResult && !isMonitoring) {
      // Si hay un último resultado válido, actualizar signos vitales
      if (vitalSignsProcessor.lastResult) {
        setVitalSigns(vitalSignsProcessor.lastResult);
      }
      
      if (signalProcessor.heartRate > 0) {
        setHeartRate(signalProcessor.heartRate);
      }
      
      setShowResults(true);
    }
  }, [signalProcessor.lastResult, vitalSignsProcessor.lastResult, isMonitoring, signalProcessor.heartRate]);

  const startMonitoring = () => {
    if (isMonitoring) {
      finalizeMeasurement();
    } else {
      enterFullScreen();
      setIsMonitoring(true);
      setIsCameraOn(true);
      setShowResults(false);
      setHeartRate(0);
      
      // Iniciar detector de dedos centralizado
      fingerDetector.startMonitoring();
      
      // Iniciar procesadores
      signalProcessor.startProcessing();
      vitalSignsProcessor.initializeProcessor();
      
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
    
    // Detener detector centralizado
    fingerDetector.stopMonitoring();
    
    // Detener procesadores
    signalProcessor.stopProcessing();
    
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
  };

  const handleReset = () => {
    console.log("Reseteando completamente la aplicación");
    setIsMonitoring(false);
    setIsCameraOn(false);
    setShowResults(false);
    
    // Reiniciar detector centralizado
    fingerDetector.reset();
    
    // Reiniciar procesadores
    signalProcessor.reset();
    vitalSignsProcessor.fullReset();
    
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
    
    // Resetear métricas de calidad
    setQualityMetrics(null);
    setIsQualityAlertActive(false);
    setProblemAlgorithms([]);
    setShowDetailedDiagnostics(false);
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
            
            // Procesar frame para extracción
            const extractionResult = signalProcessor.processFrame(imageData);
            
            if (extractionResult && extractionResult.filteredValue !== undefined) {
              // Actualizar detector de dedos centralizado con la señal
              const fingerDetected = fingerDetector.processSignal(
                extractionResult.filteredValue,
                extractionResult.quality,
                extractionResult.fingerDetected
              );
              
              // Si hay detección de dedo, procesar para signos vitales
              if (fingerDetected) {
                // Procesar para obtener frecuencia cardíaca y otros signos
                vitalSignsProcessor.processSignal(
                  extractionResult.filteredValue,
                  { 
                    intervals: heartRate > 0 ? [60000 / heartRate] : [],
                    lastPeakTime: Date.now()
                  }
                );
                
                // Actualizar frecuencia cardíaca
                if (signalProcessor.heartRate > 0) {
                  setHeartRate(signalProcessor.heartRate);
                }
                
                // Si hay un resultado de signos vitales, actualizar
                if (vitalSignsProcessor.lastResult) {
                  setVitalSigns(vitalSignsProcessor.lastResult);
                }
              }
            }
            
            frameCount++;
            lastProcessTime = now;
            
            if (now - lastFpsUpdateTime > 1000) {
              processingFps = frameCount;
              frameCount = 0;
              lastFpsUpdateTime = now;
              console.log(`Rendimiento de procesamiento: ${processingFps} FPS, Finger: ${fingerDetector.isFingerDetected}, Quality: ${fingerDetector.signalQuality}`);
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
            isFingerDetected={fingerDetector.isFingerDetected}
            signalQuality={fingerDetector.signalQuality}
          />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          <div className="px-4 py-2 flex justify-between items-center bg-black/20">
            {/* Monitor de calidad */}
            {isQualityAlertActive || showDetailedDiagnostics ? (
              <SignalQualityIndicator 
                metrics={qualityMetrics}
                isAlertActive={isQualityAlertActive}
                problemAlgorithms={problemAlgorithms}
                showDetailedDiagnostics={showDetailedDiagnostics}
              />
            ) : (
              <div className="text-white text-lg">
                Calidad: {fingerDetector.signalQuality}
              </div>
            )}
            <div className="text-white text-lg">
              {fingerDetector.isFingerDetected ? "Huella Detectada" : "Huella No Detectada"}
            </div>
          </div>

          <div className="flex-1">
            <PPGSignalMeter 
              value={signalProcessor.lastResult?.filteredValue || 0}
              quality={fingerDetector.signalQuality}
              isFingerDetected={fingerDetector.isFingerDetected}
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
