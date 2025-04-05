
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import {
  unifiedFingerDetector,
  resetFingerDetector,
  getFingerDetectionState,
  updateDetectionSource,
  adaptDetectionThresholds,
  isFingerDetected,
  getDetectionConfidence
} from '@/modules/signal-processing';
import type {
  DetectionSource,
  DetectionState,
  DiagnosticEvent,
  DiagnosticEventType,
  AdaptiveCalibrationParams,
  EnvironmentalState
} from '@/modules/signal-processing/finger-detection/finger-detection-types';
import {
  fingerDiagnostics,
  reportFingerDetection,
  reportDiagnosticEvent,
  getDiagnosticStats,
  clearDiagnosticEvents
} from '@/modules/signal-processing';
import {
  adaptiveCalibration,
  getCalibrationParameters,
  updateEnvironmentalState,
  resetCalibration
} from '@/modules/signal-processing';
import {
  analyzeSignalForRhythmicPattern,
  resetRhythmDetector,
  isFingerDetectedByRhythm,
  getConsistentPatternsCount
} from '@/modules/signal-processing';
import {
  checkSignalStrength,
  shouldProcessMeasurement,
  resetAmplitudeDetector,
  getLastSignalQuality,
  isFingerDetectedByAmplitude
} from '@/modules/signal-processing';

interface FingerDetectionMonitorProps {
  className?: string;
}

// Default empty states to prevent undefined errors
const DEFAULT_DETECTION_STATE: DetectionState = {
  detected: false,
  confidence: 0,
  isFingerDetected: false,
  amplitude: { detected: false, confidence: 0 },
  rhythm: { detected: false, confidence: 0 },
  sources: {},
  lastUpdate: Date.now()
};

const DEFAULT_ENVIRONMENTAL_STATE: EnvironmentalState = {
  noise: 0,
  lighting: 50,
  motion: 0
};

const DEFAULT_CALIBRATION_PARAMS: AdaptiveCalibrationParams = {
  baseThreshold: 0.5,
  noiseMultiplier: 1.0,
  lightingCompensation: 1.0,
  motionCompensation: 1.0,
  adaptationRate: 0.1,
  stabilityFactor: 1.0
};

const FingerDetectionMonitor: React.FC<FingerDetectionMonitorProps> = ({ className }) => {
  const [detectionState, setDetectionState] = useState<DetectionState>(DEFAULT_DETECTION_STATE);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [diagnosticEvents, setDiagnosticEvents] = useState<DiagnosticEvent[]>([]);
  const [isRhythmDetected, setIsRhythmDetected] = useState(false);
  const [isAmplitudeDetected, setIsAmplitudeDetected] = useState(false);
  const [calibrationParams, setCalibrationParams] = useState<AdaptiveCalibrationParams>(DEFAULT_CALIBRATION_PARAMS);
  const [environmentalState, setEnvironmentalState] = useState<EnvironmentalState>(DEFAULT_ENVIRONMENTAL_STATE);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [lightingLevel, setLightingLevel] = useState(50);
  const [motionLevel, setMotionLevel] = useState(0);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        // Obtener el estado actual con manejo de errores
        const newState = getFingerDetectionState();
        setDetectionState(newState || DEFAULT_DETECTION_STATE);
        
        // Obtener estadísticas de diagnóstico con manejo de errores
        try {
          const stats = getDiagnosticStats();
          setDiagnosticEvents(stats?.events || []);
        } catch (error) {
          console.error("Error al obtener estadísticas de diagnóstico:", error);
          setDiagnosticEvents([]);
        }
        
        // Verificar detecciones con manejo de errores
        try {
          if (typeof isFingerDetectedByRhythm === 'function') {
            setIsRhythmDetected(isFingerDetectedByRhythm());
          }
        } catch (error) {
          console.error("Error al verificar detección por ritmo:", error);
          setIsRhythmDetected(false);
        }
        
        try {
          if (typeof isFingerDetectedByAmplitude === 'function') {
            setIsAmplitudeDetected(isFingerDetectedByAmplitude());
          }
        } catch (error) {
          console.error("Error al verificar detección por amplitud:", error);
          setIsAmplitudeDetected(false);
        }
        
        // Obtener parámetros de calibración con manejo de errores
        try {
          const params = getCalibrationParameters();
          setCalibrationParams(params || DEFAULT_CALIBRATION_PARAMS);
          
          // Obtener estado ambiental con manejo de errores
          const envState = params?.environmentalState || DEFAULT_ENVIRONMENTAL_STATE;
          setEnvironmentalState(envState);
        } catch (error) {
          console.error("Error al obtener parámetros de calibración:", error);
          setCalibrationParams(DEFAULT_CALIBRATION_PARAMS);
          setEnvironmentalState(DEFAULT_ENVIRONMENTAL_STATE);
        }
      } catch (err) {
        console.error("Error actualizando estado del monitor:", err);
        // Si hay un error, usar valores por defecto
        setDetectionState(DEFAULT_DETECTION_STATE);
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, []);
  
  useEffect(() => {
    setNoiseLevel(environmentalState?.noise || 0);
  }, [environmentalState?.noise]);
  
  useEffect(() => {
    setLightingLevel(environmentalState?.lighting || 50);
  }, [environmentalState?.lighting]);
  
  useEffect(() => {
    setMotionLevel(environmentalState?.motion || 0);
  }, [environmentalState?.motion]);
  
  const handleApplySensitivity = (value: number) => {
    if (value === 0.5) return; // No change at middle point
    
    try {
      // Valor simple para el adaptador de umbrales
      adaptDetectionThresholds(value);
      
      toast({
        title: "Sensitivity Applied",
        description: `Detection sensitivity set to ${value < 0.5 ? "less" : "more"} sensitive`,
      });
    } catch (error) {
      console.error("Error al aplicar sensibilidad:", error);
      toast({
        title: "Error",
        description: "Failed to apply sensitivity setting",
        variant: "destructive"
      });
    }
  };
  
  const handleResetSensitivity = () => {
    try {
      // Valor simple para el adaptador de umbrales
      adaptDetectionThresholds(0.5);
      
      setSensitivity(0.5);
      toast({
        title: "Sensitivity Reset",
        description: "Detection sensitivity returned to default",
      });
    } catch (error) {
      console.error("Error al restablecer sensibilidad:", error);
      toast({
        title: "Error",
        description: "Failed to reset sensitivity",
        variant: "destructive"
      });
    }
  };
  
  const handleNoiseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNoise = Number(event.target.value);
    setNoiseLevel(newNoise);
    try {
      updateEnvironmentalState({ noise: newNoise });
    } catch (error) {
      console.error("Error al actualizar nivel de ruido:", error);
    }
  };
  
  const handleLightingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLighting = Number(event.target.value);
    setLightingLevel(newLighting);
    try {
      updateEnvironmentalState({ lighting: newLighting });
    } catch (error) {
      console.error("Error al actualizar nivel de iluminación:", error);
    }
  };
  
  const handleMotionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMotion = Number(event.target.value);
    setMotionLevel(newMotion);
    try {
      updateEnvironmentalState({ motion: newMotion });
    } catch (error) {
      console.error("Error al actualizar nivel de movimiento:", error);
    }
  };
  
  const handleResetCalibration = () => {
    try {
      resetCalibration();
      toast({
        title: "Calibration Reset",
        description: "Adaptive calibration has been reset to default values.",
      });
    } catch (error) {
      console.error("Error al restablecer calibración:", error);
      toast({
        title: "Error",
        description: "Failed to reset calibration",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Finger Detection Monitor</span>
          <Badge variant={detectionState?.detected ? 'default' : 'outline'}>
            {detectionState?.detected ? 'Detected' : 'Not Detected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor and adjust finger detection parameters
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Detection Sources</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Badge variant={detectionState?.amplitude?.detected ? 'default' : 'outline'}>
                Amplitude
              </Badge>
              <span>Confidence: {detectionState?.amplitude?.confidence.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={detectionState?.rhythm?.detected ? 'default' : 'outline'}>
                Rhythm
              </Badge>
              <span>Confidence: {detectionState?.rhythm?.confidence.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Unified Detection</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center space-x-2">
              <span>Confidence: {detectionState?.confidence?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Is Finger Detected by Rhythm: {isRhythmDetected ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Is Finger Detected by Amplitude: {isAmplitudeDetected ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sensitivity Adjustment</h4>
          <div className="flex items-center space-x-2">
            <Label htmlFor="sensitivity-slider">Sensitivity:</Label>
            <Slider
              id="sensitivity-slider"
              defaultValue={[sensitivity * 100]}
              max={100}
              step={1}
              onValueChange={(value) => setSensitivity(value[0] / 100)}
              onMouseUp={() => handleApplySensitivity(sensitivity)}
              className="w-1/2"
            />
            <Button variant="outline" size="sm" onClick={handleResetSensitivity}>
              Reset
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Environmental Simulation</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="noise-input">Noise Level:</Label>
              <Input
                id="noise-input"
                type="number"
                value={noiseLevel}
                onChange={handleNoiseChange}
              />
            </div>
            <div>
              <Label htmlFor="lighting-input">Lighting Level:</Label>
              <Input
                id="lighting-input"
                type="number"
                value={lightingLevel}
                onChange={handleLightingChange}
              />
            </div>
            <div>
              <Label htmlFor="motion-input">Motion Level:</Label>
              <Input
                id="motion-input"
                type="number"
                value={motionLevel}
                onChange={handleMotionChange}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetCalibration}>
            Reset Calibration
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Calibration Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label>Base Threshold: {calibrationParams?.baseThreshold?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Noise Multiplier: {calibrationParams?.noiseMultiplier?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Lighting Compensation: {calibrationParams?.lightingCompensation?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Motion Compensation: {calibrationParams?.motionCompensation?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Adaptation Rate: {calibrationParams?.adaptationRate?.toFixed(3) || "0.000"}</Label>
            </div>
            <div>
              <Label>Stability Factor: {calibrationParams?.stabilityFactor?.toFixed(3) || "0.000"}</Label>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Diagnostic Events</h4>
          <ScrollArea className="h-[200px] w-full">
            <div className="space-y-1">
              {(diagnosticEvents || []).slice().reverse().map((event, index) => (
                <div key={index} className="text-xs border-l-2 pl-2 py-1 border-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                  <p className="mt-1">{event.message}</p>
                </div>
              ))}
              
              {(diagnosticEvents || []).length === 0 && (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No diagnostic events to display
                </div>
              )}
            </div>
          </ScrollArea>
          <Button variant="outline" size="sm" onClick={() => {
            try {
              clearDiagnosticEvents();
              setDiagnosticEvents([]);
              toast({
                title: "Events Cleared",
                description: "Diagnostic events have been cleared."
              });
            } catch (error) {
              console.error("Error al limpiar eventos de diagnóstico:", error);
              toast({
                title: "Error",
                description: "Failed to clear diagnostic events",
                variant: "destructive"
              });
            }
          }}>
            Clear Events
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FingerDetectionMonitor;
