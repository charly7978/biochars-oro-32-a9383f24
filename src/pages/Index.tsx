import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VitalSign from "@/components/VitalSign";
import CameraView from "@/components/CameraView";
import { useSignalProcessor } from "@/hooks/useSignalProcessor";
import { useHeartBeatProcessor } from "@/hooks/useHeartBeatProcessor";
import { useVitalSignsProcessor } from "@/hooks/useVitalSignsProcessor";
import PPGSignalMeter from "@/components/PPGSignalMeter";
import ArrhythmiaVisualizer from "@/components/ArrhythmiaVisualizer";
import MeasurementConfirmationDialog from "@/components/MeasurementConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { logError, ErrorLevel } from "@/utils/debugUtils";
import { initializeErrorTrackingSystem } from "@/utils/errorTracking";

const Index = () => {
  const navigate = useNavigate();
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
  const measurementTimerRef = useRef<any>(null);
  const cameraRecoveryTimerRef = useRef<any>(null);
  
  const { startProcessing, stopProcessing, lastSignal, processFrame } = useSignalProcessor();
  const { processSignal: processHeartBeat } = useHeartBeatProcessor();
  const { processSignal: processVitalSigns, reset: resetVitalSigns } = useVitalSignsProcessor();

  useEffect(() => {
    try {
      initializeErrorTrackingSystem();
      logError("Application initialized", ErrorLevel.INFO, "App");
    } catch (error) {
      console.error("Error initializing error tracking:", error);
    }
    
    return () => {
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

  const handleOpenMonitoring = () => {
    try {
      logError("Opening monitoring dashboard", ErrorLevel.INFO, "Navigation");
      navigate('/monitoring');
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: "Error",
        description: "Error al abrir el panel de monitoreo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Sistema Integral de Monitoreo</h1>
      
      <div className="relative">
        <CameraView 
          onStreamReady={() => {}}
          isMonitoring={isCameraOn}
          isFingerDetected={false}
          signalQuality={signalQuality}
        />
      </div>

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

      <div className="mt-6 flex justify-center">
        <Button 
          variant="outline" 
          size="lg" 
          className="flex items-center gap-2 border-2 border-gray-300 hover:bg-gray-100"
          onClick={handleOpenMonitoring}
        >
          <Activity className="w-5 h-5 text-blue-600" />
          <span>Panel de Monitoreo Integral</span>
        </Button>
      </div>
      
      {!isMonitoring ? (
        <button
          className="bg-green-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition-colors"
          onClick={startMonitoring}
        >
          Iniciar Medición
        </button>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-black mb-2">
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
      
      {showConfirmDialog && (
        <MeasurementConfirmationDialog
          onConfirm={confirmMeasurement}
          onCancel={cancelMeasurement}
          vitalSigns={vitalSigns}
          heartRate={heartRate}
        />
      )}
    </div>
  );
};

export default Index;
