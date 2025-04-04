
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
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
        const newState = getFingerDetectionState();
        setDetectionState(newState || DEFAULT_DETECTION_STATE);
        
        const stats = getDiagnosticStats();
        setDiagnosticEvents(stats.events || []);
        
        // Safely fetch detection status with defensive checks
        setIsRhythmDetected(isFingerDetectedByRhythm ? isFingerDetectedByRhythm() : false);
        setIsAmplitudeDetected(isFingerDetectedByAmplitude ? isFingerDetectedByAmplitude() : false);
        
        // Get calibration parameters with fallback to defaults
        const params = getCalibrationParameters();
        setCalibrationParams(params || DEFAULT_CALIBRATION_PARAMS);
        
        // Get environmental state with fallback
        const envState = params?.environmentalState || DEFAULT_ENVIRONMENTAL_STATE;
        setEnvironmentalState(envState);
      } catch (err) {
        console.error("Error updating monitor state:", err);
        // If there's an error, use default values
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
    
    // Apply sensitivity using the adaptDetectionThresholds function
    adaptDetectionThresholds(value < 0.5 ? 0.8 : 1.2);
    
    toast.success("Sensitivity Applied", {
      description: `Detection sensitivity set to ${value < 0.5 ? "less" : "more"} sensitive`,
    });
  };
  
  const handleResetSensitivity = () => {
    // Reset sensitivity using the adaptDetectionThresholds function
    adaptDetectionThresholds(1.0);
    
    setSensitivity(0.5);
    toast.success("Sensitivity Reset", {
      description: "Detection sensitivity returned to default",
    });
  };
  
  const handleNoiseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNoise = Number(event.target.value);
    setNoiseLevel(newNoise);
    updateEnvironmentalState({ noise: newNoise });
  };
  
  const handleLightingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLighting = Number(event.target.value);
    setLightingLevel(newLighting);
    updateEnvironmentalState({ lighting: newLighting });
  };
  
  const handleMotionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMotion = Number(event.target.value);
    setMotionLevel(newMotion);
    updateEnvironmentalState({ motion: newMotion });
  };
  
  const handleResetCalibration = () => {
    resetCalibration();
    toast.success("Calibration Reset", {
      description: "Adaptive calibration has been reset to default values.",
    });
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
              <span>Confidence: {(getDetectionConfidence && typeof getDetectionConfidence === 'function') ? getDetectionConfidence().toFixed(2) : "0.00"}</span>
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
            clearDiagnosticEvents();
            setDiagnosticEvents([]);
          }}>
            Clear Events
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FingerDetectionMonitor;
